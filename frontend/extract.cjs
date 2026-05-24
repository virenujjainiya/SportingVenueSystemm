const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('EXECUTION.md', 'utf-8');
const regex = /\*\*File: `([^`]+)`\*\*[\s\S]*?```[a-z]*\r?\n([\s\S]*?)```/g;

let match;
let found = false;
while ((match = regex.exec(content)) !== null) {
  found = true;
  const filePath = match[1];
  const fileContent = match[2];
  
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, fileContent);
  console.log('Created:', filePath);
}
if (!found) console.log("No files matched!");
