#!/usr/bin/env node
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
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

// Функція для отримання реальних свіжих картинок з Unsplash по ключовому слову
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
    // Fallback
    return [
        `https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200`
    ];
};

(async () => {
    if (!QUERY) {
        console.log(`[0] Стратегія: AI обирає нову нішу та локацію...`);
        try {
            const stratPrompt = `You are a lead generation strategist targeting B2C businesses. Your task is to pick a completely random, highly specific consumer-facing (B2C) business niche in a random wealthy, economically developed country (e.g., Switzerland, Ireland, Canada, Norway, Singapore, UK, USA, Australia, Germany, Austria).
Do not use generic examples. Pick something creative and different from previous runs.
Return ONLY the search query string, nothing else. No markdown, no quotes.
Example format: premium wellness retreat in Geneva, Switzerland`;
            
            fs.writeFileSync('/tmp/strat_prompt.txt', stratPrompt);
            const stratSessionId = `strat-gen-${Date.now()}`;
            const stratResponse = execSync(`OPENCLAW_MODEL=google/gemini-3.1-pro-preview openclaw agent --session-id ${stratSessionId} --message "$(cat /tmp/strat_prompt.txt)"`, { encoding: 'utf-8', timeout: 60000 });
            
            QUERY = stratResponse.toString().trim().replace(/['"]/g, '');
            console.log(`🎯 AI Стратег обрав ціль: "${QUERY}"`);
        } catch (e) {
            console.log("⚠️ Помилка генерації стратегії, використовуємо дефолт.", e.message);
            QUERY = "boutique hotel in Zurich, Switzerland";
        }
    }

    console.log(`[1] OSINT: Шукаємо реальний заклад за запитом: "${QUERY}"...`);

    let osintData;
    try {
        const osintPrompt = `You are an expert lead generator and OSINT investigator. Search the web for a specific, real "${QUERY}".
CRITICAL RULES:
1. Find an EXACT, specific establishment with a REAL unique name.
2. CRUCIAL: Pick a business that has NO modern website or a very outdated/poor one. If they have a high-end, modern website, SKIP THEM entirely and find another.
3. Extract real reviews and real services/prices.
4. IMPORTANT: You MUST find a valid phone number (E.164 format, e.g., +41791234567) OR their REAL public email address. Search Google Maps or Facebook.
5. Return ONLY a valid JSON object, translated into the native language of the location.

{
  "name": "Exact Specific Business Name",
  "email": "real.contact.email@domain.com", 
  "phone": "+1234567890", 
  "description": "Specific 2-3 sentence description.",
  "vibe": "3 keywords",
  "reviews": [ { "text": "Real review", "author": "Name" } ],
  "menu": [ { "name": "Real Service 1", "price": "Price", "desc": "Desc" } ],
  "language": "Language used for the content",
  "google_maps_url": "Real Google Maps URL",
  "image_keyword": "A highly descriptive ONE or TWO word English keyword representing the exact niche. This will be used to fetch Unsplash photos."
}`;
        fs.writeFileSync('/tmp/osint_prompt.txt', osintPrompt);
        
        const osintSessionId = `osint-gen-${Date.now()}`;
        console.log(`🤖 Запуск агента для OSINT (сесія: ${osintSessionId})...`);
        const osintResponse = execSync(`OPENCLAW_MODEL=google/gemini-3.1-pro-preview openclaw agent --session-id ${osintSessionId} --message "$(cat /tmp/osint_prompt.txt)"`, { encoding: 'utf-8', timeout: 300000 });
        
        osintData = JSON.parse(extractJSON(osintResponse.toString()));
        osintData.slug = osintData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        if (!osintData.google_maps_url) throw new Error("Google Maps URL is missing");
        
        let contactFound = false;
        
        // Перевірка Email
        if (osintData.email && !osintData.email.includes("example.com")) {
            console.log(`[1.5] Валідація Email домену (${osintData.email})...`);
            const isEmailValid = await verifyEmailDomain(osintData.email);
            if (isEmailValid) {
                contactFound = true;
                console.log(`✅ Email ${osintData.email} валідний.`);
            } else {
                console.log(`⚠️ Домен email ${osintData.email} має Null MX або не існує. Пропускаємо email.`);
                osintData.email = null;
            }
        } else {
            osintData.email = null;
        }

        // Перевірка Телефону
        if (osintData.phone) {
            let phoneClean = osintData.phone.replace(/\\s|-/g, '');
            if (/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
                contactFound = true;
                osintData.phone = phoneClean.replace(/[^\d+]/g, '');
                console.log(`✅ Телефон ${osintData.phone} валідний.`);
            } else {
                console.log(`⚠️ Телефон ${osintData.phone} не відповідає E.164. Пропускаємо телефон.`);
                osintData.phone = null;
            }
        }

        if (!contactFound) {
            console.log("⚠️ Не знайдено жодного валідного контакту (email або телефон). Зупиняємо пайплайн.");
            process.exit(1);
        }
        
        console.log(`✅ Знайдено реальний бізнес: ${osintData.name} (Keyword: ${osintData.image_keyword})`);
    } catch (e) {
        console.log("⚠️ Помилка OSINT. Зупиняємо пайплайн.", e.message);
        process.exit(1);
    }

    console.log(`[1.6] Отримання релевантних картинок з Unsplash для: ${osintData.image_keyword}...`);
    const validImages = fetchUnsplashImages(osintData.image_keyword);
    console.log(`✅ Картинки отримано.`);

    console.log(`[2] Фронтенд: Генерація через AI як Senior Креативний Директор...`);
    
    const frontendPrompt = `You are a top-tier Senior Frontend Engineer and an Awwwards-winning Designer. We are building an ultra-premium, cutting-edge landing page.
Your task demands maximum concentration, flawless code, and the use of modern UI/UX principles.

Business Name: ${osintData.name}
Description: ${osintData.description}
Vibe: ${osintData.vibe}
Language: ${osintData.language}
Reviews: ${JSON.stringify(osintData.reviews)}
Services/Menu: ${JSON.stringify(osintData.menu)}

Instructions:
1. DESIGN: Create a full-page, ultra-premium, editorial design. Deeply personalized for ${osintData.name} in ${osintData.language}. Include Hero, About Us, Services, Testimonials, Gallery, Footer.
2. RESPONSIVE & BUG-FREE (CRITICAL): The layout MUST be 100% fully responsive (mobile, tablet, desktop). There must be ABSOLUTELY NO horizontal scrolling. Add \`overflow-x-hidden\` to the body tag. Avoid using \`w-screen\` combined with paddings. 
3. INTERACTIVITY: Implement a subtle, playful interactive element using Alpine.js that responds to user action (scroll, hover, click).
4. CRO MODAL: Include an Alpine.js x-show modal with a button to contact the business in ${osintData.language}.
5. IMAGES: Use ONLY these exact dynamic Unsplash URLs (do not change them):
   - ${validImages[0]}
   - ${validImages[1]}
   - ${validImages[2]}
6. Provide ONLY the final valid HTML code starting with <!DOCTYPE html> and ending with </html>. 
ABSOLUTELY NO markdown ticks around the code. NO explanations. DO NOT output your thinking process. ONLY RAW HTML.`;

    fs.writeFileSync('/tmp/frontend_prompt.txt', frontendPrompt);
    let htmlContent = "";
    
    try {
        const agentSessionId = `frontend-gen-${Date.now()}`;
        console.log(`🤖 Запуск OpenClaw агента (сесія: ${agentSessionId})...`);
        const aiResponse = execSync(`OPENCLAW_MODEL=google/gemini-3.1-pro-preview openclaw agent --session-id ${agentSessionId} --message "$(cat /tmp/frontend_prompt.txt)"`, { encoding: 'utf-8', timeout: 300000 });
        
        let cleanHtml = aiResponse.toString().trim();
        cleanHtml = cleanHtml.replace(/^```html/mi, '').replace(/^```/mi, '').replace(/```$/m, '').trim();
        
        const startMatch = cleanHtml.match(/<!doctype html>/i);
        if (startMatch) cleanHtml = cleanHtml.substring(startMatch.index);
        
        const endMatch = cleanHtml.match(/<\/html>/i);
        if (endMatch) cleanHtml = cleanHtml.substring(0, endMatch.index + 7);
        
        if (!cleanHtml.match(/<!doctype html>/i)) throw new Error("Invalid HTML generated.");
        
        htmlContent = cleanHtml;
        console.log(`✅ Лендінг успішно згенеровано AI!`);
    } catch (e) {
        console.log("⚠️ Помилка генерації AI лендінгу.", e.message);
        process.exit(1);
    }

    const buildDir = path.join(__dirname, 'dist', osintData.slug);
    fs.mkdirSync(buildDir, { recursive: true });
    const indexPath = path.join(buildDir, 'index.html');
    fs.writeFileSync(indexPath, htmlContent);

    console.log(`[3] Деплой: Відправляємо на сервер...`);
    const remotePath = `${process.env.REMOTE_BASE_PATH}/${osintData.slug}`;
    const serverIp = process.env.SERVER_IP;
    const landingUrl = `${process.env.BASE_URL}/${osintData.slug}`;
    const sshKey = process.env.SSH_KEY_PATH || path.join(os.homedir(), '.ssh/id_ed25519');

    try {
        execSync(`ssh -i ${sshKey} root@${serverIp} "mkdir -p ${remotePath}"`);
        execSync(`scp -i ${sshKey} ${indexPath} root@${serverIp}:${remotePath}/index.html`);
        execSync(`ssh -i ${sshKey} root@${serverIp} "chown -R www-data:www-data ${remotePath} && chmod -R 755 ${remotePath} && chmod 644 ${remotePath}/index.html"`);
        console.log(`✅ Деплой успішний! URL: ${landingUrl}`);
        
        let whatsappLink = "";

        if (osintData.email) {
            console.log(`[4] Email: Генеруємо холодний лист...`);
            const emailPrompt = `You are an elite copywriter. Write a highly-converting cold email to the owner of ${osintData.name}.
Goal: Get them to click this custom premium landing page we built for them: ${landingUrl}
Language constraint: You MUST write the email entirely in ${osintData.language}.
Subject constraint: An irresistible hook that a business owner WILL open.
Body constraint: Professional, short, high-status. Include a strong CTA to discuss website expansion.
Signature constraint: The email must be signed with "${process.env.SIGNATURE_NAME}".

Return ONLY a valid JSON object. No markdown ticks:
{
  "subject": "Email Subject Here",
  "body": "Email Body Here (use \\n for line breaks)"
}`;
            fs.writeFileSync('/tmp/email_prompt.txt', emailPrompt);
            try {
                const emailSessionId = `email-gen-${Date.now()}`;
                const emailGenResponse = execSync(`OPENCLAW_MODEL=google/gemini-3.1-pro-preview openclaw agent --session-id ${emailSessionId} --message "$(cat /tmp/email_prompt.txt)"`, { encoding: 'utf-8', timeout: 90000 });
                let generatedEmail = JSON.parse(extractJSON(emailGenResponse.toString()));
                console.log(`✅ Лист згенеровано. Тема: ${generatedEmail.subject}`);
                
                const emailContentTxt = `From: ${process.env.SENDER_EMAIL}\nTo: ${osintData.email}\nSubject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
                fs.writeFileSync('/tmp/email_content.txt', emailContentTxt);
                execSync(`cat /tmp/email_content.txt | himalaya template send`);
                console.log(`✅ Лист відправлено на ${osintData.email}!`);
            } catch (e) {
                console.log("⚠️ Помилка генерації AI-листа.", e.message);
            }
        }

        if (osintData.phone) {
            console.log(`[4.5] WhatsApp: Генеруємо повідомлення...`);
            const waPrompt = `Write a short, highly-converting WhatsApp cold message to the owner of ${osintData.name}.
Language: ${osintData.language}
Goal: Get them to click this custom landing page we built for them: ${landingUrl}
Be professional but conversational. Sign with "${process.env.SIGNATURE_NAME}".
Return ONLY the text message, no JSON, no markdown.`;
            fs.writeFileSync('/tmp/wa_prompt.txt', waPrompt);
            try {
                const waSessionId = `wa-gen-${Date.now()}`;
                let waGenResponse = execSync(`OPENCLAW_MODEL=google/gemini-3.1-pro-preview openclaw agent --session-id ${waSessionId} --message "$(cat /tmp/wa_prompt.txt)"`, { encoding: 'utf-8', timeout: 90000 });
                let waText = encodeURIComponent(waGenResponse.toString().trim().replace(/['"]/g, ''));
                whatsappLink = `https://wa.me/${osintData.phone.replace('+','')}?text=${waText}`;
                console.log(`✅ WhatsApp лінк згенеровано.`);
            } catch (e) {
                console.log("⚠️ Помилка генерації AI-WhatsApp.", e.message);
            }
        }

        console.log(`[6] Telegram: Сповіщення...`);
        let contactInfo = "";
        if (osintData.email) contactInfo += `\n📧 *Email:* ${osintData.email}`;
        if (osintData.phone) {
            contactInfo += `\n📞 *Phone:* ${osintData.phone}`;
            if (whatsappLink) contactInfo += `\n💬 *Send via WhatsApp:* [Клікніть тут](${whatsappLink})`;
        }

        const tgMessage = `🚀 *Пайплайн завершено*\n\n🏢 *Бізнес:* ${osintData.name}\n🗺 *Мапа:* ${osintData.google_maps_url}\n🌐 *Лендінг:* ${landingUrl}${contactInfo}`;
        execSync(`openclaw message send --target ${process.env.TELEGRAM_CHAT_ID} --message "${tgMessage}"`);
    } catch (e) {
        console.log("⚠️ Помилка деплою:", e.message);
    }
})();
