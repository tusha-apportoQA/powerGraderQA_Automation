/**
 * Canvas LMS assignment configurations
 * Combined configs for both orchestration and component tests
 */

import { CanvasAssignmentConfig } from '../../types';
import { CANVAS_EXISTING_RUBRICS } from '../rubrics/canvas';
import { getCanvasConfig } from '../../config/canvas.config';

/*function formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    // Canvas expects DD/MM/YYYY format (interprets MM/DD/YYYY as DD/MM/YYYY)
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}*/

/*function formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    // Use DD/MM/YYYY — Canvas instance is configured with DD/MM locale
   // return `${day}/${month}/${year} ${hours}:${minutes}`;
   return `${day}/${month}/${year} ${hours}:${minutes}`;

}*/
function formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'AM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${day}/${month}/${year} ${hours12}:${minutes} ${ampm}`;
}

function getAssignmentDates() {
    const now = new Date();
    
    // Available from: Current date at 12:00 AM (midnight)
    //const availableFrom = new Date(now);
    const availableFrom = new Date(now.getFullYear(), 0, 1); // Jan 1 this year — unambiguous in any locale
    //availableFrom.setDate(availableFrom.getDate() - 1);
    //availableFrom.setHours(0, 0, 0, 0);
   // availableFrom.setDate(availableFrom.getDate() - 14); // 2 weeks ago — unambiguous in any locale
    availableFrom.setHours(0, 0, 0, 0);

    // Due date: Jan 1 next year — unambiguous in any locale
    const dueDate = new Date(now.getFullYear() + 1, 0, 1);
    dueDate.setHours(8, 0, 0, 0);

    // Available until: Jan 1 next year — unambiguous in any locale
    const until = new Date(now.getFullYear() + 1, 0, 1);
    until.setHours(10, 0, 0, 0);


    const result = {
        availableFrom: formatDate(availableFrom),
        dueDate: formatDate(dueDate),
        until: formatDate(until)
    };
    console.log('[Canvas Dates] Generated:', result);

    return result;

}

/**
 * Get Canvas assignment configurations
 * Combined array used for both orchestration and component tests
 */
export function getCanvasAssignmentConfigs(): CanvasAssignmentConfig[] {
    const dates = getAssignmentDates();
    const { defaultPoints } = getCanvasConfig();
    
    const elcDescription = `30-Minute Essay Prompt
Identify one improvement that would make your city a better place to live for people your age and explain why people your age would benefit from this change. Use specific reasons and examples to support your opinion and describe the potential immediate and long-term consequences of this improvement. You have 30 minutes to write your response.`;

    return [
        {
            title: 'Canvas ELC Poor docx',
            description: elcDescription,
            points: defaultPoints,
            submissionType: '.docx',
            submissionFile: 'files/auto_submission_elc_poor.docx',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[3],
            teacherEdits: [
                {
                    criterionIndex: 2,
                    score: 1,
                    feedback:
                        'Your writing has many serious grammar, spelling, and sentence structure mistakes that make it very difficult to follow; to strengthen this area, focus on forming clear, complete sentences with correct spelling and basic grammatical accuracy.',
                },
            ],
            workflow: { verifyLms: true, iterativeRepublish: true, igWorkflow: true, onTimeVisibility: true, lmsVerifySave: true },
        },
        {
            title: 'Canvas ELC Average pdf',
            description: elcDescription,
            points: defaultPoints,
            submissionType: '.pdf',
            submissionFile: 'files/auto_submission_elc_average.pdf',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[3],
            teacherEdits: [
                {
                    criterionIndex: 1,
                    score: 3,
                    feedback:
                        'You provide details about what makes Santiago appealing for young people, but to raise your score, clearly recommend a specific improvement for the city and explain both its immediate and long-term consequences.',
                },
            ],
            workflow: { verifyLms: true, iterativeRepublish: true, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        {
            title: 'Canvas ELC Above Average txt',
            description: elcDescription,
            points: defaultPoints,
            submissionType: '.txt',
            submissionFile: 'files/auto_submission_elc_above_average.txt',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[3],
            teacherEdits: [
                {
                    criterionIndex: 2,
                    score: 1,
                    feedback:
                        'Your writing has many serious grammar, spelling, and sentence structure mistakes that make it very difficult to follow; to strengthen this area, focus on forming clear, complete sentences with correct spelling and basic grammatical accuracy.',
                },
            ],
            workflow: { verifyLms: true, iterativeRepublish: true, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        {
            title: 'Canvas ELC Excellent Text Entry',
            description: elcDescription,
            points: defaultPoints,
            submissionType: 'Text Entry',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[3],
            teacherEdits: [
                {
                    criterionIndex: 2,
                    score: 1,
                    feedback:
                        'Your writing has many serious grammar, spelling, and sentence structure mistakes that make it very difficult to follow; to strengthen this area, focus on forming clear, complete sentences with correct spelling and basic grammatical accuracy.',
                },
            ],
            workflow: { verifyLms: true, iterativeRepublish: true, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        // Orchestration test configs
        {
            title: 'Canvas Code Easy',
            description: `Remove Duplicates from Array

*Requirements*:
Write a function to remove duplicates from an array, called remove_duplicates, which accepts one parameter. (The input to the function will be an array called nums. You can assume nums will be sorted in increasing order, and only contain numbers.)

It should look like this:
def remove_duplicates(nums)
    # write your code here

remove_duplicates needs to accomplish these tasks:
- Remove duplicate numbers in nums, such that each unique element appears only once. The relative order of the elements should be kept the same.
- Then return the number of unique elements in nums.


For example, take nums to be [1,1,2,3,3,3,4,5,10]. The number of unique elements that nums has is 6. To get accepted, you need to have remove_duplicates do the following things:
- Change the array nums such that it now has 6 elements. These elements need to be the unique elements of nums, in the order they were present initially. This means nums will now be [1,2,3,4,5,10]
- Return the number of elements, which in this case is 6


*Constraints*:
 - Implement your solution using Python3 and no outside packages. Only the standard library may be used.
 - Bonus points: Write a second function called remove_duplicates_2(nums_2). This function has all the same requirements, but additional constraints. For this function do not use any standard library functions, list methods, or the del operator. Just manipulate nums_2 element by element. This is similar to how you would need to complete this project in c instead of python. (For this bonus function you do not need to make sure that nums_2 only has the number of cells equal to the number of unique elements. After being changed nums_2 just needs the first k elements to contain the unique elements in the order they were present in initially. The remaining elements are not important)



*Unit test*:
Alongside reviewing the quality of your code, your program will be graded based on if it passes this unit test

You can copy the unit test and run it yourself to see how your code performs. (You will need to manually create nums and expectedNums)

\`\`\`
nums = [] # Create a test array here: ex [1,1,2,3]
expectedNums = [] # Create an array with the correct result based on what you created for nums. ex [1,2,3]

int k = removeDuplicates(nums); // Calls your implementation

assert k == expectedNums.length;
assert nums == expectedNums;\`\`\``,
            points: defaultPoints,
            submissionType: '.py',
            submissionFile: 'files/auto_submission_code_easy.py',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[0],
            workflow: { verifyLms: true, iterativeRepublish: false, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        {
            title: 'Canvas Code Medium',
            description: `Question 03

Given a list of integers, write a function that returns the largest sum of non-adjacent numbers. Numbers can be 0 or negative.

For example, [2, 4, 6, 2, 5] should return 13, since we pick 2, 6, and 5. [5, 1, 1, 5] should return 10, since we pick 5 and 5.

Follow-up: Can you do this in O(N) time and constant space?

For your submission, create a python function which accepts a single list of integers and/or floats.`,
            points: defaultPoints,
            submissionType: '.py',
            submissionFile: 'files/auto_submission_code_medium.py',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[1],
            workflow: { verifyLms: false, iterativeRepublish: false, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        {
            title: 'Canvas Code Hard',
            description: `Given a string 'n' representing a hexidecimal number, return the closest hexidecimal number (not including itself), which is a palindrome. If there is a tie, return the smaller one.

The closest is defined as the absolute difference minimized between two hexadecimal numbers.

A palindrome is a word, number, phrase, or other sequence of symbols that reads the same backwards as forwards, such as madam or racecar.

Example 1:

    Input: n = "1AF"
    Output: "1A1"

Example 3:

    Input: n = "EFEE"
    Output: "EFFE"


Example 2:
    
    Input: n = "1"
    Output: "0"
    Explanation: 0 and 2 are the closest palindromes but we return the smallest which is 0.

Constraints:
1 <= n.length <= 18
n consists of only hexadecimal digits.
n does not have leading zeros or 0x.`,
            points: defaultPoints,
            submissionType: '.py',
            submissionFile: 'files/auto_submission_code_hard.py',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[2],
            workflow: { verifyLms: false, iterativeRepublish: false, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        {
            title: 'Canvas CSV submission',
            description: 'Upload a CSV file containing monthly sales data with columns for Product Name, Units Sold, Unit Price, and Total Revenue. The file should contain at least 5 product entries with logically correct calculations and properly formatted rows and headers. Ensure the dataset is complete, readable, and internally consistent so it can be evaluated for accuracy, completeness, and formatting quality.',
            points: defaultPoints,
            submissionType: '.csv',
            submissionFile: 'files/test_submission.csv',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: CANVAS_EXISTING_RUBRICS[4],
            workflow: { verifyLms: true, iterativeRepublish: false, igWorkflow: false, onTimeVisibility: true, lmsVerifySave: false },
        },
        {
            title: 'Canvas XLSX No Rubric submission',
            description: 'Upload an Excel spreadsheet containing employee performance information with columns for Employee Name, Department, Performance Score, and Final Rating. The spreadsheet should include at least 5 employee records with logically correct scores and matching ratings. Organize the workbook clearly and ensure all information is complete, readable, and professionally structured for evaluation.',
            points: defaultPoints,
            submissionType: '.xlsx',
            submissionFile: 'files/test_submission.xlsx',
            assignAccess: {
                assignTo: 'Everyone',
                availableFrom: dates.availableFrom,
                dueDate: dates.dueDate,
                until: dates.until
            },
            rubric: { type: 'no' },
            workflow: { verifyLms: false, iterativeRepublish: false, igWorkflow: false, onTimeVisibility: false, lmsVerifySave: false },
        }
    ];
}
