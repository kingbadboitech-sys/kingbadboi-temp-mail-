# 🥷 KingBadBoi TempMail v3.1

Two-engine disposable email — Guerrilla Mail + Mail.tm.

## Structure
```
kingbadboi-tempmail/
├── server.js          ← Express backend
├── package.json       ← node-fetch v2 (CommonJS)
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Setup
```bash
npm install
npm start        # http://localhost:3000
npm run dev      # auto-reload with nodemon
```

## What's fixed in v3.1
- node-fetch v2 (CommonJS) — no dynamic import errors
- Mail.tm: correct POST /accounts → POST /token flow
- GM: all 8 domains work, random domain per generate
- New US name generated on every single Generate click
- Particles paused when tab hidden (no CPU waste)
- Name fields are read-only (auto-filled, looks natural)
