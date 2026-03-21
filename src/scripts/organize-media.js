const fs = require('fs');
const path = require('path');

const POSTS_FILE = path.join(__dirname, '../data/posts.json');
const PUBLIC_PINS_DIR = path.join(__dirname, '../../public/pins');
const MEDIA_PINTEREST_DIR = path.join(__dirname, '../../media/pinterest');
const BULK_CSV_FILE = path.join(MEDIA_PINTEREST_DIR, 'pinterest-bulk-upload.csv');

// Configuration du site
const SITE_URL = 'https://arganor.vercel.app'; 
const BOARD_NAME = 'Arganor - Beauté Naturelle';

function escapeCsv(str) {
    if (!str) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
}

async function run() {
    console.log('📦 [Arganor Media] Organisation au format Officiel Pinterest...');

    if (!fs.existsSync(MEDIA_PINTEREST_DIR)) {
        fs.mkdirSync(MEDIA_PINTEREST_DIR, { recursive: true });
    }

    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    const pinsToProcess = posts.filter(p => p.pinterestImage);

    // Headers officiels Pinterest
    const headers = [
        'Media URL',
        'Title',
        'Description',
        'Link',
        'Pinterest board',
        'Publish date',
        'Keywords',
        'Video title',
        'Thumbnail',
        'Section',
        'Image alt text'
    ];

    const rows = [headers.join(',')];

    for (const post of pinsToProcess) {
        const pinFilename = path.basename(post.pinterestImage);
        const sourcePath = path.join(PUBLIC_PINS_DIR, pinFilename);
        const destPath = path.join(MEDIA_PINTEREST_DIR, pinFilename);

        // Copier le fichier dans media/pinterest
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
        }

        // Préparer les données
        const mediaUrl = `${SITE_URL}${post.pinterestImage}`;
        const title = post.title.slice(0, 100);
        const description = (post.metaDescription || post.excerpt).slice(0, 500);
        const link = `${SITE_URL}/blog/${post.slug}`;
        const keywords = post.keywords ? post.keywords.replace(/,/g, ' ') : '';
        const altText = post.title.slice(0, 500);

        const row = [
            escapeCsv(mediaUrl),
            escapeCsv(title),
            escapeCsv(description),
            escapeCsv(link),
            escapeCsv(BOARD_NAME),
            escapeCsv(post.publishedDate),
            escapeCsv(keywords),
            '""', // Video title (vide mais présent)
            '""', // Thumbnail (vide)
            '""', // Section (vide)
            escapeCsv(altText)
        ];

        rows.push(row.join(','));
    }

    fs.writeFileSync(BULK_CSV_FILE, rows.join('\n'));
    console.log(`📊 Nouveau fichier généré avec l'URL Vercel : ${BULK_CSV_FILE}`);
    console.log(`✅ Destination : ${SITE_URL}`);
}

run().catch(console.error);
