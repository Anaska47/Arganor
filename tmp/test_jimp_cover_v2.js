const { Jimp } = require('jimp');
async function test() {
  const url = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop';
  try {
    const img = await Jimp.read(url);
    console.log('Testing cover with {w, h}...');
    try {
        img.cover({ w: 100, h: 100 });
        console.log('Cover {w, h} success');
    } catch (e) {
        console.error('Cover {w, h} failed:', e.message || e);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
