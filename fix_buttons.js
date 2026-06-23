const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// Update btn-outline
css = css.replace(/\.btn-outline \{[\s\S]*?\}/, `.btn-outline {
  background-color: #2d3748;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}`);

css = css.replace(/\.btn-outline:hover \{[\s\S]*?\}/, `.btn-outline:hover {
  background-color: #3f4a60;
}`);

fs.writeFileSync('app/globals.css', css);
console.log('Fixed buttons');
