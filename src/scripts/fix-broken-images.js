const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../data/products.json'),
  path.join(__dirname, '../data/posts.json')
];

let replaced = 0;

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Broken 1 -> Replace with nice working serum (1570172619644)
    content = content.replace(/photo-1542452255-1f5462c4b868/g, 'photo-1570172619644-dfd03ed5d881');
    
    // Broken 2 -> Replace with nice working cream (1620916566398)
    content = content.replace(/photo-1608248597279-f99d160bfbc8/g, 'photo-1620916566398-39f1143ab7be');
    
    // Broken 3 -> Replace with hair mask (1598440947619)
    content = content.replace(/photo-1556228720-1957be9b936d/g, 'photo-1598440947619-2c35fc9aa908');

    fs.writeFileSync(file, content, 'utf8');
    replaced++;
  }
}

console.log(`Fixed broken Unsplash images in ${replaced} files.`);
