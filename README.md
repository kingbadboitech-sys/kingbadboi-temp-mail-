# 🥷 KingBadBoi TempMail v3 — Shadow Ninja

Two-engine disposable email service with real people names and all available domains.

## Engines
- **Guerrilla Mail** — instant, no-account, 8+ domains
- **Mail.tm** — persistent mailbox, real account, 10+ domains

## Project Structure
```
kingbadboi-tempmail/
├── server.js          ← Express backend (all API routes)
├── package.json
└── public/
    ├── index.html     ← Main UI (both pages)
    ├── style.css      ← Full styling
    └── script.js      ← All frontend logic
```

## Setup & Run

```bash
# Install dependencies
npm install

# Start (production)
npm start

# Start (dev with auto-reload)
npm run dev
```

Server runs at: **http://localhost:3000**

## Features
- 🥷 Follow gate (WhatsApp channel lock)
- ⚡ Guerrilla Mail page — all 8 domains, real name username generation
- 🌐 Mail.tm page — all available domains, persistent mailbox
- 👤 Real people first/last names (200+ names from 20+ cultures)
- 🔄 Auto-poll inbox every 5–6 seconds
- 📬 Email viewer with HTML rendering
- 🗑 Delete emails
- 📋 Copy email address
- 👥 Visitor counter
- ✨ Particle animation, glitch effects, scanlines
