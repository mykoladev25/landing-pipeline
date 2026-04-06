#!/usr/bin/env node
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
// Завантажуємо .env напряму з директорії проєкту, бо process.cwd() може бути іншим при запуску з bash скрипту
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("⚠️ .env file not found at " + envPath);
}

const { execSync } = require('child_process');
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);
const os = require('os');
const dns = require('dns').promises;

let QUERY = process.argv[2];

const extractJSON = (text) => {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return text.substring(start, end + 1);
    }
    throw new Error("No JSON object found");
};

async function verifyEmailDomain(email) {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1];
    try {
        const records = await dns.resolveMx(domain);
        return records && records.some(r => r.exchange && r.exchange.trim() !== '' && r.exchange !== '.');
    } catch (e) {
        return false;
    }
}

const fetchUnsplashImages = (keyword) => {
    try {
        const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(keyword)}&per_page=5`;
        const res = execSync(`curl -s "${url}"`, { encoding: 'utf-8' });
        const data = JSON.parse(res);
        if (data.results && data.results.length >= 3) {
            return data.results.slice(0, 3).map(r => r.urls.raw + '&auto=format&fit=crop&w=1200&q=80');
        }
    } catch (e) {
        console.log("⚠️ Помилка отримання картинок з Unsplash API.", e.message);
    }
    return [
        `https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200`
    ];
};

async function runAgentAsync(prompt, sessionPrefix, timeoutMs) {
    const sessionId = `${sessionPrefix}-${Date.now()}`;
    const promptFile = `/tmp/${sessionId}.txt`;
    fs.writeFileSync(promptFile, prompt);
    const cmd = `OPENCLAW_MODEL=google/gemini-3.1-pro-preview openclaw agent --session-id ${sessionId} --message "$(cat ${promptFile})"`;
    const { stdout } = await execAsync(cmd, { encoding: 'utf-8', timeout: timeoutMs, maxBuffer: 1024 * 1024 * 10 });
    return stdout;
}

(async () => {
    const startTime = Date.now();
    console.log(`⏱ Початок роботи пайплайну...`);

    if (!QUERY) {
        console.log(`[0] Стратегія: AI обирає нову нішу та локацію...`);
        try {
            const stratPrompt = `Pick a random, highly specific consumer-facing (B2C) business niche in a wealthy country. Do not use generic examples. Return ONLY the search query string, nothing else. Example: premium wellness retreat in Geneva, Switzerland`;
            const stratResponse = await runAgentAsync(stratPrompt, 'strat', 60000);
            QUERY = stratResponse.trim().replace(/['"]/g, '');
            console.log(`🎯 AI Стратег обрав: "${QUERY}" (${((Date.now() - startTime)/1000).toFixed(1)}s)`);
        } catch (e) {
            console.log("⚠️ Помилка генерації стратегії, використовуємо дефолт.", e.message);
            QUERY = "boutique hotel in Zurich, Switzerland";
        }
    }

    console.log(`[1] OSINT: Шукаємо реальний заклад за запитом: "${QUERY}"...`);
    let osintData;
    const osintStart = Date.now();
    try {
        const osintPrompt = `You are a FAST OSINT investigator. Search the web exactly ONCE for a specific, real "${QUERY}". 
CRITICAL RULES:
1. Find an EXACT establishment with a REAL unique name.
2. Pick a business with NO modern website (only Maps/Facebook).
3. Find a valid phone number (E.164) OR their REAL public email.
4. DO NOT browse deeply. Just extract info from the first search results. SPEED IS CRITICAL.
5. Return ONLY a valid JSON object in the local language:
{
  "name": "Exact Name", "email": "email@domain.com", "phone": "+1234567890", 
  "description": "2 sentence description.", "vibe": "3 keywords",
  "reviews": [ {"text": "Review", "author": "Name"} ],
  "menu": [ {"name": "Service", "price": "Price", "desc": "Desc"} ],
  "language": "Language", "google_maps_url": "URL", "image_keyword": "single english keyword for unsplash"
}`;
        const osintResponse = await runAgentAsync(osintPrompt, 'osint', 120000);
        osintData = JSON.parse(extractJSON(osintResponse));
        osintData.slug = osintData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        if (!osintData.google_maps_url) throw new Error("Google Maps URL is missing");
        
        let contactFound = false;
        if (osintData.email && !osintData.email.includes("example.com")) {
            const isEmailValid = await verifyEmailDomain(osintData.email);
            if (isEmailValid) {
                contactFound = true;
            } else {
                osintData.email = null;
            }
        } else {
            osintData.email = null;
        }

        if (osintData.phone) {
            let phoneClean = osintData.phone.replace(/\\s|-/g, '');
            if (/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
                contactFound = true;
                osintData.phone = phoneClean.replace(/[^\d+]/g, '');
            } else {
                osintData.phone = null;
            }
        }

        if (!contactFound) {
            console.log("⚠️ Не знайдено жодного валідного контакту. Зупиняємо.");
            process.exit(1);
        }
        
        console.log(`✅ OSINT завершено: ${osintData.name} (${((Date.now() - osintStart)/1000).toFixed(1)}s)`);
    } catch (e) {
        console.log("⚠️ Помилка OSINT.", e.message);
        process.exit(1);
    }

    const validImages = fetchUnsplashImages(osintData.image_keyword);

    console.log(`[2] Паралельна генерація (Фронтенд + Email + WhatsApp)...`);
    const genStart = Date.now();
    
    // Промпти
    const frontendPrompt = `You are a Senior Frontend Engineer. Build an ultra-premium landing page.
Business: ${osintData.name} | Desc: ${osintData.description} | Lang: ${osintData.language}
Reviews: ${JSON.stringify(osintData.reviews)} | Menu: ${JSON.stringify(osintData.menu)}

1. DESIGN: Full-page, ultra-premium editorial design in ${osintData.language}. Hero, About, Services, Testimonials, Gallery, Footer.
2. RESPONSIVE & BUG-FREE (CRITICAL): The layout MUST be 100% fully responsive. NO horizontal scrolling. Add \`overflow-x-hidden\` to body. Avoid \`w-screen\` with paddings. DO NOT USE \`opacity-0\` on elements without a bulletproof Alpine.js unhide mechanism. Default to elements being visible.
3. INTERACTIVITY: Alpine.js interactive element.
4. CRO MODAL: Alpine.js modal to contact the business.
5. IMAGES: Use EXACTLY: ${validImages[0]}, ${validImages[1]}, ${validImages[2]}
6. Output ONLY raw HTML (<!DOCTYPE html>...</html>). NO markdown ticks.`;

    const landingUrl = `${process.env.BASE_URL}/${osintData.slug}`;

    const emailPrompt = `Write a highly-converting cold email to the owner of ${osintData.name}. Goal: Get them to click this custom landing page: ${landingUrl}. Language: ${osintData.language}. Return ONLY valid JSON: {"subject": "...", "body": "..."} NO MARKDOWN.`;

    const waPrompt = `Write a short, highly-converting WhatsApp cold message to the owner of ${osintData.name}. Language: ${osintData.language}. Goal: Get them to click: ${landingUrl}. Sign with "${process.env.SIGNATURE_NAME}". Return ONLY text, NO markdown.`;

    // Запуск задач ПАРАЛЕЛЬНО
    let htmlPromise = runAgentAsync(frontendPrompt, 'front', 300000);
    let emailPromise = osintData.email ? runAgentAsync(emailPrompt, 'email', 60000) : Promise.resolve(null);
    let waPromise = osintData.phone ? runAgentAsync(waPrompt, 'wa', 60000) : Promise.resolve(null);

    let [htmlRes, emailRes, waRes] = await Promise.all([htmlPromise, emailPromise, waPromise]);
    
    console.log(`✅ Генерація завершена (${((Date.now() - genStart)/1000).toFixed(1)}s)`);

    // Обробка HTML
    let htmlContent = htmlRes.toString().trim();
    htmlContent = htmlContent.replace(/^```html/mi, '').replace(/^```/mi, '').replace(/```$/m, '').trim();
    const startMatch = htmlContent.match(/<!doctype html>/i);
    if (startMatch) htmlContent = htmlContent.substring(startMatch.index);
    const endMatch = htmlContent.match(/<\/html>/i);
    if (endMatch) htmlContent = htmlContent.substring(0, endMatch.index + 7);
    
    const buildDir = path.join(__dirname, 'dist', osintData.slug);
    fs.mkdirSync(buildDir, { recursive: true });
    const indexPath = path.join(buildDir, 'index.html');
    fs.writeFileSync(indexPath, htmlContent);

    // Деплой
    console.log(`[3] Деплой...`);
    const remotePath = `${process.env.REMOTE_BASE_PATH}/${osintData.slug}`;
    const serverIp = process.env.SERVER_IP;
    const sshKey = process.env.SSH_KEY_PATH || path.join(os.homedir(), '.ssh/id_ed25519');
    
    if (!serverIp || !process.env.REMOTE_BASE_PATH) {
        console.log("⚠️ Помилка: SERVER_IP або REMOTE_BASE_PATH не визначені. Перевірте .env файл.");
        process.exit(1);
    }
    
    execSync(`ssh -i ${sshKey} root@${serverIp} "mkdir -p ${remotePath} && chown -R www-data:www-data ${remotePath}"`);
    execSync(`scp -i ${sshKey} ${indexPath} root@${serverIp}:${remotePath}/index.html`);
    execSync(`ssh -i ${sshKey} root@${serverIp} "chmod -R 755 ${remotePath} && chmod 644 ${remotePath}/index.html"`);

    let contactInfo = "";
    if (osintData.email && emailRes) {
        let generatedEmail = JSON.parse(extractJSON(emailRes.toString()));
        const emailContentTxt = `From: ${process.env.SENDER_EMAIL}\nTo: ${osintData.email}\nSubject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
        fs.writeFileSync('/tmp/email_content.txt', emailContentTxt);
        execSync(`cat /tmp/email_content.txt | himalaya template send`);
        contactInfo += `\n📧 *Email:* ${osintData.email}`;
    }

    if (osintData.phone && waRes) {
        let waText = encodeURIComponent(waRes.toString().trim().replace(/['"]/g, ''));
        let whatsappLink = `https://wa.me/${osintData.phone.replace('+','')}?text=${waText}`;
        contactInfo += `\n📞 *Phone:* ${osintData.phone}\n💬 *WhatsApp:* [Відправити](${whatsappLink})`;
    }

    const tgMessage = `🚀 *Пайплайн завершено*\n⏱ Час: ${((Date.now() - startTime)/1000).toFixed(1)}s\n\n🏢 *Бізнес:* ${osintData.name}\n🗺 *Мапа:* ${osintData.google_maps_url}\n🌐 *Лендінг:* ${landingUrl}${contactInfo}`;
    execSync(`openclaw message send --target ${process.env.TELEGRAM_CHAT_ID} --message "${tgMessage}"`);
    
    console.log(`🎉 Пайплайн успішно завершено за ${((Date.now() - startTime)/1000).toFixed(1)}s`);
})();
