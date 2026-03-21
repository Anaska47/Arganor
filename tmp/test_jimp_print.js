const { Jimp, loadFont, HorizontalAlign, VerticalAlign } = require('jimp');
const { SANS_32_WHITE } = require('jimp/fonts');
async function test() {
  try {
    const img = new Jimp({ width: 500, height: 500, color: 0x000000FF });
    const font = await loadFont(SANS_32_WHITE);
    console.log('Testing print with object...');
    try {
        img.print({
            font,
            x: 0,
            y: 0,
            text: 'Hello World',
            maxWidth: 500
        });
        console.log('Print with maxWidth success');
    } catch (e) {
        console.error('Print with maxWidth failed:', e.message || e);
    }

    try {
        img.print({
            font,
            x: 0,
            y: 50,
            text: {
                text: 'Hello Center',
                alignmentX: HorizontalAlign.CENTER
            },
            maxWidth: 500
        });
        console.log('Print with align success');
    } catch (e) {
        console.error('Print with align failed:', e.message || e);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
