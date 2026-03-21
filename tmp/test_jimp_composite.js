const { Jimp } = require('jimp');
async function test() {
  try {
    const bg = new Jimp({ width: 100, height: 100, color: 0xFF0000FF });
    const fg = new Jimp({ width: 50, height: 50, color: 0x00FF00FF });
    console.log('Testing composite with 3 args...');
    try {
        bg.composite(fg, 10, 10);
        console.log('Composite 3 args success');
    } catch (e) {
        console.error('Composite 3 args failed:', e.message || e);
    }

    console.log('Testing composite with object...');
    try {
        bg.composite({ src: fg, x: 10, y: 10 });
        console.log('Composite object success');
    } catch (e) {
        console.error('Composite object failed:', e.message || e);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
