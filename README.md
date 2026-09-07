# VN QR SCAN 2026 — Event Check-In System
**TECHNO SPLURGE 2026 • MALLA REDDY UNIVERSITY**

A high-performance, real-time QR code scanner and gate attendance verification system. Designed with an Antigravity luxury dark UI, sub-second scanning speed, studio acoustic feedback, and live two-way synchronization with Google Sheets.

---

## ⚡ Key Highlights

- **Antigravity Dark Aesthetic**: Space-grade obsidian interface (`#06080D`), electric indigo specular highlights, and crisp geometric typography.
- **Dual-Mode Operation**:
  - 🚪 **Main Event Gate Entry**: Verifies payment, marks `CHECKED IN`, records entry timestamps, and eliminates duplicate ticket reuse.
  - 🎯 **Arena Attendance**: Coordinators at the 4 activity desks (*CEO for 10 Minutes*, *Tech Parody*, *Open Mic*, *Meme War*) verify arena registration and record `PRESENT` attendance in individual activity logs.
- **Instant Optical & Image Scanning**: Uses device camera (front or back with flash support) or allows drag-and-drop of ticket screenshot/PDF images.
- **Studio Audio Synthesizer**: Built-in multi-harmonic audio feedback (Harmonic Major 9th chime on success, velvet double-pulse on duplicate, deep buzz on error) powered by the Web Audio API — works 100% offline with zero audio files to download.
- **Direct Google Sheets API**: Connects directly to your Google Apps Script Web App without any intermediary servers or third-party paid databases.

---

## 📋 Google Sheet Integration (2 Minutes)

### Step 1: Open Apps Script
1. Open your Google Sheet (**Form Responses 1**).
2. In the top navigation bar, click **Extensions** &rarr; **Apps Script**.
3. Copy and paste the contents of [`GoogleAppsScript_Backend.gs`](GoogleAppsScript_Backend.gs) into the editor.

### Step 2: Deploy Web App
1. At the top right, click **Deploy** &rarr; **New deployment** (or *Manage deployments*).
2. Select type: **Web app**.
3. Configure settings:
   - **Description**: `VN QR SCAN API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` *(Crucial: allows the scanner to verify tickets without Google login prompts)*
4. Click **Deploy** and copy your **Web app URL** (ends in `/exec`).

### Step 3: Connect Scanner
1. Open the scanner web app.
2. Click the ⚙️ **Settings** icon in the top right.
3. Paste the Web App URL and click **Save Settings**.
4. The status badge will show 🟢 **Google Sheets Live**.

---

## 💻 How to Run

### Method 1: Open Locally
Simply double-click `index.html` to open it in Google Chrome, Microsoft Edge, or Safari.

### Method 2: Local HTTP Server (For Mobile Phone Access on Same Wi-Fi)
Open PowerShell or your terminal in this folder:
```powershell
python -m http.server 8080
```
Then open:
- On laptop: `http://localhost:8080`
- On volunteer mobile phones: `http://<YOUR_LAPTOP_IP>:8080`

### Method 3: GitHub Pages
Since this is a clean, static web application, you can enable GitHub Pages in your repository settings under **Settings &rarr; Pages &rarr; Source: main branch**.
