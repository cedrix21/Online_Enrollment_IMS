const fs = require('fs');
const path = require('path');

function imageToBase64(fileName) {
  const filePath = path.join(__dirname, 'src/assets', fileName);
  const bitmap = fs.readFileSync(filePath);
  return `data:image/png;base64,${bitmap.toString('base64')}`;
}

try {
  console.log("--- DEPED LOGO ---");
  console.log(imageToBase64('Picture1.png'));
  console.log("\n--- SICS LOGO ---");
  console.log(imageToBase64('Picture2.png'));
} catch (err) {
  console.error("Error: Ensure Picture1.png and Picture2.png are in src/assets/", err.message);
}