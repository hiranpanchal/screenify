# 📺 Screenify — Digital Signage Platform

A self-hosted platform to remotely upload photos and videos and display them as a scheduled slideshow on any screen running a browser.

---

## Features

- **Back Office** — secure login, upload photos/videos, drag-to-reorder
- **Slideshow Settings** — pick transition effect, duration, shuffle, loop, progress bar
- **Schedules** — show specific playlists at specific times and days
- **Display View** — full-screen slideshow at `/display` — just open in a browser on any screen
- **Auto-refresh** — screens poll for changes every 30 seconds (no manual refresh needed)
- **Per-slide duration** — set different display time for each image

---

## Quick Start

### Requirements
- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/screenify.git
cd screenify

# Install all dependencies
npm run install:all
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

### 3. Run in development

From the project root:

```bash
npm run dev
```

This starts:
- Backend API on **http://localhost:4000**
- Frontend on **http://localhost:5173**

### 4. Open the app

| URL | Purpose |
|-----|---------|
| http://localhost:5173/login | Back office login |
| http://localhost:5173/admin/media | Upload & manage media |
| http://localhost:5173/admin/settings | Slideshow settings |
| http://localhost:5173/admin/schedules | Schedule manager |
| http://localhost:5173/display | **Display this on your screens** |

**Default credentials:** `admin` / `admin123`
→ Change your password in the terminal or add a change-password route in the back office.

---

## Using on Real Screens

Point your TV/monitor browser to:
```
http://YOUR_SERVER_IP:5173/display
```

For production, build the frontend and serve it from the backend:

```bash
cd frontend && npm run build
# Then copy dist/ output to backend/public/ and serve it from Express
```

Or deploy to a VPS with:
- Backend: Railway, Render, Fly.io, or any Node.js host
- Set `FRONTEND_URL` in your backend `.env` to your deployed frontend URL

---

## Project Structure

```
screenify/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db/database.js     # SQLite schema + default seed
│   ├── routes/
│   │   ├── auth.js        # Login, JWT
│   │   ├── media.js       # Upload, list, delete, reorder
│   │   ├── settings.js    # Global slideshow settings
│   │   ├── schedules.js   # Schedule CRUD
│   │   └── slideshow.js   # Current playlist resolver (public)
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── uploads/           # Uploaded files (gitignored)
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── AdminLayout.jsx   # Sidebar shell
        │   ├── MediaLibrary.jsx  # Upload + drag-to-reorder grid
        │   ├── SlideshowSettings.jsx
        │   ├── ScheduleManager.jsx
        │   └── Display.jsx       # Full-screen slideshow
        ├── context/AuthContext.jsx
        └── api/client.js
```

---

## Environment Variables

```env
# backend/.env
PORT=4000
JWT_SECRET=your-super-secret-key-change-this
FRONTEND_URL=http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/media` | — | List all media |
| POST | `/api/media/upload` | ✅ | Upload files |
| DELETE | `/api/media/:id` | ✅ | Delete file |
| PUT | `/api/media/:id` | ✅ | Edit name/duration |
| PUT | `/api/media/reorder/bulk` | ✅ | Reorder |
| GET | `/api/settings` | — | Get settings |
| PUT | `/api/settings` | ✅ | Update settings |
| GET | `/api/schedules` | — | List schedules |
| POST | `/api/schedules` | ✅ | Create schedule |
| PUT | `/api/schedules/:id` | ✅ | Update schedule |
| DELETE | `/api/schedules/:id` | ✅ | Delete schedule |
| GET | `/api/slideshow/current` | — | Current playlist (used by display) |

---

## Transition Effects

| Name | Description |
|------|-------------|
| `fade` | Smooth cross-fade (default) |
| `slide` | Slide from right to left |
| `slide-up` | Slide from bottom to top |
| `zoom` | Subtle zoom-in |
| `none` | Instant cut |

---

## Pushing to GitHub

```bash
cd screenify
git init
git add .
git commit -m "Initial commit: Screenify digital signage platform"
git remote add origin https://github.com/YOUR_USERNAME/screenify.git
git push -u origin main
```
