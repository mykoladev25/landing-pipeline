#!/usr/bin/env node
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const category = process.argv[2] || 'salon';
const limit = parseInt(process.argv[3]) || 2;

const config = JSON.parse(fs.readFileSync('contacts.json', 'utf-8'));
const batchFile = path.join('dist', category, 'batch.json');

if (!fs.existsSync(batchFile)) {
    console.error(`❌ Batch file not found: ${batchFile}`);
    process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
const pitchTemplate = config.pitch_templates[category];
const appPassword = process.env.GMAIL_APP_PASSWORD || 'khjp ygmv nsln mapa';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cherevan.n.s@gmail.com',
        pass: appPassword
    }
});

const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const generateEmailBody = (prospect, category) => {
    const categoryData = config.categories[category];
    const landingUrl = `https://nik-dev.pp.ua/demo/${category}/${prospect.name.toLowerCase().replace(/\s+/g, '-').replace(/#/g, '')}`;
    
    return `
<p>Hi there,</p>

<p>I noticed <strong>${escapeHtml(prospect.name)}</strong> doesn't have a strong online presence yet.</p>

<p>${escapeHtml(pitchTemplate.hook)}</p>

<p>I help ${categoryData.label.toLowerCase()} launch stunning web presence in 48 hours — complete with:</p>
<ul>
<li>✨ Premium design (Tailwind + Alpine.js)</li>
<li>📱 Mobile-first, lightning-fast loading</li>
<li>📸 Professional galleries</li>
<li>💌 Online booking integration</li>
</ul>

<p><strong><a href="${landingUrl}">See what's possible for your business</a></strong></p>

<p>This exact design took 2 hours to produce. Imagine what we could do with your actual photos and branding.</p>

<p>Let's talk. No obligation.</p>

<p>—<br>
Nikolay<br>
Frontend Specialist | Web Design for Business<br>
<a href="mailto:cherevan.n.s@gmail.com">cherevan.n.s@gmail.com</a></p>
    `;
};

const sendEmails = async () => {
    const prospects = batch.prospects.slice(0, limit);
    
    console.log(`\n📧 Sending ${prospects.length} emails for category: ${category}\n`);

    for (let i = 0; i < prospects.length; i++) {
        const prospect = prospects[i];
        const mailOptions = {
            from: 'cherevan.n.s@gmail.com',
            to: prospect.email || `test-${i}@example.com`, // Mock email if not set
            subject: pitchTemplate.subject,
            html: generateEmailBody(prospect, category)
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ [${i + 1}/${prospects.length}] ${prospect.name} (${prospect.location})`);
            console.log(`   Message ID: ${info.messageId}\n`);
        } catch (error) {
            console.error(`❌ [${i + 1}/${prospects.length}] ${prospect.name}: ${error.message}\n`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n✅ Batch completed! ${prospects.length} emails sent.`);
};

sendEmails().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
