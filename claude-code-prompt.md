# Claude Code Prompt — DDotsMedia Admin Panel (Full-Stack)

Use the following prompt with Claude Code to build a proper backend-powered admin system for the DDotsMedia WhatsApp Groups page.

---

## PROMPT TO PASTE INTO CLAUDE CODE

```
Build a full-stack admin panel for the DDotsMedia WhatsApp Job Groups website.

## Project Overview
DDotsMedia manages 50+ WhatsApp job groups in the UAE. The frontend is a single HTML page
(ddotsmedia-groups.html) that lists all groups with category filters, search, and a WhatsApp
CV submission modal. The admin needs a secure backend panel to add, edit, and delete groups
without touching code.

## Tech Stack
- Backend:  Node.js + Express.js
- Database: SQLite (via better-sqlite3) — simple, no setup needed
- Auth:     JWT tokens (jsonwebtoken) + bcrypt for password hashing
- Frontend: Vanilla JS + existing CSS design system (dark teal theme)
- File:     Single repo, serve frontend as static files from Express

## Project Structure to Create
ddotsmedia/
├── server.js            # Express app entry point
├── db.js                # SQLite setup and queries
├── routes/
│   ├── auth.js          # POST /api/login
│   └── groups.js        # CRUD routes for groups
├── middleware/
│   └── auth.js          # JWT verification middleware
├── public/
│   ├── index.html       # The groups listing page (existing frontend)
│   └── admin.html       # Admin panel SPA
├── package.json
└── .env                 # PORT, JWT_SECRET, ADMIN_PASSWORD_HASH

## Database Schema (SQLite)
Table: groups
- id          INTEGER PRIMARY KEY AUTOINCREMENT
- name        TEXT NOT NULL
- category    TEXT NOT NULL  -- general|location|medical|it|engineering|accounts|hr|sales|teaching|logistics|specialized|community
- description TEXT NOT NULL
- tags        TEXT           -- JSON array stored as string e.g. '["Nursing","ICU"]'
- members     TEXT           -- e.g. "2,500+"
- group_count INTEGER        -- null if single group, number if multiple
- join_link   TEXT           -- WhatsApp invite URL
- is_new      INTEGER        -- 0 or 1 boolean
- sort_order  INTEGER        -- for drag-to-reorder
- created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP

## API Routes Required

### Auth
POST /api/login
  Body: { password: string }
  Returns: { token: string } (JWT, expires 8h)
  Error: 401 if wrong password

### Groups (all require Authorization: Bearer <token> header except GET)
GET    /api/groups          -- returns all groups (public, used by frontend)
POST   /api/groups          -- create new group
PUT    /api/groups/:id      -- update group
DELETE /api/groups/:id      -- delete group
PUT    /api/groups/reorder  -- update sort_order for all groups (body: [{id, sort_order}])

## Admin Panel UI (admin.html)
Design using the same dark teal aesthetic as the main page:
- Colors: background #080f16, primary teal #1a8fa8, text white
- Font: Bricolage Grotesque (headings) + Outfit (body) from Google Fonts

Sections:
1. LOGIN PAGE
   - Centered card with password field + login button
   - Store JWT in sessionStorage (not localStorage for security)
   - Redirect to dashboard on success

2. DASHBOARD HEADER
   - Logo: "DDotsMedia Admin"
   - Stats row: Total Groups | Categories | New Groups
   - Buttons: "+ Add Group", "Logout"

3. GROUPS TABLE
   - Columns: # | Name | Category | Members | Groups | New? | Actions
   - Actions: Edit button (pencil), Delete button (trash)
   - Search bar to filter by name or category
   - Category filter dropdown
   - Drag handles for reordering rows (update sort_order on drop)

4. ADD / EDIT MODAL
   Fields:
   - Group Name (text, required)
   - Category (select dropdown, required)
   - Description (textarea, required)
   - Tags (text input, comma-separated, hint shown)
   - Members (text, e.g. "2,500+")
   - Number of Active Groups (number, optional — shows ⚡ badge on card)
   - Join Link (text, placeholder: uses default entry link if blank)
   - Mark as NEW checkbox
   Save calls POST or PUT depending on mode.

5. DELETE CONFIRMATION
   - Modal with group name, "Are you sure?" and Confirm/Cancel buttons

## Frontend Integration
Modify public/index.html so:
- On page load, fetch groups from GET /api/groups instead of hardcoded JS array
- Render cards dynamically from API response
- Keep all existing features: search, category tabs, join modal, WhatsApp CV flow

## Security Requirements
- Hash admin password with bcrypt (salt rounds: 12) and store hash in .env
- JWT secret minimum 32 chars, stored in .env
- JWT expires in 8 hours
- All write API routes require valid JWT
- Input validation on all POST/PUT fields (name and description required)
- Sanitize inputs to prevent XSS

## Seed Data
On first run, if the groups table is empty, seed it with these initial categories
(just insert 3-4 sample groups so admin can see the UI working immediately).

## Package.json Scripts
- "start": "node server.js"
- "dev": "nodemon server.js"

## Environment Variables (.env.example to create)
PORT=3000
JWT_SECRET=your_secret_key_minimum_32_chars
ADMIN_PASSWORD_HASH=bcrypt_hash_of_your_password

## Instructions
After building:
1. Show how to generate the bcrypt hash for the admin password
2. Show the curl commands to test each API endpoint
3. Explain how to deploy to a VPS or Railway.app

Start by creating the project structure, then implement server.js, db.js, auth route,
groups routes, and finally the admin.html frontend. Make it production-ready.
```

---

## How to Use This Prompt

1. Open **Claude Code** in your terminal: `claude`
2. Create a new folder: `mkdir ddotsmedia && cd ddotsmedia`
3. Paste the above prompt and press Enter
4. Claude Code will scaffold the full project
5. Run `npm install` then `npm run dev`
6. Open `http://localhost:3000/admin.html`

---

## Default Admin Password (change after first login)
The prompt will ask Claude Code to set up bcrypt. Your initial password will be:
`ddotsmedia2026`

Generate the hash by running:
```bash
node -e "const b=require('bcrypt');b.hash('ddotsmedia2026',12).then(h=>console.log(h))"
```
Then paste the hash into your `.env` file.
