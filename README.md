# AI Pitch Pipeline: Autonomous B2C Lead Generation

An autonomous OpenClaw-based pipeline that acts as a fully-automated micro-agency. It finds local B2C businesses with poor digital presence, generates ultra-premium, deeply personalized landing pages for them (with working Unsplash images and Alpine.js interactivity), deploys them, and sends a highly-converting cold email or WhatsApp message to the owner.

## How it works

1. **AI Strategist**: Generates a completely random, highly specific B2C niche in a wealthy country (e.g., "premium yacht rental in Monaco").
2. **OSINT Agent**: Finds a real business matching the niche that lacks a modern website. Extracts real reviews, services, and valid contact info (Email or Phone).
3. **Contact Validation**: Validates the found email against DNS MX records to prevent bounces.
4. **Image Curation**: Pulls fresh, highly relevant images via the Unsplash API based on the OSINT context.
5. **Senior Frontend Agent**: Generates an Awwwards-worthy, fully responsive HTML/Tailwind/Alpine.js landing page in the local language of the business.
6. **Deploy Manager**: Deploys the generated landing page to your VPS via SSH/SCP.
7. **Copywriter Agent**: Writes a localized, high-converting cold email or WhatsApp message.
8. **Delivery & Reporting**: Sends the email (via `himalaya`) or generates a WhatsApp click-to-chat link, and pushes a complete report to your Telegram.

## Prerequisites

- Node.js
- [OpenClaw CLI](https://github.com/openclaw/openclaw)
- [Himalaya CLI](https://github.com/soywod/himalaya) (for email delivery)
- SSH access to a VPS for deployment

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
4. Run the pipeline:
   ```bash
   ./pitch.js
   ```

## Running in Batch Mode

To run multiple autonomous pitches in a row (e.g., find and pitch 10 businesses), use the batch script:
```bash
./batch.sh
```

*Note: This pipeline is highly dependent on the `google/gemini-3.1-pro-preview` model via OpenClaw for reasoning and code generation.*
