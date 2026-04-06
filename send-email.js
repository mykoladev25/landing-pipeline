#!/usr/bin/env node
const nodemailer = require('nodemailer');

const recipientEmail = process.argv[2] || 'cherevan.n.s@gmail.com';
const senderEmail = 'cherevan.n.s@gmail.com';
const appPassword = process.env.GMAIL_APP_PASSWORD;

if (!appPassword) {
    console.error('❌ Set GMAIL_APP_PASSWORD env var');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: senderEmail,
        pass: appPassword
    }
});

const mailOptions = {
    from: senderEmail,
    to: recipientEmail,
    subject: 'Your Coffee Shop Deserves Better Web Presence ☕',
    html: `
<p>Hi there,</p>

<p>I noticed <strong>Old Street Roasters</strong> doesn't have a website yet.</p>

<p>Premium coffee shops like yours are losing customers daily because people can't find you online. No booking page. No menu showcase. No way to build a following.</p>

<p>I help specialty cafés launch stunning web presence in 48 hours — complete with:</p>
<ul>
<li>✨ Premium design (Tailwind + Alpine.js)</li>
<li>📱 Mobile-first, lightning-fast loading</li>
<li>📸 Instagram-like galleries</li>
<li>💌 Email integration for loyalty programs</li>
</ul>

<p><strong><a href="https://nik-dev.pp.ua/demo/old-street-roasters-premium">See what's possible</a></strong></p>

<p>This exact design took 2 hours to produce. Imagine what we could do with your actual photos and branding.</p>

<p>Let's talk. No obligation.</p>

<p>—<br>
Nikolay<br>
Frontend Specialist | Web Design for Hospitality<br>
<a href="mailto:cherevan.n.s@gmail.com">cherevan.n.s@gmail.com</a></p>
    `
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
    console.log(`✅ Email sent to ${recipientEmail}`);
    console.log('Message ID:', info.messageId);
});
