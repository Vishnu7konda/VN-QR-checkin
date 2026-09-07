# TECHNO SPLURGE 2026 — Gate QR Scanner & Check-In System
**IIC CLUB • MALLA REDDY UNIVERSITY**

A real-time QR scanner and gate entry verification system for TECHNO SPLURGE 2026. This connects directly to your existing Google Sheet (where participant registrations from Google Forms are saved) to verify tickets, prevent duplicate entry, and record attendance timestamps automatically.

---

## 🚀 Quick Features

- **Instant Camera QR Scanner**: Works on any device with a camera (Android Chrome, iPhone/iPad Safari, Laptop webcam, or USB barcode/QR scanner).
- **Match Ticket Format**: Displays Participant Name, Roll Number, Year, Section, and their 3 Selected Arenas (e.g. *CEO for 10 Minutes, Tech Parady, Open Mic*).
- **Duplicate Entry Alert**: If a ticket is scanned a second time, the system flashes a yellow warning with the exact time the participant previously entered.
- **Audio & Visual Alerts**: Distinct positive chime for valid entry, double beep for duplicate scans, and error buzzer for invalid/unpaid tickets.
- **Real-time Attendance Counters**: Live counts of Total Registered, Checked In, and Pending.
- **Manual Search / Fallback**: If a participant's phone screen is cracked or dead, volunteers can type their ID (e.g., `TS26-0003`) to check them in.
- **Works Offline or Live**: Built-in Demo Mode lets you test immediately; adding your Google Apps Script URL switches it to 100% Live Google Sheets sync.

---

## 📋 3-Step Setup with Your Google Sheet

### Step 1: Open Google Sheets Apps Script
1. Open your Google Sheet that contains the participant registration data.
2. In the top menu, click **Extensions** &rarr; **Apps Script**.
3. Clear any existing placeholder code, and copy the entire contents of [`GoogleAppsScript_Backend.gs`](GoogleAppsScript_Backend.gs) into the editor.

### Step 2: Check Column Headers
In the `CONFIG` section at the top of the script, verify that the column names match your sheet. Default supported columns:
- `Registration ID` (e.g., `TS26-0003`)
- `Name` (e.g., `Vishnu`)
- `Roll Number` (e.g., `2411cs030183`)
- `Year` (e.g., `3rd Year`)
- `Section` (e.g., `Gamma`)
- `Arena 1`, `Arena 2`, `Arena 3`
- `Payment Status` (e.g., `₹119 - VERIFIED`)

> *Note: The script automatically creates `Check-in Status`, `Check-in Time`, and `Checked By` columns if they don't already exist.*

### Step 3: Deploy as Web App
1. At the top right of Apps Script, click **Deploy** &rarr; **New deployment**.
2. Click the gear icon (⚙️) next to *Select type* and choose **Web app**.
3. Fill in:
   - **Description**: `Techno Splurge Gate API`
   - **Execute as**: `Me (<your-email>)`
   - **Who has access**: `Anyone` *(Crucial: Allows the scanner web app to query without Google login prompts)*
4. Click **Deploy**, authorize permissions when prompted, and copy the **Web app URL** (ends in `/exec`).
5. Open the scanner web app in your browser, click the ⚙️ (Settings) icon in the top right, paste the URL into the **Google Apps Script Web App URL** field, and click **Save Settings**.

Your gate scanner is now live and synchronized with your Google Sheet!

---

## 💻 Running the Scanner

### Option A: Open directly in your browser
Simply double-click `index.html` to open it in Chrome, Edge, or Safari.

### Option B: Run via a local web server (Recommended for mobile phone access on the same Wi-Fi)
Open PowerShell in this folder and run:
```powershell
# Python 3
python -m http.server 8080
```
Then open:
- On your laptop: `http://localhost:8080`
- On volunteer mobile phones: `http://<your-laptop-ip>:8080`

---

## 🧪 Testing with Demo Tickets

Before connecting to your live sheet, you can test immediately in **Demo Mode**:
1. Click the **"TS26-0003 (Vishnu)"** chip under the scanner or type `TS26-0003` and hit **Check In**.
2. Notice the green **ENTRY VERIFIED** card, participant details matching your ticket, audio chime, and confetti.
3. Click check-in on `TS26-0003` again &rarr; triggers yellow **ALREADY CHECKED IN** warning with the previous check-in time.
4. Try `TS26-9999` &rarr; triggers red **INVALID TICKET** alert.
5. Click **Scan Image File** and choose the screenshot or PDF of the ticket to test camera/file reading.
