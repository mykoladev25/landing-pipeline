#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const config = JSON.parse(fs.readFileSync('contacts.json', 'utf-8'));
const category = process.argv[2] || 'coffee';
const limit = parseInt(process.argv[3]) || 5;

if (!config.categories[category]) {
    console.error(`❌ Category not found: ${category}`);
    console.log(`Available: ${Object.keys(config.categories).join(', ')}`);
    process.exit(1);
}

const categoryData = config.categories[category];
const pitchTemplate = config.pitch_templates[category];

console.log(`\n🔍 BULK PITCH PIPELINE: ${categoryData.label} (${categoryData.emoji})`);
console.log(`📌 Template: "${pitchTemplate.subject}"`);
console.log(`📊 Target: ${limit} prospects\n`);

// Mock data generator (у реальному світі — Google Maps API, B2B DB, тощо)
const generateProspects = (category, count) => {
    const names = {
        coffee: ['Morning Brew', 'Espresso House', 'Bean Machine', 'The Daily Grind', 'Caffeine Co'],
        pizza: ['Slice Heaven', 'Pizzeria Roma', 'Wood Fire', 'Dough & Co', 'Pizza Palace'],
        burger: ['Burger Joint', 'The Burger Lab', 'Grill Master', 'Burger Society', 'Patty House'],
        sushi: ['Sushi Zen', 'Tokyo Roll', 'Sushi Master', 'Golden Dragon', 'Sushi Paradise'],
        laundry: ['Clean Express', 'Wash & Go', 'Laundry Pro', 'Fresh & Clean', 'Spin City'],
        fastfood: ['Quick Bite', 'Fast Fresh', 'Speed Eats', 'Quick Fix', 'Fast Lane'],
        dental: ['Smile Clinic', 'Dental Care', 'Bright Smile', 'Tooth Center', 'Perfect Smile'],
        salon: ['Hair Studio', 'Beauty Salon', 'Style Lounge', 'Cuts & Style', 'Hair Lab'],
        massage: ['Zen Spa', 'Relax Therapy', 'Massage Center', 'Peace Spa', 'Wellness Retreat'],
        gym: ['Fit Pro', 'Strength Gym', 'Fitness Hub', 'Pump Station', 'Elite Training'],
        hotel: ['City Hotel', 'Comfort Inn', 'Premium Stay', 'Luxury Resort', 'Modern Lodge'],
        photography: ['Studio Light', 'Perfect Frame', 'Photo Studio', 'Lens & Light', 'Moment Capture'],
        florist: ['Bloom Shop', 'Flower Paradise', 'Fresh Flowers', 'Petal Studio', 'Bouquet House'],
        bakery: ['Sweet Bakery', 'Fresh Bread', 'Pastry House', 'Artisan Bakery', 'Golden Crust']
    };

    return Array.from({ length: count }, (_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: names[category][i % names[category].length] + ` #${i + 1}`,
        category,
        location: ['London', 'Barcelona', 'Madrid', 'Berlin', 'Amsterdam'][i % 5],
        email: null,
        phone: null,
        status: 'lead',
        notes: `Generated prospect for ${category}`
    }));
};

const prospects = generateProspects(category, limit);

console.log(`✅ Generated ${prospects.length} prospects:`);
prospects.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.location})`);
});

// Generate landing page HTML
const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const generateLanding = (prospect) => {
    const safeName = escapeHtml(prospect.name);
    const description = `Professional ${categoryData.label.toLowerCase()} website designed to drive business growth and customer engagement.`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeName} | Professional Website</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-300">
    <nav class="fixed w-full z-50 bg-zinc-950/80 backdrop-blur border-b border-white/10">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <span class="text-white font-bold">${safeName}</span>
            <a href="#contact" class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded">Contact</a>
        </div>
    </nav>

    <section class="pt-32 pb-20 px-6 text-center">
        <h1 class="text-5xl md:text-7xl text-white mb-6">${safeName}</h1>
        <p class="text-xl text-zinc-400 max-w-3xl mx-auto mb-8">${escapeHtml(description)}</p>
        <a href="#contact" class="inline-block bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 rounded font-bold">
            Get Your Website Today
        </a>
    </section>

    <section id="contact" class="py-20 px-6 bg-zinc-900">
        <div class="max-w-2xl mx-auto text-center">
            <h2 class="text-3xl text-white mb-6">Ready to Grow Your Business?</h2>
            <p class="text-zinc-400 mb-8">Contact us today for a free consultation</p>
            <a href="mailto:cherevan.n.s@gmail.com?subject=Website for ${safeName}" 
               class="inline-block bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 rounded font-bold">
                Schedule Demo
            </a>
        </div>
    </section>
</body>
</html>`;
};

// Save landing pages
const distDir = path.join(__dirname, 'dist', category);
fs.mkdirSync(distDir, { recursive: true });

console.log(`\n📝 Generating landing pages...`);
prospects.forEach((p) => {
    const slug = p.name.toLowerCase().replace(/\s+/g, '-').replace(/#/g, '');
    const html = generateLanding(p);
    const filePath = path.join(distDir, `${slug}.html`);
    fs.writeFileSync(filePath, html);
});

console.log(`✅ ${prospects.length} landing pages created in ${distDir}`);

// Generate email list
console.log(`\n📧 Email template for ${category}:`);
console.log(`Subject: ${pitchTemplate.subject}`);
console.log(`Hook: ${pitchTemplate.hook}`);

// Save batch to file for reference
const batchFile = path.join(distDir, 'batch.json');
fs.writeFileSync(batchFile, JSON.stringify({
    category,
    count: prospects.length,
    created: new Date().toISOString(),
    prospects
}, null, 2));

console.log(`\n✅ Batch saved to ${batchFile}`);
console.log(`\n🚀 Next: Send emails to ${prospects.length} prospects with tailored subject lines`);
