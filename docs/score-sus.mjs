// Scores System Usability Scale responses.
//
//   node docs/score-sus.mjs docs/sus-responses.csv
//
// The CSV needs a header row and one row per participant:
//   participant,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10
//   P1,4,2,5,1,4,2,5,2,4,2
//
// Odd statements score (answer - 1), even statements score (5 - answer).
// The ten contributions are summed and multiplied by 2.5.

import fs from 'fs';

const file = process.argv[2];
if (!file) {
    console.error('Usage: node docs/score-sus.mjs <responses.csv>');
    process.exit(1);
}

if (!fs.existsSync(file)) {
    console.error(`No such file: ${file}`);
    console.error('Create it from the template in docs/sus-evaluation.md once you have real responses.');
    process.exit(1);
}

const scoreOne = (answers) => {
    if (answers.length !== 10) throw new Error(`expected 10 answers, got ${answers.length}`);
    let total = 0;
    answers.forEach((raw, i) => {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1 || value > 5) {
            throw new Error(`answer ${i + 1} is "${raw}" — must be a whole number from 1 to 5`);
        }
        total += (i % 2 === 0) ? value - 1 : 5 - value;
    });
    return total * 2.5;
};

const rows = fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(1)                       // drop the header
    .map(line => line.split(',').map(cell => cell.trim()));

if (!rows.length) {
    console.error('No response rows found.');
    process.exit(1);
}

const scores = [];
console.log('\nParticipant   SUS score');
console.log('------------  ---------');

for (const row of rows) {
    const [name, ...answers] = row;
    try {
        const score = scoreOne(answers);
        scores.push(score);
        console.log(`${name.padEnd(12)}  ${score.toFixed(1)}`);
    } catch (error) {
        console.log(`${name.padEnd(12)}  skipped — ${error.message}`);
    }
}

if (!scores.length) {
    console.error('\nNothing could be scored.');
    process.exit(1);
}

const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
// Sample standard deviation (n-1), which is what you report for a sample of participants
const sd = scores.length > 1
    ? Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (scores.length - 1))
    : 0;

const verdict =
    mean < 51 ? 'Poor — serious usability problems' :
    mean < 68 ? 'Marginal — below the established average of 68' :
    mean < 81 ? 'Good — at or above the established average of 68' :
                'Excellent';

console.log('\n------------------------------------------');
console.log(`Participants        ${scores.length}`);
console.log(`Mean SUS            ${mean.toFixed(1)}`);
console.log(`Standard deviation  ${sd.toFixed(1)}`);
console.log(`Lowest / highest    ${Math.min(...scores).toFixed(1)} / ${Math.max(...scores).toFixed(1)}`);
console.log(`Reading             ${verdict}`);
console.log('------------------------------------------\n');
console.log('SUS is a score out of 100 on its own scale, not a percentage. Say so in the report.\n');
