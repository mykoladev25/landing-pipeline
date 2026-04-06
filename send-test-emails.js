#!/usr/bin/env node
const nodemailer = require('nodemailer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync('contacts.json', 'utf-8'));
const appPassword = process.env.GMAIL_APP_PASSWORD || 'khjp ygmv nsln mapa';
const fromEmail = 'cherevan.n.s@gmail.com';
const testEmail = 'cherevan.n.s@gmail.com';

// Перевірка доступності URL
const checkUrlAvailable = (url) => {
    return new Promise((resolve) => {
        const req = https.request(url, { method: 'HEAD' }, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: fromEmail,
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

const generateEmailBody = (categoryKey, categoryData, template) => {
    const demoUrls = {
        'bakery': 'https://nik-dev.pp.ua/demo/bakery',
        'coffee': 'https://nik-dev.pp.ua/demo/old-street-roasters-premium'
    };
    const landingUrl = demoUrls[categoryKey] || `https://nik-dev.pp.ua/demo/${categoryKey}`;
    
    return `
<p>Hi,</p>

<p><strong>Check out this ${categoryData.label} website ${categoryData.emoji}</strong></p>

<p>${escapeHtml(template.hook)}</p>

<p>I help ${categoryData.label.toLowerCase()} launch stunning web presence in 48 hours — complete with:</p>
<ul>
<li>✨ Premium design (Tailwind + Alpine.js)</li>
<li>📱 Mobile-first, lightning-fast loading</li>
<li>📸 Professional galleries</li>
<li>💌 Online booking integration</li>
</ul>

<p><strong><a href="${landingUrl}">See what's possible for ${categoryData.label}</a></strong></p>

<p>This exact design took 2 hours to produce. Imagine what we could do with your actual photos and branding.</p>

<p>Let's talk. No obligation.</p>

<p>—<br>
Nikolay<br>
Frontend Specialist | Web Design for Business<br>
<a href="mailto:${fromEmail}">${fromEmail}</a></p>
    `;
};

const sendTestEmails = async () => {
    // Беремо існуючі категорії
    const selectedCategories = [
        ['bakery', config.categories.bakery],
        ['coffee', config.categories.coffee]
    ];
    
    console.log(`\n📧 Тест: Відправляємо 2 категорії на 1 адресу\n`);
    console.log(`📬 Адреса: ${testEmail}\n`);

    // Перевірка доступності сайтів перед відправкою
    console.log(`🔍 Перевірка доступності сайтів...\n`);
    const urlChecks = [];
    
    for (const [categoryKey, categoryData] of selectedCategories) {
        // Для наявних - використовуємо конкретні URL
        const demoUrls = {
            'bakery': 'https://nik-dev.pp.ua/demo/bakery',
            'coffee': 'https://nik-dev.pp.ua/demo/old-street-roasters-premium'
        };
        const landingUrl = demoUrls[categoryKey] || `https://nik-dev.pp.ua/demo/${categoryKey}`;
        const isAvailable = await checkUrlAvailable(landingUrl);
        urlChecks.push({ categoryKey, categoryData, landingUrl, isAvailable });
        
        if (isAvailable) {
            console.log(`   ✅ ${categoryData.label} ${categoryData.emoji}: ${landingUrl}`);
        } else {
            console.log(`   ❌ ${categoryData.label} ${categoryData.emoji}: ${landingUrl} (НЕДОСТУПНИЙ)`);
        }
    }

    // Перевіряємо, чи всі сайти доступні
    const allAvailable = urlChecks.every(check => check.isAvailable);
    
    if (!allAvailable) {
        console.log(`\n⚠️ ПОМИЛКА: Не всі сайти доступні. Листи не відправлені.`);
        console.log(`   Перевірте деплой на сервері.`);
        process.exit(1);
    }

    console.log(`\n📨 Всі сайти доступні. Відправляємо листи...\n`);

    let sentCount = 0;
    
    for (const [categoryKey, categoryData] of selectedCategories) {
        const template = config.pitch_templates[categoryKey];

        if (!template) {
            console.warn(`⚠️ Немає шаблону для ${categoryKey}`);
            continue;
        }

        const mailOptions = {
            from: fromEmail,
            to: testEmail,
            subject: `[TEST] ${template.subject}`,
            html: generateEmailBody(categoryKey, categoryData, template)
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`   ✅ ${categoryData.label} ${categoryData.emoji}`);
            console.log(`      Subject: ${template.subject}`);
            console.log(`      Message ID: ${info.messageId}\n`);
            sentCount++;
        } catch (error) {
            console.error(`   ❌ ${categoryData.label}: ${error.message}\n`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`\n✅ Готово! Відправлено ${sentCount} листів на ${testEmail}`);
    console.log(`   Сайти: bakery + coffee (old-street-roasters-premium)`);
};

sendTestEmails().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
