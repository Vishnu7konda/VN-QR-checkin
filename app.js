/**
 * ==============================================================================
 * ANTIGRAVITY CONTROLLER — VN QR SCAN 2026
 * TECHNO SPLURGE GATE & ARENA ATTENDANCE SYSTEM
 * ==============================================================================
 */

// Application State
const state = {
  apiUrl: localStorage.getItem("ts_api_url") || "https://script.google.com/macros/s/AKfycbyxI1_OrOcPZx76WYQ9LSoE7v-dhEQm-1IINWv5B5-m-POJzs11kNSSs6pMMVFBYhJKMw/exec",
  audioEnabled: localStorage.getItem("ts_audio") !== "false",
  autoResume: localStorage.getItem("ts_autoresume") !== "false",
  
  // Active Mode: "gate" (Main Event Gate Entry) or "arena" (Arena Attendance)
  currentMode: "gate",
  activeArena: "CEO for 10 Minutes",
  
  html5QrCode: null,
  isScanning: false,
  currentFacingMode: "environment",
  availableCameras: [],
  currentCameraId: null,
  
  isProcessingScan: false,
  autoResumeTimeout: null,
  
  history: JSON.parse(localStorage.getItem("ts_history") || "[]"),
  
  // Local fallback test records (matches exact ticket structure from Google Sheet)
  demoDatabase: {
    "TS26-0001": {
      registrationId: "TS26-0001",
      name: "Sai Nikhil",
      roll: "2411CS030059",
      email: "sainikhil@example.com",
      phone: "6300725603",
      year: "3rd Year",
      section: "Alpha",
      activities: "CEO for 10 Minutes, Tech Parody, Open Mic",
      arenas: ["CEO for 10 Minutes", "Tech Parody", "Open Mic"],
      paymentStatus: "VERIFIED",
      entryStatus: "NOT CHECKED IN",
      entryTime: "",
      arenaAttendance: {}
    },
    "TS26-0003": {
      registrationId: "TS26-0003",
      name: "Vishnu",
      roll: "2411cs030183",
      email: "vishnu@example.com",
      phone: "9876543210",
      year: "3rd Year",
      section: "Gamma",
      activities: "CEO for 10 Minutes, Tech Parody, Open Mic",
      arenas: ["CEO for 10 Minutes", "Tech Parody", "Open Mic"],
      paymentStatus: "VERIFIED",
      entryStatus: "NOT CHECKED IN",
      entryTime: "",
      arenaAttendance: {}
    },
    "TS26-0004": {
      registrationId: "TS26-0004",
      name: "Ananya Sharma",
      roll: "2411CS030045",
      email: "ananya@example.com",
      phone: "9876543211",
      year: "2nd Year",
      section: "Beta",
      activities: "Tech Parody, Open Mic, Meme War",
      arenas: ["Tech Parody", "Open Mic", "Meme War"],
      paymentStatus: "VERIFIED",
      entryStatus: "CHECKED IN",
      entryTime: "2026-09-07 17:15:00",
      arenaAttendance: { "Tech Parody": "PRESENT" }
    }
  }
};

// DOM Elements
const elements = {
  connectionStatus: document.getElementById("connectionStatus"),
  modeGateBtn: document.getElementById("modeGateBtn"),
  modeArenaBtn: document.getElementById("modeArenaBtn"),
  arenaDropdownWrap: document.getElementById("arenaDropdownWrap"),
  activeArenaSelect: document.getElementById("activeArenaSelect"),
  
  statTotal: document.getElementById("statTotal"),
  statCheckedIn: document.getElementById("statCheckedIn"),
  statPending: document.getElementById("statPending"),
  statCheckedLabel: document.getElementById("statCheckedLabel"),
  
  scannerTitle: document.getElementById("scannerTitle"),
  scannerHint: document.getElementById("scannerHint"),
  qrReader: document.getElementById("qr-reader"),
  scannerOverlay: document.getElementById("scannerOverlay"),
  cameraLoading: document.getElementById("cameraLoading"),
  btnToggleScan: document.getElementById("btnToggleScan"),
  scanBtnIcon: document.getElementById("scanBtnIcon"),
  scanBtnText: document.getElementById("scanBtnText"),
  btnSwitchCamera: document.getElementById("btnSwitchCamera"),
  qrFileInput: document.getElementById("qrFileInput"),
  
  manualEntryForm: document.getElementById("manualEntryForm"),
  manualRegId: document.getElementById("manualRegId"),
  
  resultCard: document.getElementById("resultCard"),
  stateIdle: document.getElementById("stateIdle"),
  stateLoading: document.getElementById("stateLoading"),
  stateResult: document.getElementById("stateResult"),
  loadingRegId: document.getElementById("loadingRegId"),
  
  resultBanner: document.getElementById("resultBanner"),
  bannerIcon: document.getElementById("bannerIcon"),
  bannerTitle: document.getElementById("bannerTitle"),
  bannerSubtitle: document.getElementById("bannerSubtitle"),
  bannerTimestamp: document.getElementById("bannerTimestamp"),
  
  displayRegId: document.getElementById("displayRegId"),
  displayPaymentBadge: document.getElementById("displayPaymentBadge"),
  displayName: document.getElementById("displayName"),
  displayRoll: document.getElementById("displayRoll"),
  displayYearSec: document.getElementById("displayYearSec"),
  displayArenas: document.getElementById("displayArenas"),
  displayCheckinStatus: document.getElementById("displayCheckinStatus"),
  displayCheckinTime: document.getElementById("displayCheckinTime"),
  btnNextScan: document.getElementById("btnNextScan"),
  
  historyTableBody: document.getElementById("historyTableBody"),
  historyCountBadge: document.getElementById("historyCountBadge"),
  historySearch: document.getElementById("historySearch"),
  btnExportCsv: document.getElementById("btnExportCsv"),
  btnClearHistory: document.getElementById("btnClearHistory"),
  
  btnOpenSettings: document.getElementById("btnOpenSettings"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
  settingsModal: document.getElementById("settingsModal"),
  apiUrlInput: document.getElementById("apiUrlInput"),
  audioToggle: document.getElementById("audioToggle"),
  autoResumeToggle: document.getElementById("autoResumeToggle"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  btnTestConnection: document.getElementById("btnTestConnection")
};

// ==============================================================================
// High-Fidelity Audio Synthesizer (Studio Quality Acoustic Feedback)
// ==============================================================================
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playSuccess() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const now = this.ctx.currentTime;
    // Harmonic Major 9th Chord (E5 -> B5 -> G#6 shimmer)
    const tones = [
      { freq: 659.25, start: 0, dur: 0.22, gain: 0.18 },
      { freq: 987.77, start: 0.08, dur: 0.35, gain: 0.22 },
      { freq: 1661.22, start: 0.16, dur: 0.45, gain: 0.14 }
    ];

    tones.forEach(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(t.freq, now + t.start);
      gain.gain.setValueAtTime(t.gain, now + t.start);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur);
    });
  },
  playWarning() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const now = this.ctx.currentTime;
    // Velvet Dual Pulse (Soft amber alert)
    [0, 0.16].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(466.16, now + delay); // Bb4
      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.14);
    });
  },
  playError() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.32);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }
};

// ==============================================================================
// App Initialization
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  initScanner();
  updateStats();
  renderHistory();
  
  // Spacebar quick-reset shortcut
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
      e.preventDefault();
      resetToIdle();
    }
  });
});

function initUI() {
  updateConnectionBadge();
  
  // Mode selection buttons
  elements.modeGateBtn.addEventListener("click", () => switchMode("gate"));
  elements.modeArenaBtn.addEventListener("click", () => switchMode("arena"));
  elements.activeArenaSelect.addEventListener("change", (e) => {
    state.activeArena = e.target.value;
    updateModeUI();
  });

  // Settings modal handlers
  elements.btnOpenSettings.addEventListener("click", () => {
    elements.apiUrlInput.value = state.apiUrl;
    elements.audioToggle.checked = state.audioEnabled;
    elements.autoResumeToggle.checked = state.autoResume;
    elements.settingsModal.style.display = "flex";
  });

  elements.btnCloseSettings.addEventListener("click", () => {
    elements.settingsModal.style.display = "none";
  });

  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.style.display = "none";
    }
  });

  elements.btnSaveSettings.addEventListener("click", saveSettings);
  elements.btnTestConnection.addEventListener("click", testConnection);

  // Manual input form
  elements.manualEntryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rawVal = elements.manualRegId.value.trim();
    if (rawVal) {
      handleRegistrationCode(rawVal);
      elements.manualRegId.value = "";
    }
  });

  elements.btnNextScan.addEventListener("click", resetToIdle);
  elements.btnToggleScan.addEventListener("click", toggleScanning);
  elements.btnSwitchCamera.addEventListener("click", switchCamera);
  elements.qrFileInput.addEventListener("change", handleFileUpload);

  // History controls
  elements.historySearch.addEventListener("input", (e) => filterHistory(e.target.value));
  elements.btnExportCsv.addEventListener("click", exportHistoryCsv);
  elements.btnClearHistory.addEventListener("click", clearHistory);

  // Quick test ID buttons
  document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      handleRegistrationCode(id);
    });
  });
}

function switchMode(mode) {
  state.currentMode = mode;
  if (mode === "gate") {
    elements.modeGateBtn.classList.add("active");
    elements.modeArenaBtn.classList.remove("active");
    elements.arenaDropdownWrap.style.display = "none";
    elements.scannerTitle.textContent = "Main Gate Scanner";
    elements.scannerHint.textContent = "Point camera directly at the participant ticket QR code";
    elements.statCheckedLabel.textContent = "Gate Checked In";
  } else {
    elements.modeGateBtn.classList.remove("active");
    elements.modeArenaBtn.classList.add("active");
    elements.arenaDropdownWrap.style.display = "flex";
    state.activeArena = elements.activeArenaSelect.value;
    elements.scannerTitle.textContent = "Arena Attendance: " + state.activeArena;
    elements.scannerHint.textContent = "Checking arena registration & marking PRESENT";
    elements.statCheckedLabel.textContent = "Arena Attendees";
  }
  updateStats();
  resetToIdle();
}

function updateModeUI() {
  if (state.currentMode === "arena") {
    elements.scannerTitle.textContent = "Arena Attendance: " + state.activeArena;
    updateStats();
  }
}

function updateConnectionBadge() {
  if (state.apiUrl && state.apiUrl.startsWith("http")) {
    elements.connectionStatus.className = "connection-status status-online";
    elements.connectionStatus.querySelector(".status-label").textContent = "Google Sheets Live";
  } else {
    elements.connectionStatus.className = "connection-status status-demo";
    elements.connectionStatus.querySelector(".status-label").textContent = "Demo Mode";
  }
}

// ==============================================================================
// QR Scanner Engine (html5-qrcode)
// ==============================================================================
async function initScanner() {
  elements.cameraLoading.style.display = "flex";

  try {
    const devices = await Html5Qrcode.getCameras();
    if (devices && devices.length) {
      state.availableCameras = devices;
      const backCam = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rear") || 
        d.label.toLowerCase().includes("environment")
      );
      state.currentCameraId = backCam ? backCam.id : devices[0].id;
    }
  } catch (err) {
    console.warn("Could not list camera devices:", err);
  }

  state.html5QrCode = new Html5Qrcode("qr-reader");
  startCamera();
}

function startCamera() {
  elements.cameraLoading.style.display = "flex";
  
  const qrConfig = {
    fps: 15,
    qrbox: { width: 240, height: 240 },
    aspectRatio: 1.0
  };

  const cameraSelector = state.currentCameraId 
    ? { deviceId: { exact: state.currentCameraId } }
    : { facingMode: state.currentFacingMode };

  state.html5QrCode.start(
    cameraSelector,
    qrConfig,
    onScanSuccess,
    onScanFailure
  ).then(() => {
    state.isScanning = true;
    elements.cameraLoading.style.display = "none";
    elements.scannerOverlay.style.display = "flex";
    updateScanButtonUI(true);
  }).catch(err => {
    console.error("Camera start failed:", err);
    elements.cameraLoading.innerHTML = `
      <div style="color: #f43f5e; font-weight: 700; font-size: 0.95rem;">Camera Stream Paused</div>
      <p style="font-size: 0.8rem; text-align: center; padding: 0 20px; color: #94a3b8;">
        Use manual Registration ID entry below or click "Upload QR Image".
      </p>
    `;
    updateScanButtonUI(false);
  });
}

function stopCamera() {
  if (state.html5QrCode && state.isScanning) {
    return state.html5QrCode.stop().then(() => {
      state.isScanning = false;
      elements.scannerOverlay.style.display = "none";
      updateScanButtonUI(false);
    }).catch(err => console.warn("Camera stop error:", err));
  }
  return Promise.resolve();
}

function toggleScanning() {
  if (state.isScanning) {
    stopCamera();
  } else {
    startCamera();
  }
}

async function switchCamera() {
  if (state.availableCameras.length > 1) {
    const currentIndex = state.availableCameras.findIndex(c => c.id === state.currentCameraId);
    const nextIndex = (currentIndex + 1) % state.availableCameras.length;
    state.currentCameraId = state.availableCameras[nextIndex].id;
  } else {
    state.currentFacingMode = state.currentFacingMode === "environment" ? "user" : "environment";
    state.currentCameraId = null;
  }

  await stopCamera();
  startCamera();
}

function updateScanButtonUI(scanning) {
  if (scanning) {
    elements.scanBtnIcon.textContent = "⏸";
    elements.scanBtnText.textContent = "Pause Scanner";
  } else {
    elements.scanBtnIcon.textContent = "▶";
    elements.scanBtnText.textContent = "Resume Scanner";
  }
}

function onScanSuccess(decodedText) {
  if (state.isProcessingScan) return;
  const regId = extractRegId(decodedText);
  if (!regId) return;
  handleRegistrationCode(regId);
}

function onScanFailure(error) {
  // Silent frame non-detections
}

function extractRegId(text) {
  if (!text) return null;
  const clean = text.trim();

  // Pattern: TS26-XXXX
  const tsMatch = clean.match(/TS26-[A-Za-z0-9]+/i);
  if (tsMatch) return tsMatch[0].toUpperCase();

  try {
    const url = new URL(clean);
    const idFromParam = url.searchParams.get("regId") || url.searchParams.get("id");
    if (idFromParam) return idFromParam.trim().toUpperCase();
  } catch (e) {}

  if (clean.length >= 4 && clean.length <= 25 && !clean.includes(" ")) {
    return clean.toUpperCase();
  }

  return clean;
}

async function handleFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    elements.stateIdle.style.display = "none";
    elements.stateResult.style.display = "none";
    elements.stateLoading.style.display = "flex";
    elements.loadingRegId.textContent = "Analyzing QR Image...";

    const decodedText = await state.html5QrCode.scanFile(file, true);
    const regId = extractRegId(decodedText);
    handleRegistrationCode(regId);
  } catch (err) {
    alert("Could not detect a QR code in this image. Please try another image or enter the ID manually.");
    resetToIdle();
  } finally {
    elements.qrFileInput.value = "";
  }
}

// ==============================================================================
// Verification & Check-in Execution
// ==============================================================================
async function handleRegistrationCode(rawId) {
  if (state.isProcessingScan) return;
  state.isProcessingScan = true;

  if (state.autoResumeTimeout) {
    clearTimeout(state.autoResumeTimeout);
  }

  const regId = rawId.trim().toUpperCase();

  elements.stateIdle.style.display = "none";
  elements.stateResult.style.display = "none";
  elements.stateLoading.style.display = "flex";
  elements.loadingRegId.textContent = regId + (state.currentMode === "arena" ? ` (${state.activeArena})` : "");

  try {
    let result;
    if (state.apiUrl && state.apiUrl.startsWith("http")) {
      result = await checkinViaGoogleAppsScript(regId);
    } else {
      result = await checkinViaDemoDatabase(regId);
    }

    displayScanResult(result);
  } catch (err) {
    console.error("Check-in error:", err);
    displayScanResult({
      success: false,
      status: "NETWORK_ERROR",
      regId: regId,
      message: "Could not connect to Google Sheets. Check network or Web App URL."
    });
  }
}

async function checkinViaGoogleAppsScript(regId) {
  const endpoint = new URL(state.apiUrl);
  endpoint.searchParams.set("action", "checkin");
  endpoint.searchParams.set("regId", regId);
  if (state.currentMode === "arena") {
    endpoint.searchParams.set("activity", state.activeArena);
  }

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return await response.json();
}

function checkinViaDemoDatabase(regId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const record = state.demoDatabase[regId];
      const nowFormatted = formatCurrentTimestamp();

      if (!record) {
        resolve({
          success: false,
          status: "NOT_FOUND",
          regId: regId,
          message: "Registration ID not found in records."
        });
        return;
      }

      if (record.paymentStatus && record.paymentStatus.toUpperCase() !== "VERIFIED") {
        resolve({
          success: false,
          status: "PAYMENT_UNVERIFIED",
          regId: regId,
          participant: record,
          message: "Entry denied. Payment is not VERIFIED."
        });
        return;
      }

      // GATE CHECK-IN
      if (state.currentMode === "gate") {
        if (record.entryStatus === "CHECKED IN") {
          resolve({
            success: false,
            status: "ALREADY_CHECKED_IN",
            regId: regId,
            participant: record,
            checkedInAt: record.entryTime || "Earlier",
            message: "ALREADY CHECKED IN.\nDuplicate entry prevented."
          });
          return;
        }

        record.entryStatus = "CHECKED IN";
        record.entryTime = nowFormatted;

        resolve({
          success: true,
          status: "SUCCESS",
          regId: regId,
          participant: record,
          checkedInAt: nowFormatted,
          message: "ENTRY SUCCESSFUL"
        });
        return;
      }

      // ARENA ATTENDANCE
      if (state.currentMode === "arena") {
        const arena = state.activeArena;

        if (record.entryStatus !== "CHECKED IN") {
          resolve({
            success: false,
            status: "NOT_CHECKED_IN_GATE",
            regId: regId,
            participant: record,
            message: "Participant must CHECK IN at the main gate first!"
          });
          return;
        }

        const hasArena = (record.arenas || []).some(a => a.toLowerCase() === arena.toLowerCase());
        if (!hasArena) {
          resolve({
            success: false,
            status: "ACTIVITY_NOT_SELECTED",
            regId: regId,
            participant: record,
            message: `Participant did not register for ${arena}.\nAllowed: ${(record.arenas || []).join(", ")}`
          });
          return;
        }

        if (record.arenaAttendance && record.arenaAttendance[arena] === "PRESENT") {
          resolve({
            success: false,
            status: "ALREADY_PRESENT",
            regId: regId,
            participant: record,
            message: `ALREADY MARKED PRESENT for ${arena}!`
          });
          return;
        }

        if (!record.arenaAttendance) record.arenaAttendance = {};
        record.arenaAttendance[arena] = "PRESENT";

        resolve({
          success: true,
          status: "SUCCESS",
          regId: regId,
          activity: arena,
          participant: record,
          checkedInAt: nowFormatted,
          message: `ACTIVITY ATTENDANCE MARKED: ${arena}`
        });
        return;
      }

    }, 400);
  });
}

// ==============================================================================
// Result Presentation & State Styling
// ==============================================================================
function displayScanResult(result) {
  elements.stateLoading.style.display = "none";
  elements.stateResult.style.display = "flex";

  const nowTime = new Date().toLocaleTimeString();
  elements.bannerTimestamp.textContent = nowTime;

  const p = result.participant || {
    regId: result.regId,
    name: "Unregistered",
    rollNo: "—",
    year: "—",
    section: "—",
    arena1: "—",
    arena2: "—",
    arena3: "—",
    arenas: [],
    paymentStatus: "NOT FOUND"
  };

  const regId = p.registrationId || p.regId || result.regId;
  const rollNo = p.roll || p.rollNo || "—";
  const name = p.name || "Participant";
  const yearSec = `${p.year || "Year"} • ${p.section || "Section"}`;
  const paymentStatus = p.paymentStatus || "VERIFIED";

  // Parse arenas list cleanly
  let arenasList = [];
  if (Array.isArray(p.arenas) && p.arenas.length) {
    arenasList = p.arenas;
  } else if (p.activities) {
    arenasList = String(p.activities).split(",").map(s => s.replace(/^[^\w]+/u, "").trim()).filter(Boolean);
  } else {
    arenasList = [p.arena1, p.arena2, p.arena3].filter(Boolean);
  }

  elements.displayRegId.textContent = regId;
  elements.displayName.textContent = name;
  elements.displayRoll.textContent = rollNo;
  elements.displayYearSec.textContent = yearSec;
  elements.displayPaymentBadge.textContent = paymentStatus;

  // Render Arenas with highlight on active arena
  elements.displayArenas.innerHTML = arenasList.map((arena, idx) => {
    const isCurrentActive = state.currentMode === "arena" && arena.toLowerCase().includes(state.activeArena.toLowerCase());
    return `
      <div class="arena-item" style="${isCurrentActive ? 'border: 1px solid var(--border-brand); background: var(--brand-subtle);' : ''}">
        <span class="arena-num" style="${isCurrentActive ? 'background: var(--brand-primary); color: #fff;' : ''}">${idx + 1}</span>
        <span class="arena-name">${escapeHtml(arena)} ${isCurrentActive ? '★ (Active Desk)' : ''}</span>
      </div>
    `;
  }).join("");

  // Evaluate Status
  if (result.success && result.status === "SUCCESS") {
    // 🟢 SUCCESS
    elements.resultBanner.className = "result-banner banner-success";
    elements.bannerIcon.textContent = "✓";
    
    if (state.currentMode === "gate") {
      elements.bannerTitle.textContent = "MAIN ENTRY VERIFIED";
      elements.bannerSubtitle.textContent = "Registration confirmed & marked CHECKED IN";
      elements.displayCheckinStatus.textContent = "CHECKED IN";
    } else {
      elements.bannerTitle.textContent = "ARENA ATTENDANCE MARKED";
      elements.bannerSubtitle.textContent = `${state.activeArena} • PRESENT`;
      elements.displayCheckinStatus.textContent = `PRESENT (${state.activeArena})`;
    }
    
    elements.displayCheckinStatus.style.color = "var(--emerald-main)";
    elements.displayCheckinTime.textContent = result.checkedInAt || formatCurrentTimestamp();

    SoundFX.playSuccess();
    triggerConfetti();
    addHistoryRecord({
      time: nowTime,
      mode: state.currentMode === "gate" ? "Main Gate" : state.activeArena,
      regId: regId,
      name: name,
      rollNo: rollNo,
      section: p.section,
      arenas: arenasList.join(", "),
      status: state.currentMode === "gate" ? "CHECKED IN" : "PRESENT",
      statusClass: "tag-success"
    });

  } else if (result.status === "ALREADY_CHECKED_IN" || result.status === "ALREADY_PRESENT") {
    // 🟡 WARNING: Duplicate
    elements.resultBanner.className = "result-banner banner-warning";
    elements.bannerIcon.textContent = "⚠️";
    elements.bannerTitle.textContent = result.status === "ALREADY_PRESENT" ? "ALREADY MARKED PRESENT" : "ALREADY CHECKED IN";
    elements.bannerSubtitle.textContent = result.message || `Scanned earlier at ${result.checkedInAt || "Earlier"}`;
    
    elements.displayCheckinStatus.textContent = `DUPLICATE (${result.checkedInAt || "Earlier"})`;
    elements.displayCheckinStatus.style.color = "var(--amber-main)";
    elements.displayCheckinTime.textContent = result.checkedInAt || "Earlier";

    SoundFX.playWarning();
    addHistoryRecord({
      time: nowTime,
      mode: state.currentMode === "gate" ? "Main Gate" : state.activeArena,
      regId: regId,
      name: name,
      rollNo: rollNo,
      section: p.section,
      arenas: arenasList.join(", "),
      status: "DUPLICATE SCAN",
      statusClass: "tag-warning"
    });

  } else {
    // 🔴 ERROR
    elements.resultBanner.className = "result-banner banner-error";
    elements.bannerIcon.textContent = "✕";
    elements.bannerTitle.textContent = result.status === "ACTIVITY_NOT_SELECTED" ? "ARENA NOT REGISTERED" : (result.status === "NOT_CHECKED_IN_GATE" ? "GATE ENTRY REQUIRED" : "ENTRY REJECTED");
    elements.bannerSubtitle.textContent = result.message || "Participant verification failed.";
    
    elements.displayCheckinStatus.textContent = "DENIED";
    elements.displayCheckinStatus.style.color = "var(--rose-main)";
    elements.displayCheckinTime.textContent = "—";

    SoundFX.playError();
    addHistoryRecord({
      time: nowTime,
      mode: state.currentMode === "gate" ? "Main Gate" : state.activeArena,
      regId: regId,
      name: name || "Unknown",
      rollNo: rollNo || "—",
      section: p.section || "—",
      arenas: arenasList.join(", ") || "—",
      status: result.status === "ACTIVITY_NOT_SELECTED" ? "WRONG ARENA" : (result.status === "NOT_CHECKED_IN_GATE" ? "NOT AT GATE" : "REJECTED"),
      statusClass: "tag-error"
    });
  }

  updateStats();

  if (state.autoResume) {
    state.autoResumeTimeout = setTimeout(() => {
      resetToIdle();
    }, 3800);
  }
}

function resetToIdle() {
  if (state.autoResumeTimeout) {
    clearTimeout(state.autoResumeTimeout);
  }
  elements.stateResult.style.display = "none";
  elements.stateLoading.style.display = "none";
  elements.stateIdle.style.display = "flex";
  state.isProcessingScan = false;
  elements.manualRegId.focus();
}

function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.72 },
      colors: ["#059669", "#10b981", "#34d399", "#6ee7b7", "#0f172a"]
    });
  }
}

// ==============================================================================
// Metrics & Log Management
// ==============================================================================
function updateStats() {
  if (state.apiUrl && state.apiUrl.startsWith("http")) {
    fetch(`${state.apiUrl}?action=stats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const tot = data.totalRegistrations !== undefined ? data.totalRegistrations : (data.total || 0);
          const chk = data.checkedIn !== undefined ? data.checkedIn : 0;
          const pnd = data.pendingEntry !== undefined ? data.pendingEntry : (data.pending !== undefined ? data.pending : Math.max(0, tot - chk));
          
          elements.statTotal.textContent = tot;
          elements.statCheckedIn.textContent = chk;
          elements.statPending.textContent = pnd;
        }
      })
      .catch(err => console.warn("Failed to fetch live stats:", err));
  } else {
    const records = Object.values(state.demoDatabase);
    const total = records.length;
    let checkedIn = 0;
    if (state.currentMode === "gate") {
      checkedIn = records.filter(r => r.entryStatus === "CHECKED IN").length;
    } else {
      checkedIn = records.filter(r => r.arenaAttendance && r.arenaAttendance[state.activeArena] === "PRESENT").length;
    }
    elements.statTotal.textContent = total;
    elements.statCheckedIn.textContent = checkedIn;
    elements.statPending.textContent = Math.max(0, total - checkedIn);
  }
}

function addHistoryRecord(record) {
  state.history.unshift(record);
  if (state.history.length > 250) state.history.pop();
  localStorage.setItem("ts_history", JSON.stringify(state.history));
  renderHistory();
}

function renderHistory(filterText = "") {
  elements.historyCountBadge.textContent = `${state.history.length} scans`;
  
  const q = filterText.toLowerCase().trim();
  const filtered = state.history.filter(item => {
    if (!q) return true;
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.regId && item.regId.toLowerCase().includes(q)) ||
      (item.rollNo && item.rollNo.toLowerCase().includes(q)) ||
      (item.mode && item.mode.toLowerCase().includes(q))
    );
  });

  if (!filtered.length) {
    elements.historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">${q ? "No check-ins match your search filter." : "No participants scanned yet. Scanned records will appear here in real time."}</td>
      </tr>
    `;
    return;
  }

  elements.historyTableBody.innerHTML = filtered.map(item => `
    <tr>
      <td class="font-mono">${escapeHtml(item.time)}</td>
      <td><span class="badge" style="background: var(--brand-subtle); color: var(--brand-light); border-color: var(--border-brand);">${escapeHtml(item.mode || "Gate")}</span></td>
      <td class="font-mono font-bold">${escapeHtml(item.regId)}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td class="font-mono">${escapeHtml(item.rollNo)}</td>
      <td>${escapeHtml(item.section)}</td>
      <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.arenas)}">${escapeHtml(item.arenas)}</td>
      <td><span class="status-tag ${item.statusClass}">${escapeHtml(item.status)}</span></td>
    </tr>
  `).join("");
}

function filterHistory(query) {
  renderHistory(query);
}

function clearHistory() {
  if (confirm("Are you sure you want to clear the local scan history? (Google Sheet records will NOT be deleted)")) {
    state.history = [];
    localStorage.removeItem("ts_history");
    renderHistory();
  }
}

function exportHistoryCsv() {
  if (!state.history.length) {
    alert("No history records to export.");
    return;
  }

  const headers = ["Time", "Mode", "Registration ID", "Name", "Roll Number", "Section", "Selected Arenas", "Status"];
  const rows = state.history.map(h => [
    `"${h.time}"`,
    `"${h.mode || 'Gate'}"`,
    `"${h.regId}"`,
    `"${h.name}"`,
    `"${h.rollNo}"`,
    `"${h.section}"`,
    `"${(h.arenas || '').replace(/"/g, '""')}"`,
    `"${h.status}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `VN_QR_Scan_Checkins_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==============================================================================
// Settings Modal & Diagnostic Connections
// ==============================================================================
function saveSettings() {
  state.apiUrl = elements.apiUrlInput.value.trim();
  state.audioEnabled = elements.audioToggle.checked;
  state.autoResume = elements.autoResumeToggle.checked;

  localStorage.setItem("ts_api_url", state.apiUrl);
  localStorage.setItem("ts_audio", String(state.audioEnabled));
  localStorage.setItem("ts_autoresume", String(state.autoResume));

  updateConnectionBadge();
  elements.settingsModal.style.display = "none";
  updateStats();
  alert("Settings saved successfully!");
}

async function testConnection() {
  const testUrl = elements.apiUrlInput.value.trim();
  if (!testUrl) {
    alert("Please enter a Google Apps Script Web App URL first.");
    return;
  }

  elements.btnTestConnection.textContent = "Testing...";
  elements.btnTestConnection.disabled = true;

  try {
    const res = await fetch(`${testUrl}?action=ping`);
    const data = await res.json();
    if (data && data.success) {
      alert("✅ Connection Successful!\nGoogle Sheets API is responsive.");
    } else {
      alert("⚠️ Received unexpected response:\n" + JSON.stringify(data));
    }
  } catch (err) {
    alert("❌ Connection Failed!\nEnsure you deployed the Web App with access set to 'Anyone'. Error: " + err.message);
  } finally {
    elements.btnTestConnection.textContent = "Test Connection";
    elements.btnTestConnection.disabled = false;
  }
}

function formatCurrentTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
