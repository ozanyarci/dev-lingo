const fs = require('fs');
const path = require('path');

// Read source lessons from the JSON file
const sourcePath = path.join(__dirname, 'lessons-source.json');

if (!fs.existsSync(sourcePath)) {
    console.error('Error: lessons-source.json not found!');
    process.exit(1);
}

const lessons = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const jsonString = JSON.stringify(lessons);
const hashed = Buffer.from(jsonString).toString('base64');

const outputPath = path.join(__dirname, 'public', 'assets', 'data', 'lessons.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify({ data: hashed }));

console.log('Successfully hashed and saved lessons data to ' + outputPath);
