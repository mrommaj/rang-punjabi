# 🎴 Rang Punjabi (Court Piece) Card Game

A real-time multiplayer & single-player Single Page Web App (SPA) for the classic South Asian trick-taking card game **Rang (Court Piece / Coat Pees)**.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 🚀 1-Click Deployment on Render.com

Deploy both the **Static Frontend** and **Real-Time WebSocket Server** for free on Render in under 2 minutes:

### Step-by-Step Instructions:

1. **Push this project to your GitHub account:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Rang Punjabi"
   git remote add origin https://github.com/YOUR_USERNAME/rang-punjabi.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   * Go to **[dashboard.render.com](https://dashboard.render.com)**.
   * Click **New +** → Select **Web Service**.
   * Connect your GitHub repository (`rang-punjabi`).
   * Render will automatically auto-fill settings from `render.yaml`:
     * **Name:** `rang-punjabi-card-game`
     * **Runtime:** `Node`
     * **Build Command:** `npm install`
     * **Start Command:** `node server.js`
     * **Plan:** `Free`
   * Click **Create Web Service**.

3. **Your Live Game URL:**
   * In ~60 seconds, Render will provide a live HTTPS URL:
     `https://rang-punjabi-card-game.onrender.com`
   * Open it on mobile or desktop to play solo or invite friends with room codes!

---

## 🌐 Deploying on Netlify (Static Frontend Only)

If you prefer hosting the front-end on Netlify:
1. Connect your GitHub repository to **[Netlify](https://app.netlify.com)**.
2. Netlify will use the included `netlify.toml` (`public` directory).
3. In the game Settings (⚙️), paste your Render backend URL (`https://your-app.onrender.com`) for real-time multiplayer!
