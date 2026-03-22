const fs = require('fs');
const path = require('path');

const POSTS_FILE = path.join(__dirname, '../data/posts.json');
const PUBLIC_PINS_DIR = path.join(__dirname, '../../public/pins');

function slugify(text) {
    return text.normalize("NFD")
               .replace(/[\u0300-\u036f]/g, "")
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, '-')
               .replace(/(^-|-$)/g, '');
}

async function run() {
    let posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    let count = 0;

    for (let post of posts) {
        if (post.isAutopilot) {
            const oldSlug = post.slug;
            const newSlug = slugify(post.title);
            
            if (oldSlug !== newSlug) {
                console.log(`♻️  Updating slug: ${oldSlug} -> ${newSlug}`);
                post.slug = newSlug;
                
                // Update pinterestImage filename
                if (post.pinterestImage) {
                    const oldPin = path.basename(post.pinterestImage);
                    const newPin = newSlug + '.jpg';
                    const oldPath = path.join(PUBLIC_PINS_DIR, oldPin);
                    const newPath = path.join(PUBLIC_PINS_DIR, newPin);
                    
                    if (fs.existsSync(oldPath)) {
                        fs.renameSync(oldPath, newPath);
                        console.log(`🖼️  Renamed image: ${oldPin} -> ${newPin}`);
                    }
                    post.pinterestImage = `/pins/${newPin}`;
                }
                count++;
            }
        }
    }

    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    console.log(`✅ ${count} articles updated with clean URLs.`);
}

run().catch(console.error);
