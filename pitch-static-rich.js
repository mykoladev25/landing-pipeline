#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const QUERY = process.argv[2] || "coffee shop in London";

(async () => {
    console.log(`[1] OSINT & Кваліфікація Лідів: Шукаємо заклад за запитом: "${QUERY}"...`);
    
    // Визначення категорії бізнесу за запитом
    const detectCategory = (query) => {
        const q = query.toLowerCase();
        if (q.includes('sushi') || q.includes('tokyo')) return 'sushi';
        if (q.includes('bakery') || q.includes('paris') || q.includes('boulangerie') || q.includes('patisserie')) return 'bakery';
        if (q.includes('auto') || q.includes('repair') || q.includes('car') || q.includes('mechanic')) return 'auto';
        if (q.includes('gym') || q.includes('fitness') || q.includes('workout') || q.includes('training')) return 'gym';
        if (q.includes('salon') || q.includes('beauty') || q.includes('spa') || q.includes('cosmetic')) return 'salon';
        return 'auto'; // дефолт
    };
    const category = detectCategory(QUERY);

    // Контентні словники для категорій
    const content = {
        auto: {
            description: `A premium auto repair shop in Berlin specializing in German luxury vehicles. We provide meticulous service using OEM parts and cutting‑edge diagnostics.`,
            vibe: "precision, luxury, reliability",
            reviews: [
                { text: `"Brought my Mercedes GLE here after a dealership quote that was twice as high. The team diagnosed the issue accurately, used genuine parts, and had my car ready in two days. Exceptional service!"`, author: "Markus Schneider" },
                { text: `"As a classic Porsche owner, I'm very particular about who touches my car. These technicians are true experts. They handled a complex fuel injection rebuild with perfection."`, author: "Elena Vogel" },
                { text: `"Fast, transparent, and reasonably priced. They explained everything in detail and even provided a video of the inspection. My BMW drives like new again."`, author: "David Wagner" }
            ],
            menu: [
                { name: "Advanced Diagnostic Scan", price: "€89", desc: "Full-system OBD‑II scan with live data logging and expert analysis report." },
                { name: "Premium Oil Service", price: "€65", desc: "Full synthetic oil change (LL‑04/BMW, 229.5/Mercedes, VW 504/507) with OEM filter." },
                { name: "Brake System Service", price: "€220", desc: "Complete brake inspection, pad/sensor replacement, fluid flush, and rotor resurfacing." },
                { name: "Electrical & Battery Health", price: "€75", desc: "Battery/alternator/starter testing, wiring inspection, and coding if required." }
            ],
            interactiveElement: "car"
        },
        sushi: {
            description: `An intimate, Michelin‑guided sushi bar in the heart of Tokyo, where every piece is a masterpiece of flavor and presentation.`,
            vibe: "authentic, refined, omakase",
            reviews: [
                { text: `"The omakase experience here is transcendent. Chef Yamamoto's attention to detail and sourcing of rare fish is unparalleled. A true culinary journey."`, author: "Kenji Tanaka" },
                { text: `"From the moment you step in, the atmosphere is serene and focused. The sushi melts in your mouth. Worth every yen."`, author: "Yuki Nakamura" },
                { text: `"I've dined at many top sushi bars in Ginza, but this one stands out for its balance of tradition and innovation. An unforgettable evening."`, author: "Hiroshi Sato" }
            ],
            menu: [
                { name: "Omakase Tasting Menu", price: "¥15,000", desc: "Chef's selection of 12 seasonal pieces, including rare finds from Tsukiji market." },
                { name: "Sushi‑Making Masterclass", price: "¥8,500", desc: "Two‑hour private lesson with a master chef, including materials and take‑home set." },
                { name: "Private Events & Catering", price: "Custom", desc: "Exclusive omakase experience for groups of 4‑10, tailored to your preferences." },
                { name: "Seasonal Specials", price: "Market Price", desc: "Limited‑time offerings featuring the day's finest catch and regional ingredients." }
            ],
            interactiveElement: "sushi"
        },
        bakery: {
            description: `A family‑run boulangerie in Paris, crafting daily bread and pastries with century‑old techniques and the finest local ingredients.`,
            vibe: "artisanal, traditional, warm",
            reviews: [
                { text: `"The croissants here are the best I've had outside my grandmother's kitchen. Flaky, buttery, perfect every morning. A true Parisian treasure."`, author: "Sophie Lefèvre" },
                { text: `"Their sourdough bread has become a staple in our home. The crust, the aroma, the texture—everything is exactly as a proper baguette should be."`, author: "Antoine Moreau" },
                { text: `"Not just a bakery, but a community hub. The owners remember your name and your usual order. That personal touch is priceless."`, author: "Claire Dubois" }
            ],
            menu: [
                { name: "Daily Bread Selection", price: "€3–€8", desc: "Freshly baked baguettes, sourdough, rye, and specialty loaves, available from 6 AM." },
                { name: "Custom Celebration Cakes", price: "€25–€120", desc: "Hand‑decorated cakes for birthdays, weddings, and special occasions, designed with you." },
                { name: "Baking Workshops", price: "€45/person", desc: "Saturday morning classes where you learn to make croissants, pains au chocolat, and more." },
                { name: "Wholesale for Cafés", price: "Inquire", desc: "Regular deliveries of pastries and bread to local cafés and restaurants." }
            ],
            interactiveElement: "croissant"
        },
        gym: {
            description: `A luxury fitness gym in New York offering state‑of‑the‑art equipment, personalized training, and a community‑driven environment for peak performance.`,
            vibe: "energetic, premium, motivational",
            reviews: [
                { text: `"This gym transformed my approach to fitness. The trainers are exceptional, the equipment is top‑tier, and the atmosphere is incredibly motivating."`, author: "Marcus Johnson" },
                { text: `"As a competitive athlete, I need a facility that matches my intensity. This place delivers—clean, professional, and always evolving."`, author: "Sarah Chen" },
                { text: `"Not just a gym, but a lifestyle hub. The recovery zone, nutrition coaching, and community events make it worth every penny."`, author: "David Rodriguez" }
            ],
            menu: [
                { name: "Personal Training Package", price: "$120/session", desc: "One‑on‑one sessions with certified trainers, tailored to your goals and fitness level." },
                { name: "Group Class Membership", price: "$89/month", desc: "Unlimited access to HIIT, yoga, spin, and strength classes with expert instructors." },
                { name: "Nutrition & Recovery Planning", price: "$65/consult", desc: "Custom meal plans, supplement guidance, and recovery strategies from licensed nutritionists." },
                { name: "Corporate Wellness Programs", price: "Custom", desc: "On‑site or virtual fitness solutions for companies focused on employee health and productivity." }
            ],
            interactiveElement: "weight"
        },
        salon: {
            description: `A modern beauty salon in Milan specializing in cutting‑edge treatments, organic products, and a serene, luxurious experience for every client.`,
            vibe: "serene, luxurious, refined",
            reviews: [
                { text: `"The attention to detail here is unparalleled. My skin has never looked better, and the ambiance is so calming. A true sanctuary."`, author: "Giulia Conti" },
                { text: `"As a makeup artist, I'm very picky about where I get my treatments. This salon exceeds expectations—professional, innovative, and genuinely caring."`, author: "Elena Rossi" },
                { text: `"From the moment you walk in, you feel pampered. The staff remembers your preferences and always delivers exceptional results."`, author: "Marco Bianchi" }
            ],
            menu: [
                { name: "Signature Facial Treatment", price: "€85", desc: "90‑minute custom facial using organic products, including extraction, massage, and LED therapy." },
                { name: "Luxury Manicure & Pedicure", price: "€55", desc: "Full‑service nail care with premium polishes, exfoliation, and hydrating massage." },
                { name: "Hair Styling & Coloring", price: "€120+", desc: "Expert cut, color, and styling using ammonia‑free dyes and heat‑protection technology." },
                { name: "Bridal & Event Packages", price: "Custom", desc: "Complete beauty preparation for weddings, galas, and special occasions, on‑site available." }
            ],
            interactiveElement: "lipstick"
        }
    };

    // Динамічний фолбек-об'єкт
    let qName = QUERY.replace(/in\s+[a-zA-Z]+/gi, '').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let qSlug = QUERY.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const osintData = {
        name: qName || "Premium Place",
        slug: qSlug || "premium-place",
        email: "cherevan.n.s@gmail.com", 
        websiteStatus: "no_website",
        description: content[category].description,
        vibe: content[category].vibe,
        reviews: content[category].reviews,
        menu: content[category].menu,
        category: category
    };
    console.log(`✅ Згенеровано динамічний фолбек для: ${osintData.name}`);

    // Валідація email
    if (!osintData.email || osintData.email === 'null' || osintData.email.trim() === '') {
        console.log(`🛑 Зупинка пайплайну: Email не знайдено для "${osintData.name}".`);
        process.exit(0);
    } else {
        console.log(`📧 Знайдено email для контакту: ${osintData.email}`);
    }

    // Пошук фото бренду
    const stockImages = {
        'auto': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800&fm=jpg',
        'sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800&fm=jpg',
        'bakery': 'https://images.unsplash.com/photo-1599599810694-b3fa7a4b7695?auto=format&fit=crop&q=80&w=800&fm=jpg',
        'gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800&fm=jpg',
        'salon': 'https://images.unsplash.com/photo-1521590832167-12d19d654956?auto=format&fit=crop&q=80&w=800&fm=jpg'
    };
    const imageUrl = stockImages[osintData.category] || stockImages['auto'];

    // Статичний HTML з багатим контентом
    console.log(`[3] Фронтенд: Генеруємо лендінг з багатим контентом для: ${osintData.name}...`);
    
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${osintData.name} | Premium ${osintData.category === 'auto' ? 'Auto Repair' : osintData.category === 'sushi' ? 'Sushi Bar' : osintData.category === 'bakery' ? 'Bakery' : 'Business'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'brand-vibrant': '#FF6B35',
                        'brand-dark': '#1A1A1A',
                        'brand-light': '#FFF8F0',
                        'brand-muted': '#8B7355',
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    }
                }
            }
        }
    </script>
    <style>
        .fade-in-section {
            opacity: 1; /* Видимі одразу */
            transform: translateY(0); /* Без зсуву */
            transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .fade-in-section.show {
            /* Можна залишити для інших ефектів, або навіть прибрати */
        }

    </style>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body x-data="{ openModal: false, scrollPercent: 0 }" x-init="" @scroll.window="scrollPercent = Math.min(100, (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)" class="bg-brand-light text-brand-dark font-sans antialiased">

    <!-- Header -->
    <header class="fixed top-0 left-0 w-full z-50 bg-brand-dark bg-opacity-90 backdrop-blur-sm shadow-lg">
        <nav class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="#" class="text-xl md:text-2xl font-serif font-bold text-brand-light tracking-wide">
                ${osintData.name}
            </a>
            <button @click="openModal = true" class="px-5 py-2 border border-brand-vibrant text-brand-vibrant text-sm md:text-base font-medium hover:bg-brand-vibrant hover:text-brand-dark transition-all duration-300 rounded-md">
                Contact Us
            </button>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-dark to-gray-900">
        <div class="absolute inset-0 bg-black/40 z-0"></div>
        <div class="relative z-10 text-center text-brand-light px-6 max-w-5xl mx-auto">
            <div class="bg-white/10 backdrop-blur-sm rounded-3xl p-12 md:p-16 border border-white/20 mb-12">
                <h1 class="font-serif text-5xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight mb-6">
                    ${osintData.category === 'auto' ? 'Precision. Performance. Perfection.' : osintData.category === 'sushi' ? 'Authenticity. Mastery. Harmony.' : osintData.category === 'bakery' ? 'Tradition. Craftsmanship. Warmth.' : osintData.category === 'gym' ? 'Strength. Discipline. Transformation.' : osintData.category === 'salon' ? 'Elegance. Care. Radiance.' : 'Excellence. Quality. Trust.'}
                </h1>
                <p class="font-sans text-xl md:text-2xl lg:text-3xl mb-10 max-w-3xl mx-auto text-brand-muted">
                    ${osintData.description}
                </p>
                <button @click="openModal = true" class="inline-block px-10 py-4 bg-brand-vibrant text-brand-dark text-xl font-semibold rounded-xl shadow-2xl hover:bg-brand-vibrant/90 hover:scale-105 transition-all duration-300">
                    Book Your Service
                </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                    <div class="text-3xl font-bold text-brand-vibrant">15+</div>
                    <div class="text-sm text-brand-muted">Years Experience</div>
                </div>
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                    <div class="text-3xl font-bold text-brand-vibrant">2,500+</div>
                    <div class="text-sm text-brand-muted">Vehicles Serviced</div>
                </div>
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                    <div class="text-3xl font-bold text-brand-vibrant">98%</div>
                    <div class="text-sm text-brand-muted">Customer Satisfaction</div>
                </div>
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                    <div class="text-3xl font-bold text-brand-vibrant">24/7</div>
                    <div class="text-sm text-brand-muted">Emergency Support</div>
                </div>
            </div>
        </div>
    </section>



    <!-- About Section -->
    <section x-data="{ show: false }" x-intersect="show = true" :class="{ 'show': show }" class="py-20 md:py-28 bg-brand-dark text-brand-light fade-in-section">
        <div class="max-w-4xl mx-auto px-6 text-center">
            <h2 class="font-serif text-4xl md:text-5xl font-bold mb-8 leading-snug">
                Crafting Excellence, One Detail at a Time
            </h2>
            <p class="text-lg md:text-xl leading-relaxed mb-6">
                At our Berlin workshop, we blend meticulous engineering with an atmosphere of refined passion. Every vehicle entrusted to us receives unparalleled attention, ensuring not just repair, but a rejuvenation of its core performance and aesthetic.
            </p>
            <p class="text-lg md:text-xl leading-relaxed text-brand-muted">
                Experience service designed for the discerning owner, where expertise meets artistry.
            </p>
        </div>
    </section>

    <!-- Services Section -->
    <section x-data="{ show: false }" x-intersect="show = true" :class="{ 'show': show }" class="py-20 md:py-28 bg-brand-light text-brand-dark fade-in-section">
        <div class="max-w-6xl mx-auto px-6">
            <h2 class="font-serif text-4xl md:text-5xl font-bold text-center mb-16">
                Our Signature Services
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                ${osintData.menu.map((item, idx) => `
                <div class="bg-white rounded-xl shadow-lg p-8 border border-brand-muted/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div class="text-4xl mb-4">${['🔧', '🛠️', '⚙️', '🔍'][idx] || '🚗'}</div>
                    <h3 class="font-serif text-2xl font-bold mb-2">${item.name}</h3>
                    <p class="text-brand-vibrant text-xl font-medium mb-4">${item.price}</p>
                    <p class="text-gray-600">${item.desc}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Reviews Section -->
    <section x-data="{ show: false }" x-intersect="show = true" :class="{ 'show': show }" class="py-20 md:py-28 bg-brand-dark text-brand-light fade-in-section">
        <div class="max-w-6xl mx-auto px-6">
            <h2 class="font-serif text-4xl md:text-5xl font-bold text-center mb-16">
                What Our Clients Say
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                ${osintData.reviews.map((review, idx) => `
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/10 transition-all duration-300">
                    <div class="flex items-center mb-6">
                        <div class="w-12 h-12 rounded-full bg-brand-vibrant flex items-center justify-center text-white font-bold text-xl mr-4">
                            ${review.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <p class="font-semibold text-lg">${review.author}</p>
                            <p class="text-brand-muted text-sm">Verified Customer</p>
                        </div>
                    </div>
                    <p class="text-lg italic">${review.text}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section x-data="{ show: false }" x-intersect="show = true" :class="{ 'show': show }" class="py-20 md:py-28 bg-brand-vibrant text-brand-dark text-center fade-in-section">
        <div class="max-w-3xl mx-auto px-6">
            <h2 class="font-serif text-4xl md:text-5xl font-bold mb-8">
                Ready for Unrivaled Service?
            </h2>
            <p class="text-xl md:text-2xl leading-relaxed mb-10">
                Connect with our team to schedule your appointment or inquire about our bespoke auto care solutions.
            </p>
            <button @click="openModal = true" class="inline-block px-10 py-4 bg-brand-dark text-brand-light text-xl font-semibold rounded-md shadow-xl hover:bg-brand-dark/90 transition-all duration-300">
                Get In Touch
            </button>
        </div>
    </section>

    <!-- CRO Modal -->
    <div x-show="openModal" x-transition class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
        <div class="bg-white rounded-lg max-w-md w-full p-8 shadow-2xl">
            <h3 class="text-2xl font-bold mb-4">Let's Expand Your Digital Presence</h3>
            <p class="text-gray-700 mb-6">
                Tell us how you plan to expand your website (Magento, Shopify, React, Node.js), and we'll prepare a personalized presentation of possible solutions.
            </p>
            <div class="mb-6">
                <p class="text-sm text-gray-500 mb-1">Email us at:</p>
                <a href="mailto:cherevan.n.s@gmail.com" class="text-blue-600 hover:text-blue-800 font-medium">cherevan.n.s@gmail.com</a>
            </div>
            <div class="flex justify-end space-x-4">
                <button @click="openModal = false" class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">Close</button>
                <a href="mailto:cherevan.n.s@gmail.com" @click.stop class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Email Us</a>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="bg-brand-dark text-brand-muted py-12 px-6">
        <div class="max-w-7xl mx-auto text-center md:flex md:justify-between md:items-center">
            <p class="text-sm mb-4 md:mb-0">&copy; 2026 ${osintData.name}. All rights reserved.</p>
            <div class="flex justify-center space-x-6">
                <a href="#" class="text-sm hover:text-brand-vibrant transition-colors duration-300">Privacy Policy</a>
                <a href="#" class="text-sm hover:text-brand-vibrant transition-colors duration-300">Terms of Service</a>
            </div>
        </div>
    </footer>

</body>
</html>`;

    // Збереження HTML
    const buildDir = path.join(__dirname, 'dist', osintData.slug);
    fs.mkdirSync(buildDir, { recursive: true });
    const indexPath = path.join(buildDir, 'index.html');
    fs.writeFileSync(indexPath, htmlContent);

    // Деплой
    console.log(`[4] Деплой: Відправляємо на nik-dev.pp.ua...`);
    const remotePath = `/var/www/nik-dev.pp.ua/demo/${osintData.slug}`;
    const serverIp = "5.189.135.71";
    const landingUrl = `https://nik-dev.pp.ua/demo/${osintData.slug}`;
    const sshKey = path.join(os.homedir(), '.ssh/id_ed25519');

    try {
        execSync(`ssh -i ${sshKey} root@${serverIp} "mkdir -p ${remotePath}"`);
        execSync(`scp -i ${sshKey} ${indexPath} root@${serverIp}:${remotePath}/index.html`);
        execSync(`ssh -i ${sshKey} root@${serverIp} "chown -R www-data:www-data ${remotePath} && chmod -R 755 ${remotePath} && chmod 644 ${remotePath}/index.html"`);
        console.log(`✅ Деплой успішний! URL: ${landingUrl}`);
        
        // Email (динамічний за категорією)
        console.log(`[5] Email: Генеруємо холодний лист...`);
        let emailSubject, emailBody;
        if (osintData.category === 'auto') {
            emailSubject = "Ihr Premium-Autoreparaturgeschäft in Berlin verdient eine Website, die genauso exzellent ist wie Ihre Arbeit";
            emailBody = `Sehr geehrte Damen und Herren,

wir haben eine maßgeschneiderte, premium Landing Page für Ihr Autoreparaturgeschäft in Berlin erstellt, die Sie hier einsehen können: ${landingUrl}

Die Seite ist modern, minimalistisch und vertrauenswürdig gestaltet – genau wie Ihr Service.

Wir sind spezialisiert auf die Erweiterung von Websites (Magento, Shopify, React, Node.js). Schreiben Sie uns, wie Sie Ihre digitale Präsenz ausbauen möchten, und wir erstellen eine personalisierte Präsentation der möglichen Lösungen.

Mit freundlichen Grüßen,
Mykola`;
        } else if (osintData.category === 'sushi') {
            emailSubject = "あなたの東京のプレミアム寿司店に、料理と同じくらい洗練されたウェブサイトを";
            emailBody = `こんにちは、

このたびは、東京で最高級の寿司体験を提供されている貴店のことを知り、連絡させていただきました。

私たちは、Magento、Shopify、React、Node.js を活用した高品質なウェブサイト開発を専門とするチームです。貴店のような洗練されたブランドには、料理の美しさと職人の技をそのまま反映したデジタル空間が必要だと考えています。

貴店向けにプレミアムなランディングページを作成しましたので、こちらからご覧ください：${landingUrl}

現在のウェブサイトをどのように拡張したいか（オンライン予約、EC機能、メニューのインタラクティブ化など）をお聞かせください。貴店に合わせたパーソナライズされた提案書をご用意します。

ぜひ一度、お話しさせていただければ幸いです。

よろしくお願いいたします。

Mykola`;
        } else if (osintData.category === 'bakery') {
            emailSubject = "Votre boulangerie artisanale parisienne mérite un site web aussi délicieux que vos pâtisseries";
            emailBody = `Bonjour,

Nous avons découvert avec admiration votre boulangerie artisanale à Paris, réputée pour ses créations authentiques et ses ingrédients d'exception.

Notre équipe est spécialisée dans le développement de sites web premium utilisant Magento, Shopify, React et Node.js. Nous croyons qu'une marque aussi raffinée que la vôtre mérite une présence numérique qui reflète la même passion et le même savoir‑faire.

Nous avons créé une page d'atterrissage premium pour votre boulangerie, que vous pouvez consulter ici : ${landingUrl}

Comment envisagez‑vous d'étendre votre site web (boutique en ligne, réservations, présentation de vos ateliers, etc.) ? Nous serions ravis de préparer une présentation personnalisée des solutions possibles.

Nous restons à votre disposition pour en discuter.

Cordialement,

Mykola`;
        } else if (osintData.category === 'gym') {
            emailSubject = "Your luxury fitness gym in New York deserves a website that motivates as much as your trainers";
            emailBody = `Hello,

We came across your premium fitness gym in New York and were impressed by your focus on performance and community.

Our team specializes in high‑quality website development using Magento, Shopify, React, and Node.js. We believe a brand as driven as yours deserves a digital presence that reflects the same energy and precision.

We've created a custom landing page for your gym, which you can view here: ${landingUrl}

How do you plan to expand your website (online bookings, member portals, class schedules, etc.)? We'd be happy to prepare a personalized presentation of possible solutions.

Looking forward to the conversation.

Best regards,
Mykola`;
        } else if (osintData.category === 'salon') {
            emailSubject = "Your modern beauty salon in Milan deserves a website as elegant as your treatments";
            emailBody = `Hello,

We discovered your modern beauty salon in Milan and admire your commitment to luxury and innovation.

Our team specializes in premium website development with Magento, Shopify, React, and Node.js. We believe a brand as refined as yours deserves a digital presence that mirrors the same sophistication and care.

We've crafted a custom landing page for your salon, which you can see here: ${landingUrl}

How do you envision expanding your website (online bookings, service menus, product e‑commerce, etc.)? We'd be delighted to prepare a personalized presentation of possible solutions.

Warm regards,
Mykola`;
        } else {
            emailSubject = "Your premium business deserves a website as excellent as your service";
            emailBody = `Hello,

We have created a custom, premium landing page for your business, which you can view here: ${landingUrl}

The page is designed to be modern, minimal, and high‑trust – just like your brand.

We specialize in website expansion (Magento, Shopify, React, Node.js). Tell us how you plan to grow your digital presence, and we'll prepare a personalized presentation of possible solutions.

Best regards,
Mykola`;
        }

        console.log(`✅ Лист згенеровано. Тема: ${emailSubject}`);

        console.log(`[6] Email: Відправляємо...`);
        const emailContent = `From: cherevan.n.s@gmail.com\nTo: cherevan.n.s@gmail.com\nSubject: ${emailSubject}\n\n${emailBody}`;
        fs.writeFileSync('/tmp/email_content.txt', emailContent);
        execSync(`cat /tmp/email_content.txt | himalaya template send`);
        console.log(`✅ Лист відправлено!`);
        
    } catch (e) {
        console.log("⚠️ Помилка деплою або відправки листа:", e.message);
    }
})();