import { pipeline } from '@xenova/transformers';

export type RubricSnapshot = {
  totalScore?: number; // optional if you only want text compare
  overallFeedback?: string;
  criteria?: Array<{
    name: string;
    score?: number;
    feedback?: string;
  }>;
};

export type CompareResult = {
  overallFeedback?: {
    similarity: number; // 0..1
    confidencePct: number; // (1-sim)*100
  };
  criteria: Array<{
    name: string;
    scoreDelta?: number;
    feedbackSimilarity?: number;
    feedbackConfidencePct?: number;
  }>;
  summary: {
    maxConfidencePct: number;
    worstField: string;
  };
};

export type CriterionNameSimilarity = {
  firstName: string;
  secondName: string;
  similarity: number;
};

export type CriterionNameUniquenessResult = {
  isUnique: boolean;
  threshold: number;
  comparisons: CriterionNameSimilarity[];
  duplicates: CriterionNameSimilarity[];
};

let extractorPromise: ReturnType<typeof pipeline> | null = null;

/*async function getExtractor() {
  if (!extractorPromise) {
    // SBERT-like embeddings (fast + reliable). This is not "sbert.net" but same idea: sentence embeddings.
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}*/
async function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as any;
  }
  return extractorPromise as any;
}

export function normCriterionName(name?: string): string {
  const s = (name ?? "").toLowerCase().trim();

  const map: Record<string, string> = {
    "organization and structure": "organization",
    "clarity and organization": "organization",
    "structure and organization": "organization",

    "conciseness and focus": "conciseness",
    "conciseness and succinctness": "conciseness",

    "accuracy of content": "accuracy",
    "content accuracy and precision": "accuracy",

    "grammar, syntax, and mechanics": "grammar",
    "grammar and style": "grammar",
    "grammar, spelling, and mechanics": "grammar",

    "precision and clarity of expression": "clarity",
    "precision and clarity of language": "clarity",
    "clarity of expression": "clarity",

    "critical thinking and insight": "analysis",
    "depth of analysis": "analysis",
  };

  return map[s] ?? s;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/*async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  // returns [1, tokens, dims]; we mean-pool tokens
  const out: any = await extractor(text);
  // Xenova returns a typed array sometimes; convert safely
  const data = out?.data ?? out;
  return Array.from(data as Iterable<number>);
}*/
  async function embed(text: string): Promise<number[]> {
    const extractor = await getExtractor();
    
    // We MUST specify pooling and normalization for sentence similarity
    const out = await extractor(text, { 
      pooling: 'mean', 
      normalize: true 
    });

    // Access the raw data from the Tensor
    // If 'out' is a Tensor, it has a .data property (Float32Array)
    const data = out.data; 
    
    return Array.from(data);
  }


async function similarityText(a?: string, b?: string): Promise<number | undefined> {
  const ta = (a ?? '').trim();
  const tb = (b ?? '').trim();
  if (!ta && !tb) return 1;
  if (!ta || !tb) return 0;

  const [ea, eb] = await Promise.all([embed(ta), embed(tb)]);
  return cosineSimilarity(ea, eb);
}

/**
 * Compares every pair of criterion names and reports pairs whose semantic
 * similarity meets or exceeds the duplicate threshold.
 */
export async function compareCriterionNameUniqueness(
  names: string[],
  threshold = 0.8
): Promise<CriterionNameUniquenessResult> {
  if (threshold < 0 || threshold > 1) {
    throw new Error(`Criterion name similarity threshold must be between 0 and 1; received ${threshold}.`);
  }

  const trimmedNames = names.map(name => name.trim());
  if (trimmedNames.some(name => !name)) {
    throw new Error('Generated criterion names must not be empty.');
  }

  const embeddings = await Promise.all(trimmedNames.map(name => embed(name)));
  const comparisons: CriterionNameSimilarity[] = [];

  for (let firstIndex = 0; firstIndex < trimmedNames.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < trimmedNames.length; secondIndex += 1) {
      comparisons.push({
        firstName: trimmedNames[firstIndex],
        secondName: trimmedNames[secondIndex],
        similarity: cosineSimilarity(embeddings[firstIndex], embeddings[secondIndex]),
      });
    }
  }

  const duplicates = comparisons.filter(({ similarity }) => similarity >= threshold);
  return {
    isUnique: duplicates.length === 0,
    threshold,
    comparisons,
    duplicates,
  };
}

export async function compareRubricSnapshots(
  baseline: RubricSnapshot,
  generated: RubricSnapshot
): Promise<CompareResult> {
  const result: CompareResult = {
    criteria: [],
    summary: { maxConfidencePct: 0, worstField: 'none' }
  };

  // Overall feedback similarity
  const overallSim = await similarityText(baseline.overallFeedback, generated.overallFeedback);
  if (overallSim !== undefined) {
    const conf = (1 - overallSim) * 100;
    result.overallFeedback = { similarity: overallSim, confidencePct: conf };
    if (conf > result.summary.maxConfidencePct) {
      result.summary.maxConfidencePct = conf;
      result.summary.worstField = 'overallFeedback';
    }
  }

  const baseCriteria = baseline.criteria ?? [];
  const genCriteria = generated.criteria ?? [];

  // Match criteria by name (case-insensitive)
  //const genByName = new Map(genCriteria.map(c => [c.name.toLowerCase().trim(), c]));
  const genByName = new Map(genCriteria.map(c => [normCriterionName(c.name), c]));

  for (const bc of baseCriteria) {
    //const gc = genByName.get(bc.name.toLowerCase().trim());
    const gc = genByName.get(normCriterionName(bc.name));
    const item: CompareResult['criteria'][number] = { name: bc.name };

    if (typeof bc.score === 'number' && typeof gc?.score === 'number') {
      item.scoreDelta = gc.score - bc.score;
    }

    const sim = await similarityText(bc.feedback, gc?.feedback);
    if (sim !== undefined) {
      item.feedbackSimilarity = sim;
      item.feedbackConfidencePct = (1 - sim) * 100;

      if ((item.feedbackConfidencePct ?? 0) > result.summary.maxConfidencePct) {
        result.summary.maxConfidencePct = item.feedbackConfidencePct ?? 0;
        result.summary.worstField = `criteriaFeedback:${bc.name}`;
      }
    }

    result.criteria.push(item);
  }

  return result;
}