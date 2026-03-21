const { Jimp } = require('jimp');
async function test() {
  const url = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop';
  try {
    const img = await Jimp.read(url);
    console.log('Image read success. Keys:', Object.keys(img).slice(0, 10));
    console.log('Bitmap keys:', Object.keys(img.bitmap));
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
