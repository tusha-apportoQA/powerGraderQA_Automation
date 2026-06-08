/**
 * D2L LMS rubric configurations
 * Contains existing and new rubric constant arrays
 * 
 * D2L rubrics use a different structure:
 * - Fixed levels that apply to ALL criteria
 * - Each criterion has description and max points
 * - Levels are shared across all criteria
 */

import { D2LExistingRubricConfig, D2LNewRubricConfig } from '../../types';

/**
 * Predefined existing rubric configurations for D2L
 * These rubrics should already exist in D2L
 */
export const D2L_EXISTING_RUBRICS: D2LExistingRubricConfig[] = [
    {
        type: 'existing',
        groupName: 'Powergrader',
        rubricName: 'Peer Review'
    },
    {
        type: 'existing',
        groupName: 'Powergrader',
        rubricName: 'Online Discussion Participation'
    },
    {
        type: 'existing',
        groupName: 'Powergrader',
        rubricName: 'Business Plan Creation'
    },
    {
        type: 'existing',
        groupName: 'Powergrader',
        rubricName: 'Public Speaking'
    },
    {
        type: 'existing',
        groupName: 'Powergrader',
        rubricName: 'Amit test'
    }
    // Add more existing rubrics as needed
];

/**
 * Predefined new rubric configurations for D2L
 * These rubrics will be created during test execution
 * 
 * Structure:
 * - title: Rubric title
 * - levels: Array of {name, points} - Fixed levels that apply to all criteria
 * - criterion: Array of {levelItems[]} - Each criterion has an array of level items
 *   - levelItems: Array of {description, initialFeedback} - One item per level
 *   - levelItems array length must equal levels.length (one item per level)
 * - overallLevels: Array of {levelName, score} - Overall rubric scoring levels
 */
export const D2L_NEW_RUBRICS: D2LNewRubricConfig[] = [
    {
        type: 'new',
        title: 'Essay Grading Rubric',
        levels: [
            { name: 'Excellent', points: 4 },
            { name: 'Good', points: 3 },
            { name: 'Fair', points: 2 },
            { name: 'Poor', points: 1 },
            { name: 'Unsatisfactory', points: 0 }
        ],
        criterion: [
            {
                name: 'Content Quality',
                levelItems: [
                    {
                        description: 'Comprehensive and accurate content with excellent depth and insight',
                        initialFeedback: 'Outstanding work that demonstrates thorough understanding and exceptional analysis'
                    },
                    {
                        description: 'Mostly accurate content with good depth, minor gaps present',
                        initialFeedback: 'Good work with solid understanding, though some areas could be expanded'
                    },
                    {
                        description: 'Some inaccuracies present, basic depth achieved',
                        initialFeedback: 'Adequate work but needs improvement in accuracy and depth'
                    },
                    {
                        description: 'Significant inaccuracies, limited depth',
                        initialFeedback: 'Work shows limited understanding and contains notable errors'
                    },
                    {
                        description: 'Fails to meet basic content requirements',
                        initialFeedback: 'Work does not meet minimum standards and requires significant revision'
                    }
                ]
            },
            {
                name: 'Writing Mechanics',
                levelItems: [
                    {
                        description: 'Perfect grammar, spelling, and writing style throughout',
                        initialFeedback: 'Excellent writing mechanics with no errors'
                    },
                    {
                        description: 'Good grammar and style with minor errors',
                        initialFeedback: 'Generally well-written with only minor issues'
                    },
                    {
                        description: 'Some grammar and style issues that need attention',
                        initialFeedback: 'Writing needs improvement in grammar and style'
                    },
                    {
                        description: 'Multiple grammar and style errors present',
                        initialFeedback: 'Significant grammar and style issues impact readability'
                    },
                    {
                        description: 'Poor grammar and style significantly impact readability',
                        initialFeedback: 'Writing mechanics need major improvement'
                    }
                ]
            },
            {
                name: 'Organization',
                levelItems: [
                    {
                        description: 'Excellent structure and flow, well-organized throughout',
                        initialFeedback: 'Outstanding organization that enhances understanding'
                    },
                    {
                        description: 'Good organization with clear structure',
                        initialFeedback: 'Well-organized with logical flow'
                    },
                    {
                        description: 'Adequate organization but could be improved',
                        initialFeedback: 'Organization is acceptable but could be more effective'
                    },
                    {
                        description: 'Poor organization, structure needs work',
                        initialFeedback: 'Organization needs significant improvement'
                    },
                    {
                        description: 'Lacks clear organization and structure',
                        initialFeedback: 'Organization is unclear and hinders understanding'
                    }
                ]
            },
            {
                name: 'Research and Citations',
                levelItems: [
                    {
                        description: 'Extensive, relevant research with proper citations throughout',
                        initialFeedback: 'Excellent research and citation practices demonstrate thorough investigation'
                    },
                    {
                        description: 'Good research with mostly proper citations, minor issues',
                        initialFeedback: 'Solid research with generally correct citation format'
                    },
                    {
                        description: 'Adequate research but citations need improvement',
                        initialFeedback: 'Research is sufficient but citation format needs work'
                    },
                    {
                        description: 'Limited research and citation errors present',
                        initialFeedback: 'Research and citations need significant improvement'
                    },
                    {
                        description: 'Insufficient research and major citation problems',
                        initialFeedback: 'Research and citations are inadequate and require major revision'
                    }
                ]
            }
        ],
        overallLevels: [
            { levelName: 'Exemplary', score: 20 },
            { levelName: 'Proficient', score: 15 },
            { levelName: 'Developing', score: 10 },
            { levelName: 'Beginning', score: 5 },
            { levelName: 'Unsatisfactory', score: 0 }
        ]
    },
    {
        type: 'new',
        title: 'Technology Impact Assessment Rubric',
        levels: [
            { name: 'Excellent', points: 5 },
            { name: 'Good', points: 4 },
            { name: 'Satisfactory', points: 3 },
            { name: 'Needs Improvement', points: 2 },
            { name: 'Poor', points: 1 },
            { name: 'Unsatisfactory', points: 0 }
        ],
        criterion: [
            {
                name: 'Analysis Depth',
                levelItems: [
                    {
                        description: 'Deep, comprehensive analysis with multiple perspectives and thorough evaluation',
                        initialFeedback: 'Exceptional analytical depth that demonstrates sophisticated understanding'
                    },
                    {
                        description: 'Solid analysis covering main points with good depth',
                        initialFeedback: 'Good analysis that covers key points effectively'
                    },
                    {
                        description: 'Basic analysis with limited depth, covers essential points',
                        initialFeedback: 'Adequate analysis but could be more thorough'
                    },
                    {
                        description: 'Superficial analysis, lacks depth and detail',
                        initialFeedback: 'Analysis needs more depth and detail'
                    },
                    {
                        description: 'Minimal analysis, significant gaps in understanding',
                        initialFeedback: 'Analysis is insufficient and shows limited understanding'
                    },
                    {
                        description: 'No meaningful analysis provided',
                        initialFeedback: 'Analysis is missing or completely inadequate'
                    }
                ]
            },
            {
                name: 'Personal Examples',
                levelItems: [
                    {
                        description: 'Relevant, detailed personal examples that enhance the analysis',
                        initialFeedback: 'Excellent use of personal examples that strengthen the argument'
                    },
                    {
                        description: 'Some relevant personal examples provided with good detail',
                        initialFeedback: 'Good personal examples that support the analysis'
                    },
                    {
                        description: 'Limited personal examples, could be more detailed',
                        initialFeedback: 'Personal examples are present but need more development'
                    },
                    {
                        description: 'Few or vague personal examples, limited relevance',
                        initialFeedback: 'Personal examples are insufficient or not well-integrated'
                    },
                    {
                        description: 'Personal examples are irrelevant or poorly explained',
                        initialFeedback: 'Personal examples do not effectively support the analysis'
                    },
                    {
                        description: 'No personal examples provided',
                        initialFeedback: 'Personal examples are missing'
                    }
                ]
            },
            {
                name: 'Writing Quality',
                levelItems: [
                    {
                        description: 'Clear, well-structured writing with excellent grammar and style',
                        initialFeedback: 'Outstanding writing quality that enhances communication'
                    },
                    {
                        description: 'Generally clear writing with minor issues',
                        initialFeedback: 'Good writing with only minor areas for improvement'
                    },
                    {
                        description: 'Some clarity issues, basic structure present',
                        initialFeedback: 'Writing is adequate but needs improvement in clarity'
                    },
                    {
                        description: 'Unclear writing, structure needs improvement',
                        initialFeedback: 'Writing clarity and structure need significant work'
                    },
                    {
                        description: 'Poor writing quality significantly impacts understanding',
                        initialFeedback: 'Writing quality hinders effective communication'
                    },
                    {
                        description: 'Writing quality is unacceptable',
                        initialFeedback: 'Writing quality is below acceptable standards'
                    }
                ]
            },
            {
                name: 'Critical Thinking',
                levelItems: [
                    {
                        description: 'Exceptional critical analysis and evaluation, demonstrates deep thinking',
                        initialFeedback: 'Outstanding critical thinking that shows sophisticated reasoning'
                    },
                    {
                        description: 'Good critical thinking with solid analysis',
                        initialFeedback: 'Solid critical thinking demonstrated throughout'
                    },
                    {
                        description: 'Basic critical thinking demonstrated',
                        initialFeedback: 'Some critical thinking present but could be stronger'
                    },
                    {
                        description: 'Limited critical thinking, analysis is superficial',
                        initialFeedback: 'Critical thinking needs more depth and rigor'
                    },
                    {
                        description: 'Poor critical thinking, lacks analytical depth',
                        initialFeedback: 'Critical thinking is insufficient and lacks depth'
                    },
                    {
                        description: 'No evidence of critical thinking',
                        initialFeedback: 'Critical thinking is absent or not demonstrated'
                    }
                ]
            }
        ],
        overallLevels: [
            { levelName: 'Outstanding', score: 40 },
            { levelName: 'Proficient', score: 30 },
            { levelName: 'Satisfactory', score: 20 },
            { levelName: 'Developing', score: 10 },
            { levelName: 'Beginning', score: 5 },
            { levelName: 'Unsatisfactory', score: 0 }
        ]
    },
    {
        type: 'new',
        title: 'Project Presentation Rubric',
        levels: [
            { name: 'Outstanding', points: 4 },
            { name: 'Proficient', points: 3 },
            { name: 'Developing', points: 2 },
            { name: 'Beginning', points: 1 },
            { name: 'Not Evident', points: 0 }
        ],
        criterion: [
            {
                name: 'Content Accuracy',
                levelItems: [
                    {
                        description: 'Highly accurate and complete information, well-researched',
                        initialFeedback: 'Outstanding accuracy and thoroughness in content'
                    },
                    {
                        description: 'Accurate information with minor gaps',
                        initialFeedback: 'Good accuracy with only minor areas needing more detail'
                    },
                    {
                        description: 'Mostly accurate but some inaccuracies present',
                        initialFeedback: 'Content is generally accurate but needs verification in some areas'
                    },
                    {
                        description: 'Several inaccuracies, information needs verification',
                        initialFeedback: 'Content accuracy needs significant improvement'
                    },
                    {
                        description: 'Significant inaccuracies, content is unreliable',
                        initialFeedback: 'Content is unreliable and requires major revision'
                    }
                ]
            },
            {
                name: 'Presentation Skills',
                levelItems: [
                    {
                        description: 'Excellent clarity, engagement, and delivery throughout',
                        initialFeedback: 'Outstanding presentation skills that captivate the audience'
                    },
                    {
                        description: 'Good presentation skills with clear delivery',
                        initialFeedback: 'Effective presentation with clear communication'
                    },
                    {
                        description: 'Adequate presentation, some areas need improvement',
                        initialFeedback: 'Presentation is acceptable but could be more engaging'
                    },
                    {
                        description: 'Presentation skills need significant improvement',
                        initialFeedback: 'Presentation skills need substantial development'
                    },
                    {
                        description: 'Poor presentation skills, difficult to follow',
                        initialFeedback: 'Presentation skills are below acceptable standards'
                    }
                ]
            },
            {
                name: 'Visual Aids',
                levelItems: [
                    {
                        description: 'High-quality, effective visual materials that enhance understanding',
                        initialFeedback: 'Excellent visual aids that significantly enhance the presentation'
                    },
                    {
                        description: 'Good visual aids that support the presentation',
                        initialFeedback: 'Effective visual aids that support key points'
                    },
                    {
                        description: 'Adequate visual aids, could be more effective',
                        initialFeedback: 'Visual aids are present but could be more impactful'
                    },
                    {
                        description: 'Visual aids are limited or not well-integrated',
                        initialFeedback: 'Visual aids need improvement in quality or integration'
                    },
                    {
                        description: 'Visual aids are poor quality or missing',
                        initialFeedback: 'Visual aids are inadequate or absent'
                    }
                ]
            },
            {
                name: 'Time Management',
                levelItems: [
                    {
                        description: 'Excellent use of allocated time, well-paced throughout',
                        initialFeedback: 'Outstanding time management with perfect pacing'
                    },
                    {
                        description: 'Good time management, appropriate pacing',
                        initialFeedback: 'Effective time management with good pacing'
                    },
                    {
                        description: 'Adequate time management with minor issues',
                        initialFeedback: 'Time management is acceptable but could be improved'
                    },
                    {
                        description: 'Time management needs improvement, pacing issues',
                        initialFeedback: 'Time management needs significant improvement'
                    },
                    {
                        description: 'Poor time management, significantly over or under time',
                        initialFeedback: 'Time management is inadequate and needs major work'
                    }
                ]
            }
        ],
        overallLevels: [
            { levelName: 'Exemplary', score: 50 },
            { levelName: 'Proficient', score: 40 },
            { levelName: 'Satisfactory', score: 30 },
            { levelName: 'Developing', score: 20 },
            { levelName: 'Beginning', score: 10 },
            { levelName: 'Not Evident', score: 0 }
        ]
    },
    {
        type: 'new',
        title: 'Short Response Evaluation Rubric',
        levels: [
            { name: 'Excellent', points: 5 },
            { name: 'Good', points: 4 },
            { name: 'Satisfactory', points: 3 },
            { name: 'Needs Improvement', points: 2 },
            { name: 'Inadequate', points: 1 },
            { name: 'Unsatisfactory', points: 0 }
        ],
        criterion: [
            {
                name: 'Completeness',
                levelItems: [
                    {
                        description: 'Fully addresses all aspects of the prompt with comprehensive detail',
                        initialFeedback: 'Excellent completeness - all requirements met thoroughly'
                    },
                    {
                        description: 'Addresses most aspects of the prompt with good detail',
                        initialFeedback: 'Good completeness - most requirements addressed well'
                    },
                    {
                        description: 'Addresses basic requirements but lacks some detail',
                        initialFeedback: 'Satisfactory completeness - basic requirements met'
                    },
                    {
                        description: 'Addresses some requirements but missing key elements',
                        initialFeedback: 'Needs improvement in completeness - some requirements missing'
                    },
                    {
                        description: 'Addresses few requirements, significant gaps present',
                        initialFeedback: 'Inadequate completeness - many requirements not addressed'
                    },
                    {
                        description: 'Fails to address the prompt requirements',
                        initialFeedback: 'Unsatisfactory - prompt requirements not met'
                    }
                ]
            },
            {
                name: 'Clarity and Conciseness',
                levelItems: [
                    {
                        description: 'Extremely clear and concise, communicates ideas effectively',
                        initialFeedback: 'Outstanding clarity and conciseness'
                    },
                    {
                        description: 'Clear and generally concise, minor areas could be tighter',
                        initialFeedback: 'Good clarity and conciseness with minor improvements possible'
                    },
                    {
                        description: 'Generally clear but could be more concise in places',
                        initialFeedback: 'Adequate clarity, could benefit from more conciseness'
                    },
                    {
                        description: 'Some clarity issues, needs more conciseness',
                        initialFeedback: 'Clarity and conciseness need improvement'
                    },
                    {
                        description: 'Unclear in several areas, lacks conciseness',
                        initialFeedback: 'Significant issues with clarity and conciseness'
                    },
                    {
                        description: 'Very unclear and wordy, difficult to understand',
                        initialFeedback: 'Clarity and conciseness are inadequate'
                    }
                ]
            },
            {
                name: 'Relevance',
                levelItems: [
                    {
                        description: 'Highly relevant, directly addresses the prompt with precision',
                        initialFeedback: 'Excellent relevance to the prompt'
                    },
                    {
                        description: 'Relevant and mostly on-topic, minor tangents',
                        initialFeedback: 'Good relevance with minor off-topic elements'
                    },
                    {
                        description: 'Generally relevant but some off-topic content',
                        initialFeedback: 'Satisfactory relevance, some content could be more focused'
                    },
                    {
                        description: 'Some relevance but significant off-topic content',
                        initialFeedback: 'Relevance needs improvement - too much off-topic content'
                    },
                    {
                        description: 'Limited relevance, mostly off-topic',
                        initialFeedback: 'Inadequate relevance - response is mostly off-topic'
                    },
                    {
                        description: 'Not relevant to the prompt',
                        initialFeedback: 'Response is not relevant to the prompt'
                    }
                ]
            }
        ],
        overallLevels: [
            { levelName: 'Outstanding', score: 15 },
            { levelName: 'Proficient', score: 12 },
            { levelName: 'Satisfactory', score: 9 },
            { levelName: 'Developing', score: 6 },
            { levelName: 'Beginning', score: 3 },
            { levelName: 'Unsatisfactory', score: 0 }
        ]
    },
    {
        type: 'new',
        title: 'Sales Data Rubric',
        levels: [
            { name: 'Excellent', points: 4 },
            { name: 'Good', points: 3 },
            { name: 'Fair', points: 2 },
            { name: 'Poor', points: 0 }
        ],
        criterion: [
            {
                name: 'Data Completeness',
                levelItems: [
                    {
                        description: 'All required data is complete and accurate',
                        initialFeedback: 'Dataset contains all required rows, columns, and values'
                    },
                    {
                        description: 'Minor missing values or formatting issues',
                        initialFeedback: 'Mostly complete with minor gaps'
                    },
                    {
                        description: 'Several missing values or incomplete rows',
                        initialFeedback: 'Several incomplete rows or missing values'
                    },
                    {
                        description: 'Large portions of data missing or unusable',
                        initialFeedback: 'Dataset is largely incomplete or unusable'
                    }
                ]
            },
            {
                name: 'Data Accuracy',
                levelItems: [
                    {
                        description: 'All calculations and totals are correct',
                        initialFeedback: 'Sales calculations and totals are logically correct'
                    },
                    {
                        description: 'Minor calculation mistakes present',
                        initialFeedback: 'Minor calculation inconsistencies found'
                    },
                    {
                        description: 'Multiple calculation inconsistencies',
                        initialFeedback: 'Multiple calculation errors detected'
                    },
                    {
                        description: 'Data contains major logical or mathematical errors',
                        initialFeedback: 'Data accuracy is poor'
                    }
                ]
            },
            {
                name: 'Organization and Formatting',
                levelItems: [
                    {
                        description: 'Well-structured and easy to read',
                        initialFeedback: 'CSV is structured clearly with proper headers and formatting'
                    },
                    {
                        description: 'Mostly organized with minor issues',
                        initialFeedback: 'Generally organized with minor formatting issues'
                    },
                    {
                        description: 'Formatting inconsistencies reduce readability',
                        initialFeedback: 'Formatting needs improvement'
                    },
                    {
                        description: 'Poorly formatted or difficult to interpret',
                        initialFeedback: 'Organization and formatting are poor'
                    }
                ]
            }
        ],
        overallLevels: [
            { levelName: 'Exemplary', score: 30 },
            { levelName: 'Proficient', score: 22 },
            { levelName: 'Developing', score: 14 },
            { levelName: 'Beginning', score: 7 },
            { levelName: 'Unsatisfactory', score: 0 }
        ]
    },
    {
        type: 'new',
        title: 'Employee Performance Rubric',
        levels: [
            { name: 'Excellent', points: 4 },
            { name: 'Good', points: 3 },
            { name: 'Fair', points: 2 },
            { name: 'Poor', points: 0 }
        ],
        criterion: [
            {
                name: 'Spreadsheet Completeness',
                levelItems: [
                    {
                        description: 'All employee records are complete',
                        initialFeedback: 'Spreadsheet includes all required employee performance data'
                    },
                    {
                        description: 'Minor missing entries exist',
                        initialFeedback: 'Mostly complete with minor missing entries'
                    },
                    {
                        description: 'Several incomplete records present',
                        initialFeedback: 'Several incomplete employee records'
                    },
                    {
                        description: 'Spreadsheet lacks required data',
                        initialFeedback: 'Required performance data is missing'
                    }
                ]
            },
            {
                name: 'Performance Evaluation Accuracy',
                levelItems: [
                    {
                        description: 'All evaluations and calculations are accurate',
                        initialFeedback: 'Scores, averages, and ratings are logically correct'
                    },
                    {
                        description: 'Minor scoring inconsistencies found',
                        initialFeedback: 'Minor scoring inconsistencies present'
                    },
                    {
                        description: 'Multiple scoring errors detected',
                        initialFeedback: 'Multiple scoring errors found'
                    },
                    {
                        description: 'Performance data is inaccurate or inconsistent',
                        initialFeedback: 'Performance evaluation accuracy is poor'
                    }
                ]
            },
            {
                name: 'Professional Structure',
                levelItems: [
                    {
                        description: 'Highly organized and professional layout',
                        initialFeedback: 'Workbook is neatly organized and easy to understand'
                    },
                    {
                        description: 'Generally organized with small issues',
                        initialFeedback: 'Generally organized with minor structural issues'
                    },
                    {
                        description: 'Some structural confusion present',
                        initialFeedback: 'Structure could be clearer'
                    },
                    {
                        description: 'Difficult to read or poorly arranged',
                        initialFeedback: 'Professional structure needs major improvement'
                    }
                ]
            }
        ],
        overallLevels: [
            { levelName: 'Exemplary', score: 30 },
            { levelName: 'Proficient', score: 22 },
            { levelName: 'Developing', score: 14 },
            { levelName: 'Beginning', score: 7 },
            { levelName: 'Unsatisfactory', score: 0 }
        ]
    }
    // Add more new rubric templates as needed
];

