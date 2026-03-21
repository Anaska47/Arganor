const { Jimp } = require('jimp');
async function test() {
  const url = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop';
  try {
    const img = await Jimp.read(url);
    console.log('Testing cover with 2 args...');
    try {
        img.cover(100, 100);
        console.log('Cover 2 args success');
    } catch (e) {
        console.error('Cover 2 args failed:', e.message || e);
    }

    console.log('Testing cover with object...');
    try {
        img.cover({ width: 100, height: 100 });
        console.log('Cover object success');
    } catch (e) {
        console.error('Cover object failed:', e.message || e);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
