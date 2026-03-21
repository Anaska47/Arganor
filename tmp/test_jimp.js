const { Jimp } = require('jimp');
console.log('Jimp keys:', Object.keys(Jimp));
async function test() {
  try {
    const image = new Jimp({ width: 100, height: 100, color: 0xFF0000FF });
    console.log('Image created successfully');
    console.log('FONT_SANS_64_WHITE:', Jimp.FONT_SANS_64_WHITE);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
