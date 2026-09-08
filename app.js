/**
 * ==============================================================================
 * ANTIGRAVITY CONTROLLER — VN QR SCAN 2026
 * MULTI-EVENT GATE & ARENA ATTENDANCE OPERATING SYSTEM
 * ==============================================================================
 */

// Coordinator Access Profiles
const COORDINATORS = {
  vishnu: { id: "vishnu", name: "Vishnu", role: "Lead Coordinator", avatar: "V", badge: "Super Admin", pin: "0904", isSuperAdmin: true },
  nikhil: { id: "nikhil", name: "Sai Nikhil", role: "Arena & Gate Lead", avatar: "N", badge: "Operations Lead", pin: "2402", isSuperAdmin: true }
};

// Multi-Event Registry (Concurrent Events with Separate Google Sheets & Forms)
const DEFAULT_EVENTS = {
  techno_splurge: {
    id: "techno_splurge",
    club: "IIC Club",
    name: "Techno Splurge",
    brandBadge: "IIC CLUB • 2026",
    brandTitle: "IIC CLUB",
    brandSubtitle: "GATE ENTRY & ARENA ATTENDANCE SCANNER",
    prefix: "TS26-",
    apiUrl: localStorage.getItem("ts_api_url_techno_splurge") || "https://script.google.com/macros/s/AKfycbyxI1_OrOcPZx76WYQ9LSoE7v-dhEQm-1IINWv5B5-m-POJzs11kNSSs6pMMVFBYhJKMw/exec",
    gateLabel: "Main Gate Entry",
    arenaModeLabel: "Arena Attendance",
    arenas: ["CEO for 10 Minutes", "Tech Parody", "Open Mic", "Meme War"],
    volunteerPin: "2222",
    isBuiltin: true,
    demoDatabase: {
      "TS26-0001": {
        registrationId: "TS26-0001",
        name: "Sai Nikhil",
        roll: "2411CS030059",
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
        year: "3rd Year",
        section: "Gamma",
        activities: "CEO for 10 Minutes, Tech Parody, Open Mic",
        arenas: ["CEO for 10 Minutes", "Tech Parody", "Open Mic"],
        paymentStatus: "VERIFIED",
        entryStatus: "NOT CHECKED IN",
        entryTime: "",
        arenaAttendance: {}
      }
    }
  }
};

function loadEvents() {
  const saved = localStorage.getItem("vn_events");
  let events = JSON.parse(JSON.stringify(DEFAULT_EVENTS));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      events = Object.assign({}, DEFAULT_EVENTS, parsed);
    } catch (e) {
      console.warn("Failed to parse saved events:", e);
    }
  }
  // Remove legacy events if present in cached local storage
  delete events.shark_tank;
  return events;
}

// Application State
const state = {
  currentUser: null,
  events: loadEvents(),
  activeEventId: localStorage.getItem("vn_active_event") || "techno_splurge",
  apiUrl: "",
  demoDatabase: {},
  audioEnabled: localStorage.getItem("ts_audio") !== "false",
  autoResume: localStorage.getItem("ts_autoresume") !== "false",
  
  // Active Mode: "gate" (Main Event Gate Entry) or "arena" (Arena Attendance)
  currentMode: "gate",
  activeArena: "",
  
  html5QrCode: null,
  isScanning: false,
  currentFacingMode: "environment",
  availableCameras: [],
  currentCameraId: null,
  
  isProcessingScan: false,
  autoResumeTimeout: null,
  history: []
};

// DOM Elements
const elements = {
  appBrandBadge: document.getElementById("appBrandBadge"),
  appBrandTitle: document.getElementById("appBrandTitle"),
  appBrandSubtitle: document.getElementById("appBrandSubtitle"),
  coordinatorBadge: document.getElementById("coordinatorBadge"),
  coordAvatar: document.getElementById("coordAvatar"),
  coordName: document.getElementById("coordName"),
  btnSwitchCoord: document.getElementById("btnSwitchCoord"),
  eventPillsGroup: document.getElementById("eventPillsGroup"),
  btnEventConfigModal: document.getElementById("btnEventConfigModal"),
  
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
  settingsActiveClubTag: document.getElementById("settingsActiveClubTag"),
  settingsActiveEventName: document.getElementById("settingsActiveEventName"),
  apiUrlInput: document.getElementById("apiUrlInput"),
  eventPrefixInput: document.getElementById("eventPrefixInput"),
  eventVolunteerPinInput: document.getElementById("eventVolunteerPinInput"),
  eventSubtitleInput: document.getElementById("eventSubtitleInput"),
  eventArenasInput: document.getElementById("eventArenasInput"),
  audioToggle: document.getElementById("audioToggle"),
  autoResumeToggle: document.getElementById("autoResumeToggle"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  btnTestConnection: document.getElementById("btnTestConnection"),
  tabEventsCount: document.getElementById("tabEventsCount"),
  newClubSelect: document.getElementById("newClubSelect"),
  newClubCustomInput: document.getElementById("newClubCustomInput"),
  newEventNameInput: document.getElementById("newEventNameInput"),
  newApiUrlInput: document.getElementById("newApiUrlInput"),
  newPrefixInput: document.getElementById("newPrefixInput"),
  newVolunteerPinInput: document.getElementById("newVolunteerPinInput"),
  newArenasInput: document.getElementById("newArenasInput"),
  btnCreateNewEvent: document.getElementById("btnCreateNewEvent"),
  manageEventsList: document.getElementById("manageEventsList"),
  btnOpenAddNewTab: document.getElementById("btnOpenAddNewTab"),
  
  coordinatorLoginModal: document.getElementById("coordinatorLoginModal"),
  btnCloseCoordModal: document.getElementById("btnCloseCoordModal"),
  coordSelectionGrid: document.getElementById("coordSelectionGrid"),
  coordinatorLoginForm: document.getElementById("coordinatorLoginForm"),
  coordPinInput: document.getElementById("coordPinInput"),
  btnLoginSubmit: document.getElementById("btnLoginSubmit"),

  btnShareVolunteer: document.getElementById("btnShareVolunteer"),
  shareVolunteerModal: document.getElementById("shareVolunteerModal"),
  btnCloseShareModal: document.getElementById("btnCloseShareModal"),
  shareEventSelect: document.getElementById("shareEventSelect"),
  shareDeskSelect: document.getElementById("shareDeskSelect"),
  volunteerQrImage: document.getElementById("volunteerQrImage"),
  shareLinkPreview: document.getElementById("shareLinkPreview"),
  btnCopyVolunteerLink: document.getElementById("btnCopyVolunteerLink"),
  btnWhatsappShare: document.getElementById("btnWhatsappShare")
};

// ==============================================================================
// High-Fidelity Audio Synthesizer (Studio Quality Acoustic Feedback)
// ==============================================================================
const SoundFX = {
  ctx: null,
  init() {
    try {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  },
  playSuccess() {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;

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
    } catch (e) {
      console.warn("SoundFX playSuccess error:", e);
    }
  },
  playWarning() {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;

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
    } catch (e) {
      console.warn("SoundFX playWarning error:", e);
    }
  },
  playError() {
    if (!state.audioEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;

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
    } catch (e) {
      console.warn("SoundFX playError error:", e);
    }
  }
};

// ==============================================================================
// ==============================================================================
// App Initialization & Coordinator Authentication
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Parse URL query parameters for instant magic link configuration
  const urlParams = new URLSearchParams(window.location.search);
  const paramEvent = urlParams.get("event");
  const paramMode = urlParams.get("mode");
  const paramArena = urlParams.get("arena");
  const paramCoord = urlParams.get("coord");

  // Clean up legacy shark_tank from state
  delete state.events.shark_tank;

  // Synchronize official event naming & API URLs across sessions
  if (state.events.techno_splurge) {
    state.events.techno_splurge.name = "Techno Splurge";
    state.events.techno_splurge.brandBadge = "IIC CLUB • 2026";
    state.events.techno_splurge.brandTitle = "IIC CLUB";
  }

  // Set active event from URL if present
  if (paramEvent && state.events[paramEvent]) {
    state.activeEventId = paramEvent;
  } else if (!state.events[state.activeEventId]) {
    state.activeEventId = "techno_splurge";
  }

  if (paramCoord && COORDINATORS[paramCoord]) {
    const targetCoord = COORDINATORS[paramCoord];
    if (targetCoord.lockedEvent) {
      state.activeEventId = targetCoord.lockedEvent;
    }
    // For volunteer links, clear any previous Super Admin session on this browser
    if (!targetCoord.isSuperAdmin) {
      localStorage.removeItem("vn_coordinator");
      state.currentUser = null;
    }
  }

  initAuth();
  initUI();
  switchEvent(state.activeEventId);

  // Apply desk / mode from URL if provided
  if (paramMode) {
    if (paramMode === "arena" && paramArena) {
      state.activeArena = paramArena;
      if (elements.activeArenaSelect) elements.activeArenaSelect.value = paramArena;
    }
    switchMode(paramMode);
  }

  initScanner();
  
  // Unlock audio context on initial mobile gesture or keyboard interaction
  const unlockAudio = () => {
    SoundFX.init();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
  window.addEventListener("keydown", unlockAudio, { once: true, passive: true });

  // Spacebar and Enter quick-reset shortcut
  window.addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "Enter") && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
      e.preventDefault();
      resetToIdle();
    }
  });
});

function initAuth() {
  const savedCoord = localStorage.getItem("vn_coordinator");
  if (savedCoord) {
    try {
      state.currentUser = JSON.parse(savedCoord);
      updateCoordinatorUI();
      hideLoginModal();
    } catch (e) {
      showLoginModal();
    }
  } else {
    showLoginModal();
  }

  // Profile selection cards in login modal
  if (elements.coordSelectionGrid) {
    elements.coordSelectionGrid.querySelectorAll(".coord-card").forEach(card => {
      card.addEventListener("click", () => {
        elements.coordSelectionGrid.querySelectorAll(".coord-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
      });
    });
  }

  // Login form submission
  if (elements.coordinatorLoginForm) {
    elements.coordinatorLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = elements.coordPinInput.value.trim();
      if (!pin) {
        alert("Please enter your PIN (Default: 2026).");
        return;
      }

      const activeCard = elements.coordSelectionGrid.querySelector(".coord-card.active");
      const coordId = activeCard ? activeCard.dataset.id : "vishnu";
      updateCoordinatorsList();
      const selected = COORDINATORS[coordId] || COORDINATORS.vishnu;

      if (selected.pin && pin !== selected.pin) {
        alert(`Incorrect PIN for ${selected.name}! Please check your credentials.`);
        return;
      }

      state.currentUser = selected;
      localStorage.setItem("vn_coordinator", JSON.stringify(selected));
      
      if (selected.lockedEvent) {
        state.activeEventId = selected.lockedEvent;
        localStorage.setItem("vn_active_event", selected.lockedEvent);
      }
      
      updateCoordinatorUI();
      switchEvent(state.activeEventId);
      hideLoginModal();
    });
  }

  // Switch coordinator button
  if (elements.btnSwitchCoord) {
    elements.btnSwitchCoord.addEventListener("click", showLoginModal);
  }

  // Close / Go Back button on Coordinator Login Modal
  if (elements.btnCloseCoordModal) {
    elements.btnCloseCoordModal.addEventListener("click", hideLoginModal);
  }

  // Backdrop click to close login modal
  if (elements.coordinatorLoginModal) {
    elements.coordinatorLoginModal.addEventListener("click", (e) => {
      if (e.target === elements.coordinatorLoginModal) {
        hideLoginModal();
      }
    });
  }
}

function updateCoordinatorsList() {
  if (!COORDINATORS.vishnu) {
    COORDINATORS.vishnu = { id: "vishnu", name: "Vishnu", role: "Lead Coordinator", avatar: "V", badge: "Super Admin", pin: "0904", isSuperAdmin: true };
  } else {
    COORDINATORS.vishnu.pin = "0904";
  }
  if (!COORDINATORS.nikhil) {
    COORDINATORS.nikhil = { id: "nikhil", name: "Sai Nikhil", role: "Arena & Gate Lead", avatar: "N", badge: "Operations Lead", pin: "2402", isSuperAdmin: true };
  } else {
    COORDINATORS.nikhil.name = "Sai Nikhil";
    COORDINATORS.nikhil.pin = "2402";
  }

  // Dynamically ensure volunteer profiles exist for all club events
  Object.keys(state.events).forEach(evId => {
    const ev = state.events[evId];
    const coordKey = `volunteer_${evId}`;
    COORDINATORS[coordKey] = {
      id: coordKey,
      name: `${ev.name} Staff`,
      role: `Event Staff (${ev.club || "Club"})`,
      avatar: "🎯",
      badge: `${ev.club || "Event"} Staff`,
      pin: ev.volunteerPin || "1111",
      lockedEvent: evId,
      isSuperAdmin: false
    };
  });
}

function showLoginModal() {
  if (!elements.coordinatorLoginModal) return;

  const urlParams = new URLSearchParams(window.location.search);
  const paramCoord = urlParams.get("coord");
  const paramEvent = urlParams.get("event") || state.activeEventId;

  updateCoordinatorsList();

  // Determine if this is a restricted volunteer context
  const isVolunteerParam = paramCoord && paramCoord.startsWith("volunteer_");
  const isVolunteerUser = state.currentUser && !state.currentUser.isSuperAdmin;
  const isVolunteerContext = isVolunteerParam || isVolunteerUser;

  const modalTitle = elements.coordinatorLoginModal.querySelector(".login-title");
  const modalDesc = elements.coordinatorLoginModal.querySelector(".login-desc");

  if (isVolunteerContext) {
    const activeEv = state.events[paramEvent] || state.events[state.activeEventId];
    if (modalTitle) modalTitle.textContent = `${activeEv ? activeEv.name : "Volunteer"} Checkpoint`;
    if (modalDesc) modalDesc.textContent = "Enter your volunteer staff access PIN to operate the scanner.";
  } else {
    if (modalTitle) modalTitle.textContent = "Coordinator Login Portal";
    if (modalDesc) modalDesc.textContent = "Select your coordinator identity to operate the scanner and stamp verified check-ins.";
  }

  // Render cards dynamically
  if (elements.coordSelectionGrid) {
    let cardsHtml = "";
    if (!isVolunteerContext) {
      cardsHtml += `
        <div class="coord-card active" data-id="vishnu" data-name="Vishnu" data-role="Lead Coordinator">
          <div class="coord-avatar-large">V</div>
          <div class="coord-details">
            <strong>Vishnu</strong>
            <span class="coord-role-text">Lead Coordinator</span>
          </div>
          <span class="coord-pill-tag tag-lead">Super Admin</span>
        </div>

        <div class="coord-card" data-id="nikhil" data-name="Sai Nikhil" data-role="Arena & Gate Lead">
          <div class="coord-avatar-large avatar-nikhil">N</div>
          <div class="coord-details">
            <strong>Sai Nikhil</strong>
            <span class="coord-role-text">Arena & Gate Lead</span>
          </div>
          <span class="coord-pill-tag tag-ops">Operations Lead</span>
        </div>
      `;
    }

    // Determine which volunteer profile(s) to render
    let targetEventIds = [];
    if (isVolunteerContext) {
      if (paramCoord && paramCoord.startsWith("volunteer_")) {
        const evId = paramCoord.replace("volunteer_", "");
        if (state.events[evId]) targetEventIds = [evId];
      } else if (state.currentUser && state.currentUser.lockedEvent && state.events[state.currentUser.lockedEvent]) {
        targetEventIds = [state.currentUser.lockedEvent];
      } else if (state.events[paramEvent]) {
        targetEventIds = [paramEvent];
      } else {
        targetEventIds = [state.activeEventId];
      }
    } else {
      // Super admin can see current event's volunteer
      if (state.events[paramEvent]) {
        targetEventIds = [paramEvent];
      } else {
        targetEventIds = Object.keys(state.events);
      }
    }

    targetEventIds.forEach((evId, idx) => {
      const ev = state.events[evId];
      if (!ev) return;
      const coordKey = `volunteer_${evId}`;
      const isActive = isVolunteerContext ? (idx === 0) : false;
      cardsHtml += `
        <div class="coord-card ${isActive ? 'active' : ''}" data-id="${coordKey}" data-name="${escapeHtml(ev.name)} Staff" data-role="Event Staff">
          <div class="coord-avatar-large avatar-volunteer" style="background: linear-gradient(135deg, #059669, #10b981);">🎯</div>
          <div class="coord-details">
            <strong>Volunteer: ${escapeHtml(ev.name)}</strong>
            <span class="coord-role-text">${escapeHtml(ev.club || 'Event Staff')} Only</span>
          </div>
          <span class="coord-pill-tag tag-lead">Staff Access</span>
        </div>
      `;
    });

    elements.coordSelectionGrid.innerHTML = cardsHtml;

    elements.coordSelectionGrid.querySelectorAll(".coord-card").forEach(card => {
      card.addEventListener("click", () => {
        elements.coordSelectionGrid.querySelectorAll(".coord-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
      });
    });

    // Reset PIN input
    if (elements.coordPinInput) {
      elements.coordPinInput.value = "";
    }
  }

  elements.coordinatorLoginModal.style.display = "flex";
}

function hideLoginModal() {
  if (elements.coordinatorLoginModal) {
    elements.coordinatorLoginModal.style.display = "none";
  }
}

function updateCoordinatorUI() {
  if (state.currentUser) {
    if (elements.coordName) elements.coordName.textContent = state.currentUser.name;
    if (elements.coordAvatar) elements.coordAvatar.textContent = state.currentUser.avatar || state.currentUser.name[0];
    
    // Role-Based Isolation: Only Super Admins see all events and configuration
    const isSuper = !!state.currentUser.isSuperAdmin;
    const eventSwitcherNav = document.querySelector(".event-switcher-nav");
    if (eventSwitcherNav) {
      eventSwitcherNav.style.display = isSuper ? "flex" : "none";
    }
    if (elements.btnOpenSettings) {
      elements.btnOpenSettings.style.display = isSuper ? "inline-flex" : "none";
    }
    if (elements.btnShareVolunteer) {
      elements.btnShareVolunteer.style.display = isSuper ? "inline-flex" : "none";
    }
    if (elements.btnClearHistory) {
      elements.btnClearHistory.style.display = isSuper ? "inline-flex" : "none";
    }
  }
}

function initUI() {
  updateConnectionBadge();
  renderEventPills();

  // Volunteer Share modal handlers
  if (elements.btnShareVolunteer) {
    elements.btnShareVolunteer.addEventListener("click", openShareVolunteerModal);
  }
  if (elements.btnCloseShareModal) {
    elements.btnCloseShareModal.addEventListener("click", () => {
      elements.shareVolunteerModal.style.display = "none";
    });
  }
  if (elements.shareVolunteerModal) {
    elements.shareVolunteerModal.addEventListener("click", (e) => {
      if (e.target === elements.shareVolunteerModal) {
        elements.shareVolunteerModal.style.display = "none";
      }
    });
  }
  if (elements.shareEventSelect) {
    elements.shareEventSelect.addEventListener("change", () => {
      populateShareDesks();
      updateShareVolunteerModalContent();
    });
  }
  if (elements.shareDeskSelect) {
    elements.shareDeskSelect.addEventListener("change", updateShareVolunteerModalContent);
  }
  if (elements.btnCopyVolunteerLink) {
    elements.btnCopyVolunteerLink.addEventListener("click", copyVolunteerLink);
  }
  if (elements.btnWhatsappShare) {
    elements.btnWhatsappShare.addEventListener("click", shareWhatsapp);
  }

  // Mode selection buttons
  elements.modeGateBtn.addEventListener("click", () => switchMode("gate"));
  elements.modeArenaBtn.addEventListener("click", () => switchMode("arena"));
  elements.activeArenaSelect.addEventListener("change", (e) => {
    state.activeArena = e.target.value;
    updateModeUI();
  });

  // Settings modal handlers
  elements.btnOpenSettings.addEventListener("click", openSettingsForActiveEvent);

  elements.btnCloseSettings.addEventListener("click", () => {
    elements.settingsModal.style.display = "none";
  });

  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.style.display = "none";
    }
  });

  // Modal tab navigation
  const tabButtons = elements.settingsModal ? elements.settingsModal.querySelectorAll(".modal-tab-btn") : [];
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      switchSettingsTab(tabId);
    });
  });

  if (elements.btnOpenAddNewTab) {
    elements.btnOpenAddNewTab.addEventListener("click", () => switchSettingsTab("tabAddEvent"));
  }

  // Add new club custom input toggle
  if (elements.newClubSelect) {
    elements.newClubSelect.addEventListener("change", (e) => {
      if (elements.newClubCustomInput) {
        elements.newClubCustomInput.style.display = e.target.value === "__new__" ? "block" : "none";
        if (e.target.value === "__new__") elements.newClubCustomInput.focus();
      }
    });
  }

  // Create new event button
  if (elements.btnCreateNewEvent) {
    elements.btnCreateNewEvent.addEventListener("click", handleCreateNewEvent);
  }

  elements.btnSaveSettings.addEventListener("click", saveSettings);
  elements.btnTestConnection.addEventListener("click", testConnection);

  // Manual input form
  elements.manualEntryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rawVal = elements.manualRegId.value.trim();
    if (rawVal) {
      const extracted = extractRegId(rawVal);
      handleRegistrationCode(extracted || rawVal);
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
}

function switchEvent(eventId) {
  if (!state.events[eventId]) return;
  // If user is a volunteer with a locked event, prevent switching to other events
  if (state.currentUser && !state.currentUser.isSuperAdmin && state.currentUser.lockedEvent && state.currentUser.lockedEvent !== eventId) {
    eventId = state.currentUser.lockedEvent;
  }
  state.activeEventId = eventId;
  localStorage.setItem("vn_active_event", eventId);

  const ev = state.events[eventId];
  state.apiUrl = ev.apiUrl || "";
  state.demoDatabase = ev.demoDatabase || {};

  // Update branding
  if (elements.appBrandBadge) elements.appBrandBadge.textContent = ev.brandBadge;
  if (elements.appBrandTitle) elements.appBrandTitle.textContent = ev.brandTitle;
  if (elements.appBrandSubtitle) elements.appBrandSubtitle.textContent = ev.brandSubtitle;

  // Update pills UI
  if (elements.eventPillsGroup) {
    elements.eventPillsGroup.querySelectorAll(".event-pill").forEach(pill => {
      if (pill.dataset.event === eventId) {
        pill.classList.add("active");
      } else if (pill.dataset.event) {
        pill.classList.remove("active");
      }
    });
  }

  // Update activity dropdown
  if (elements.activeArenaSelect && ev.arenas) {
    elements.activeArenaSelect.innerHTML = ev.arenas.map((a, i) => 
      `<option value="${escapeHtml(a)}">${i + 1}. ${escapeHtml(a)}</option>`
    ).join("");
    state.activeArena = ev.arenas[0] || "Round 1";
  }

  // Update quick test chip IDs for this event
  const sampleGroup = document.querySelector(".sample-chip-group");
  if (sampleGroup) {
    const keys = Object.keys(state.demoDatabase);
    const chipsHtml = keys.slice(0, 2).map(k => {
      const rec = state.demoDatabase[k];
      return `<button class="chip-btn" data-id="${k}" type="button">${k} (${rec.name})</button>`;
    }).join("") + `<button class="chip-btn" data-id="${ev.prefix}9999" type="button">${ev.prefix}9999 (Invalid)</button>`;

    sampleGroup.innerHTML = `<span class="sample-label">Quick test IDs:</span> ${chipsHtml}`;
    sampleGroup.querySelectorAll(".chip-btn").forEach(btn => {
      btn.addEventListener("click", () => handleRegistrationCode(btn.getAttribute("data-id")));
    });
  }

  // Load isolated history for this event!
  state.history = JSON.parse(localStorage.getItem(`ts_history_${eventId}`) || "[]");
  renderHistory();
  updateConnectionBadge();
  switchMode(state.currentMode);
}

function switchMode(mode) {
  state.currentMode = mode;
  const ev = state.events[state.activeEventId] || DEFAULT_EVENTS.techno_splurge;

  if (mode === "gate") {
    elements.modeGateBtn.classList.add("active");
    elements.modeArenaBtn.classList.remove("active");
    elements.arenaDropdownWrap.style.display = "none";
    elements.scannerTitle.textContent = `${ev.name}: Gate Scanner`;
    elements.scannerHint.textContent = `Point camera directly at the participant ticket QR code (${ev.prefix}...)`;
    elements.statCheckedLabel.textContent = "Gate Checked In";
  } else {
    elements.modeGateBtn.classList.remove("active");
    elements.modeArenaBtn.classList.add("active");
    elements.arenaDropdownWrap.style.display = "flex";
    state.activeArena = elements.activeArenaSelect.value;
    elements.scannerTitle.textContent = `${state.activeArena} Attendance`;
    elements.scannerHint.textContent = `Verifying participant registration & marking PRESENT`;
    elements.statCheckedLabel.textContent = "Round Attendees";
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
let isCameraTransitioning = false;
let lastScannedCode = null;
let lastScannedTimestamp = 0;
const DUPLICATE_COOLDOWN_MS = 3200;

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

  try {
    state.html5QrCode = new Html5Qrcode("qr-reader");
    await startCamera();
  } catch (err) {
    console.error("Html5Qrcode initialization error:", err);
  }
}

async function startCamera() {
  if (isCameraTransitioning) return;
  isCameraTransitioning = true;
  elements.cameraLoading.style.display = "flex";
  
  const qrConfig = {
    fps: 15,
    qrbox: { width: 240, height: 240 },
    aspectRatio: 1.0
  };

  const cameraSelector = state.currentCameraId 
    ? { deviceId: { exact: state.currentCameraId } }
    : { facingMode: state.currentFacingMode };

  try {
    await state.html5QrCode.start(
      cameraSelector,
      qrConfig,
      onScanSuccess,
      onScanFailure
    );
    state.isScanning = true;
    elements.cameraLoading.style.display = "none";
    elements.scannerOverlay.style.display = "flex";
    updateScanButtonUI(true);
  } catch (err) {
    console.warn("Camera start failed with primary selector, attempting fallback...", err);
    if (state.currentCameraId) {
      state.currentCameraId = null;
      try {
        await state.html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          onScanSuccess,
          onScanFailure
        );
        state.isScanning = true;
        elements.cameraLoading.style.display = "none";
        elements.scannerOverlay.style.display = "flex";
        updateScanButtonUI(true);
        return;
      } catch (fallbackErr) {
        console.error("Camera fallback start failed:", fallbackErr);
      }
    }
    elements.cameraLoading.innerHTML = `
      <div style="color: #e11d48; font-weight: 700; font-size: 0.95rem;">Camera Stream Paused</div>
      <p style="font-size: 0.8rem; text-align: center; padding: 0 20px; color: #64748b;">
        Use manual Registration ID entry below or click "Upload QR Image".
      </p>
    `;
    updateScanButtonUI(false);
  } finally {
    isCameraTransitioning = false;
  }
}

async function stopCamera() {
  if (!state.html5QrCode) return;
  try {
    const isRunning = state.isScanning || (state.html5QrCode.getState && state.html5QrCode.getState() === 2);
    if (isRunning) {
      await state.html5QrCode.stop();
    }
  } catch (err) {
    console.warn("Camera stop error:", err);
  } finally {
    state.isScanning = false;
    elements.scannerOverlay.style.display = "none";
    updateScanButtonUI(false);
  }
}

async function toggleScanning() {
  if (isCameraTransitioning) return;
  if (state.isScanning) {
    await stopCamera();
  } else {
    await startCamera();
  }
}

async function switchCamera() {
  if (isCameraTransitioning) return;
  if (state.availableCameras.length > 1) {
    const currentIndex = state.availableCameras.findIndex(c => c.id === state.currentCameraId);
    const nextIndex = (currentIndex + 1) % state.availableCameras.length;
    state.currentCameraId = state.availableCameras[nextIndex].id;
  } else {
    state.currentFacingMode = state.currentFacingMode === "environment" ? "user" : "environment";
    state.currentCameraId = null;
  }

  await stopCamera();
  await startCamera();
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

  const now = Date.now();
  if (regId === lastScannedCode && (now - lastScannedTimestamp) < DUPLICATE_COOLDOWN_MS) {
    return; // Prevent repetitive triggers while user holds phone steady
  }

  lastScannedCode = regId;
  lastScannedTimestamp = now;
  handleRegistrationCode(regId);
}

function onScanFailure(error) {
  // Silent frame non-detections
}

function extractRegId(text) {
  if (!text) return null;
  const clean = text.trim();

  // 1. JSON payload support: {"regId":"TS26-0001"} or {"id":"TS26-0001"}
  if (clean.startsWith("{") && clean.endsWith("}")) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === "object") {
        const candidate = parsed.regId || parsed.registrationId || parsed.id || parsed.ticketId || parsed.ticket;
        if (candidate) return String(candidate).trim().toUpperCase();
      }
    } catch (e) {}
  }

  // 2. Standard Pattern: TS26-XXXX or TS2026-XXXX or TS-XXXX
  const tsMatch = clean.match(/TS(26|2026)?-[A-Za-z0-9]+/i);
  if (tsMatch) return tsMatch[0].toUpperCase();

  // 3. URL query parameters
  try {
    const url = new URL(clean);
    const idFromParam = url.searchParams.get("regId") || 
                        url.searchParams.get("id") || 
                        url.searchParams.get("ticket") || 
                        url.searchParams.get("code") ||
                        url.searchParams.get("registrationId");
    if (idFromParam) return idFromParam.trim().toUpperCase();

    // Check last path segment: e.g. https://domain.com/ticket/TS26-0001
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const match = last.match(/TS(26|2026)?-[A-Za-z0-9]+/i);
      if (match) return match[0].toUpperCase();
    }
  } catch (e) {}

  // 4. Standalone registration token without whitespace
  if (clean.length >= 4 && clean.length <= 30 && !clean.includes(" ")) {
    return clean.toUpperCase();
  }

  return clean.toUpperCase();
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
      message: err.message || "Could not connect to Google Sheets. Check network or Web App URL."
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

  // 12-second AbortController timeout to prevent infinite UI hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google Sheets HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out (12s). Google Sheets is taking longer to respond. Please scan again.");
    }
    throw err;
  }
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
      scannedBy: state.currentUser ? state.currentUser.name : "Vishnu",
      mode: state.currentMode === "gate" ? "Gate Entry" : state.activeArena,
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
      scannedBy: state.currentUser ? state.currentUser.name : "Vishnu",
      mode: state.currentMode === "gate" ? "Gate Entry" : state.activeArena,
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
    elements.bannerTitle.textContent = result.status === "ACTIVITY_NOT_SELECTED" ? "ROUND NOT REGISTERED" : (result.status === "NOT_CHECKED_IN_GATE" ? "GATE ENTRY REQUIRED" : "ENTRY REJECTED");
    elements.bannerSubtitle.textContent = result.message || "Participant verification failed.";
    
    elements.displayCheckinStatus.textContent = "DENIED";
    elements.displayCheckinStatus.style.color = "var(--rose-main)";
    elements.displayCheckinTime.textContent = "—";

    SoundFX.playError();
    addHistoryRecord({
      time: nowTime,
      scannedBy: state.currentUser ? state.currentUser.name : "Vishnu",
      mode: state.currentMode === "gate" ? "Gate Entry" : state.activeArena,
      regId: regId,
      name: name || "Unknown",
      rollNo: rollNo || "—",
      section: p.section || "—",
      arenas: arenasList.join(", ") || "—",
      status: result.status === "ACTIVITY_NOT_SELECTED" ? "WRONG ROUND" : (result.status === "NOT_CHECKED_IN_GATE" ? "NOT AT GATE" : "REJECTED"),
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
  lastScannedCode = null;
  lastScannedTimestamp = 0;
  if (elements.manualRegId) {
    elements.manualRegId.focus();
  }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(`${state.apiUrl}?action=stats`, { signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          const tot = data.totalRegistrations !== undefined ? data.totalRegistrations : (data.total || 0);
          const chk = data.checkedIn !== undefined ? data.checkedIn : 0;
          const pnd = data.pendingEntry !== undefined ? data.pendingEntry : (data.pending !== undefined ? data.pending : Math.max(0, tot - chk));
          
          if (elements.statTotal) elements.statTotal.textContent = tot;
          if (elements.statCheckedIn) elements.statCheckedIn.textContent = chk;
          if (elements.statPending) elements.statPending.textContent = pnd;
        }
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.warn("Failed to fetch live stats:", err.message);
      });
  } else {
    const records = Object.values(state.demoDatabase);
    const total = records.length;
    let checkedIn = 0;
    if (state.currentMode === "gate") {
      checkedIn = records.filter(r => r.entryStatus === "CHECKED IN").length;
    } else {
      checkedIn = records.filter(r => r.arenaAttendance && r.arenaAttendance[state.activeArena] === "PRESENT").length;
    }
    if (elements.statTotal) elements.statTotal.textContent = total;
    if (elements.statCheckedIn) elements.statCheckedIn.textContent = checkedIn;
    if (elements.statPending) elements.statPending.textContent = Math.max(0, total - checkedIn);
  }
}

function addHistoryRecord(record) {
  state.history.unshift(record);
  if (state.history.length > 250) state.history.pop();
  localStorage.setItem(`ts_history_${state.activeEventId}`, JSON.stringify(state.history));
  renderHistory();
}

function renderHistory(filterText = "") {
  if (elements.historyCountBadge) {
    elements.historyCountBadge.textContent = `${state.history.length} scans`;
  }
  
  const q = filterText.toLowerCase().trim();
  const filtered = state.history.filter(item => {
    if (!q) return true;
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.regId && item.regId.toLowerCase().includes(q)) ||
      (item.rollNo && item.rollNo.toLowerCase().includes(q)) ||
      (item.mode && item.mode.toLowerCase().includes(q)) ||
      (item.scannedBy && item.scannedBy.toLowerCase().includes(q))
    );
  });

  if (!elements.historyTableBody) return;

  if (!filtered.length) {
    elements.historyTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">${q ? "No check-ins match your search filter." : "No participants scanned yet. Scanned records will appear here in real time."}</td>
      </tr>
    `;
    return;
  }

  elements.historyTableBody.innerHTML = filtered.map(item => {
    const rawMode = (item.mode || "Gate Entry").trim();
    const isGate = rawMode === "gate" || rawMode === "Gate Entry" || rawMode === "Main Event Gate Entry";
    const modeClass = isGate ? "mode-gate" : "mode-arena";
    const modeText = isGate ? "Gate Entry" : rawMode;

    return `
    <tr>
      <td class="font-mono">${escapeHtml(item.time || '—')}</td>
      <td class="font-mono font-bold" style="color: var(--emerald-primary);">${escapeHtml(item.scannedBy || 'Vishnu')}</td>
      <td><span class="mode-badge ${modeClass}">${escapeHtml(modeText)}</span></td>
      <td class="font-mono font-bold">${escapeHtml(item.regId || '—')}</td>
      <td><strong>${escapeHtml(item.name || 'Participant')}</strong></td>
      <td class="font-mono">${escapeHtml(item.rollNo || '—')}</td>
      <td>${escapeHtml(item.section || '—')}</td>
      <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.arenas || '—')}">${escapeHtml(item.arenas || '—')}</td>
      <td><span class="status-tag ${item.statusClass || 'tag-success'}">${escapeHtml(item.status || 'CHECKED IN')}</span></td>
    </tr>
  `;
  }).join("");
}

function filterHistory(query) {
  renderHistory(query);
}

function clearHistory() {
  if (confirm(`Are you sure you want to clear scan history for ${state.events[state.activeEventId]?.name || 'this event'}? (Google Sheet records will NOT be deleted)`)) {
    state.history = [];
    localStorage.removeItem(`ts_history_${state.activeEventId}`);
    renderHistory();
  }
}

function exportHistoryCsv() {
  if (!state.history.length) {
    alert("No history records to export for this event.");
    return;
  }

  const headers = ["Time", "Scanned By", "Mode", "Registration ID", "Name", "Roll / Team", "Section / Track", "Selected Arenas", "Status"];
  const rows = state.history.map(h => [
    `"${h.time || ''}"`,
    `"${h.scannedBy || 'Vishnu'}"`,
    `"${h.mode || 'Gate'}"`,
    `"${h.regId || ''}"`,
    `"${(h.name || '').replace(/"/g, '""')}"`,
    `"${h.rollNo || ''}"`,
    `"${h.section || ''}"`,
    `"${(h.arenas || '').replace(/"/g, '""')}"`,
    `"${h.status || ''}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${state.activeEventId}_Checkins_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==============================================================================
// Multi-Club & Dynamic Event Management
// ==============================================================================
function switchSettingsTab(tabId) {
  if (!elements.settingsModal) return;
  elements.settingsModal.querySelectorAll(".modal-tab-btn").forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  elements.settingsModal.querySelectorAll(".tab-pane").forEach(pane => {
    pane.style.display = (pane.id === tabId) ? "flex" : "none";
  });

  if (tabId === "tabManageEvents") {
    renderManageEventsList();
  } else if (tabId === "tabAddEvent") {
    populateClubSelect();
  }
}

function renderEventPills() {
  if (!elements.eventPillsGroup) return;

  let pillsHtml = "";
  Object.keys(state.events).forEach(id => {
    const ev = state.events[id];
    const isActive = id === state.activeEventId;
    const badgeText = ev.prefix ? ev.prefix.replace(/[^A-Za-z0-9]/g, "").slice(0, 5) : "EV";
    const clubShort = ev.club ? ev.club.replace(" Club", "") : "";
    const displayName = clubShort ? `${clubShort}: ${ev.name}` : ev.name;

    pillsHtml += `
      <button class="event-pill ${isActive ? 'active' : ''}" data-event="${id}" type="button" title="${escapeHtml(ev.club || '')} — ${escapeHtml(ev.name)}">
        <span class="pill-dot"></span>
        <span class="pill-title">${escapeHtml(displayName)}</span>
        <span class="pill-badge">${escapeHtml(badgeText)}</span>
      </button>
    `;
  });

  pillsHtml += `
    <button id="btnEventConfigModal" class="event-pill pill-add" type="button" title="Configure Events & Add Google Form Sheets">
      <span>⚙️ Event Sheets</span>
    </button>
  `;

  elements.eventPillsGroup.innerHTML = pillsHtml;

  elements.eventPillsGroup.querySelectorAll(".event-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const evId = pill.dataset.event;
      if (evId) {
        switchEvent(evId);
      }
    });
  });

  const btnConfig = document.getElementById("btnEventConfigModal");
  if (btnConfig) {
    btnConfig.addEventListener("click", openSettingsForActiveEvent);
  }
}

function populateClubSelect() {
  if (!elements.newClubSelect) return;
  const clubs = new Set(["IIC Club"]);
  Object.values(state.events).forEach(ev => {
    if (ev.club && !ev.isBuiltin) clubs.add(ev.club);
  });

  let html = "";
  clubs.forEach(c => {
    html += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
  });
  html += `<option value="__new__">➕ Add New Club / Organization...</option>`;
  elements.newClubSelect.innerHTML = html;
  if (elements.newClubCustomInput) {
    elements.newClubCustomInput.style.display = "none";
    elements.newClubCustomInput.value = "";
  }
}

function renderManageEventsList() {
  if (!elements.manageEventsList) return;
  const count = Object.keys(state.events).length;
  if (elements.tabEventsCount) elements.tabEventsCount.textContent = count;

  updateCoordinatorsList();

  let html = "";
  Object.keys(state.events).forEach(id => {
    const ev = state.events[id];
    const isActive = id === state.activeEventId;
    const hasSheet = !!(ev.apiUrl && ev.apiUrl.startsWith("http"));
    const coordKey = `volunteer_${id}`;
    const pin = COORDINATORS[coordKey]?.pin || ev.volunteerPin || "1111";

    html += `
      <div class="event-manage-item ${isActive ? 'active-event-item' : ''}">
        <div style="flex: 1; min-width: 0;">
          <span class="club-badge-tag">${escapeHtml(ev.club || 'Club Event')}</span>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong style="color: var(--text-pure); font-size: 0.95rem;">${escapeHtml(ev.name)}</strong>
            <span class="badge" style="font-size: 0.7rem; padding: 2px 8px;">${escapeHtml(ev.prefix || 'EV-')}</span>
            ${isActive ? '<span style="font-size: 0.72rem; color: var(--emerald-primary); font-weight: 800;">● ACTIVE</span>' : ''}
          </div>
          <div style="display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; flex-wrap: wrap;">
            <span>Staff PIN: <strong style="color: var(--text-primary); font-family: monospace;">${escapeHtml(pin)}</strong></span>
            <span>Sheet: <strong style="color: ${hasSheet ? 'var(--emerald-primary)' : 'var(--amber-primary)'};">${hasSheet ? '✓ Live Connected' : '○ Demo / Unlinked'}</strong></span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${!isActive ? `<button class="btn-sm btn-switch-to-event" data-id="${id}" type="button">Switch</button>` : ''}
          ${!ev.isBuiltin ? `<button class="btn-sm btn-delete-event" data-id="${id}" style="color: var(--rose-primary); border-color: var(--border-rose);" type="button" title="Delete Event">✕</button>` : ''}
        </div>
      </div>
    `;
  });

  elements.manageEventsList.innerHTML = html;

  elements.manageEventsList.querySelectorAll(".btn-switch-to-event").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.id;
      if (targetId) {
        switchEvent(targetId);
        openSettingsForActiveEvent();
      }
    });
  });

  elements.manageEventsList.querySelectorAll(".btn-delete-event").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.id;
      if (targetId) deleteEvent(targetId);
    });
  });
}

function handleCreateNewEvent() {
  const isCustomClub = elements.newClubSelect?.value === "__new__";
  const club = isCustomClub ? (elements.newClubCustomInput?.value.trim() || "") : (elements.newClubSelect?.value || "");
  const name = elements.newEventNameInput ? elements.newEventNameInput.value.trim() : "";
  const apiUrl = elements.newApiUrlInput ? elements.newApiUrlInput.value.trim() : "";
  let prefix = elements.newPrefixInput ? elements.newPrefixInput.value.trim() : "";
  const pin = elements.newVolunteerPinInput ? elements.newVolunteerPinInput.value.trim() : "3333";
  const arenasRaw = elements.newArenasInput ? elements.newArenasInput.value.trim() : "";

  if (!club) {
    alert("Please specify a Parent Club / Organization name.");
    return;
  }
  if (!name) {
    alert("Please enter an Event Name.");
    return;
  }

  if (!prefix) {
    const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "EV";
    prefix = `${letters}26-`;
  } else if (!prefix.endsWith("-")) {
    prefix = prefix + "-";
  }

  const arenas = arenasRaw ? arenasRaw.split(",").map(a => a.trim()).filter(Boolean) : ["General Admission"];

  // Generate unique event ID
  const baseId = (club.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_")).replace(/__+/g, "_").slice(0, 28);
  let eventId = baseId;
  let counter = 1;
  while (state.events[eventId]) {
    eventId = `${baseId}_${counter++}`;
  }

  // Create event object
  state.events[eventId] = {
    id: eventId,
    club: club,
    name: name,
    brandBadge: `${club.toUpperCase()} • 2026`,
    brandTitle: club.toUpperCase(),
    brandSubtitle: `${name.toUpperCase()} CHECK-IN SCANNER`,
    prefix: prefix,
    apiUrl: apiUrl,
    gateLabel: "Main Gate Entry",
    arenaModeLabel: arenas.length > 1 ? "Arena Attendance" : "Check-In",
    arenas: arenas,
    volunteerPin: pin || "1111",
    isBuiltin: false,
    demoDatabase: {}
  };

  updateCoordinatorsList();
  saveEvents();
  switchEvent(eventId);

  // Clear inputs
  if (elements.newEventNameInput) elements.newEventNameInput.value = "";
  if (elements.newApiUrlInput) elements.newApiUrlInput.value = "";
  if (elements.newPrefixInput) elements.newPrefixInput.value = "";
  if (elements.newArenasInput) elements.newArenasInput.value = "";

  switchSettingsTab("tabActiveEvent");
  openSettingsForActiveEvent();

  alert(`🎉 Event Created Successfully!\n\nClub: ${club}\nEvent: ${name}\nTicket Prefix: ${prefix}\nVolunteer PIN: ${pin}\n\nThe event is now active on your dashboard.`);
}

function deleteEvent(eventId) {
  const ev = state.events[eventId];
  if (!ev) return;
  if (ev.isBuiltin) {
    alert("Built-in default events cannot be deleted.");
    return;
  }
  if (confirm(`Are you sure you want to delete '${ev.name}' under '${ev.club}'?`)) {
    delete state.events[eventId];
    delete COORDINATORS[`volunteer_${eventId}`];
    localStorage.removeItem(`ts_history_${eventId}`);
    localStorage.removeItem(`ts_api_url_${eventId}`);

    if (state.activeEventId === eventId) {
      const remainingIds = Object.keys(state.events);
      switchEvent(remainingIds[0] || "techno_splurge");
    }

    saveEvents();
    renderManageEventsList();
    alert(`Event '${ev.name}' deleted.`);
  }
}

function saveEvents() {
  localStorage.setItem("vn_events", JSON.stringify(state.events));
  renderEventPills();
  renderManageEventsList();
  populateClubSelect();
  updateCoordinatorsList();
}

function openSettingsForActiveEvent() {
  const ev = state.events[state.activeEventId] || DEFAULT_EVENTS.techno_splurge;
  if (elements.settingsActiveClubTag) elements.settingsActiveClubTag.textContent = (ev.club || "Club Event").toUpperCase();
  if (elements.settingsActiveEventName) elements.settingsActiveEventName.textContent = ev.name;
  if (elements.apiUrlInput) elements.apiUrlInput.value = ev.apiUrl || "";
  if (elements.eventPrefixInput) elements.eventPrefixInput.value = ev.prefix || "";
  if (elements.eventVolunteerPinInput) {
    const coordKey = `volunteer_${state.activeEventId}`;
    elements.eventVolunteerPinInput.value = COORDINATORS[coordKey]?.pin || ev.volunteerPin || "1111";
  }
  if (elements.eventSubtitleInput) elements.eventSubtitleInput.value = ev.brandSubtitle || "";
  if (elements.eventArenasInput) elements.eventArenasInput.value = (ev.arenas || []).join(", ");
  if (elements.audioToggle) elements.audioToggle.checked = state.audioEnabled;
  if (elements.autoResumeToggle) elements.autoResumeToggle.checked = state.autoResume;

  populateClubSelect();
  renderManageEventsList();
  switchSettingsTab("tabActiveEvent");
  elements.settingsModal.style.display = "flex";
}

function saveSettings() {
  const ev = state.events[state.activeEventId];
  if (ev) {
    ev.apiUrl = elements.apiUrlInput.value.trim();
    ev.prefix = elements.eventPrefixInput.value.trim() || ev.prefix;
    ev.brandSubtitle = elements.eventSubtitleInput.value.trim() || ev.brandSubtitle;
    
    if (elements.eventVolunteerPinInput) {
      const newPin = elements.eventVolunteerPinInput.value.trim();
      if (newPin) {
        ev.volunteerPin = newPin;
        const coordKey = `volunteer_${state.activeEventId}`;
        if (COORDINATORS[coordKey]) {
          COORDINATORS[coordKey].pin = newPin;
        }
      }
    }

    if (elements.eventArenasInput) {
      const arenasRaw = elements.eventArenasInput.value.trim();
      if (arenasRaw) {
        ev.arenas = arenasRaw.split(",").map(a => a.trim()).filter(Boolean);
      }
    }

    localStorage.setItem(`ts_api_url_${state.activeEventId}`, ev.apiUrl);
    saveEvents();
  }

  state.audioEnabled = elements.audioToggle.checked;
  state.autoResume = elements.autoResumeToggle.checked;
  localStorage.setItem("ts_audio", String(state.audioEnabled));
  localStorage.setItem("ts_autoresume", String(state.autoResume));

  switchEvent(state.activeEventId);
  elements.settingsModal.style.display = "none";
  alert(`Settings saved successfully for ${ev ? ev.name : "Event"}!`);
}

async function testConnection() {
  const testUrl = elements.apiUrlInput.value.trim();
  if (!testUrl) {
    alert("Please enter a Google Apps Script Web App URL first.");
    return;
  }

  elements.btnTestConnection.textContent = "Testing...";
  elements.btnTestConnection.disabled = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${testUrl}?action=ping`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data && data.success) {
      alert("✅ Connection Successful!\nGoogle Sheets API is responsive.");
    } else {
      alert("⚠️ Received unexpected response:\n" + JSON.stringify(data));
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      alert("❌ Connection Test Timed Out (10s).\nThe Google Apps Script server took too long to respond.");
    } else {
      alert("❌ Connection Failed!\nEnsure you deployed the Web App with access set to 'Anyone'.\nDetails: " + err.message);
    }
  } finally {
    elements.btnTestConnection.textContent = "Test Sheet Connection";
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

// ==============================================================================
// Volunteer Magic Link & Dispatch Generator
// ==============================================================================
function openShareVolunteerModal() {
  if (!elements.shareVolunteerModal) return;

  if (elements.shareEventSelect) {
    // Group events by Club
    const clubsMap = {};
    Object.keys(state.events).forEach(id => {
      const ev = state.events[id];
      const clubName = ev.club || "Other Events";
      if (!clubsMap[clubName]) clubsMap[clubName] = [];
      clubsMap[clubName].push(ev);
    });

    let selectHtml = "";
    Object.keys(clubsMap).forEach(clubName => {
      selectHtml += `<optgroup label="${escapeHtml(clubName)}">`;
      clubsMap[clubName].forEach(ev => {
        selectHtml += `<option value="${ev.id}" ${ev.id === state.activeEventId ? 'selected' : ''}>${escapeHtml(ev.name)} (${ev.prefix || 'EV'})</option>`;
      });
      selectHtml += `</optgroup>`;
    });

    elements.shareEventSelect.innerHTML = selectHtml;
  }

  populateShareDesks();
  updateShareVolunteerModalContent();
  elements.shareVolunteerModal.style.display = "flex";
}

function populateShareDesks() {
  if (!elements.shareDeskSelect || !elements.shareEventSelect) return;
  const eventId = elements.shareEventSelect.value;
  const ev = state.events[eventId] || state.events[state.activeEventId];
  if (!ev) return;

  let optionsHtml = `<option value="gate">🚪 Main Gate Entry</option>`;
  (ev.arenas || []).forEach(arena => {
    optionsHtml += `<option value="arena:${escapeHtml(arena)}">🎯 ${escapeHtml(arena)}</option>`;
  });
  elements.shareDeskSelect.innerHTML = optionsHtml;
}

function getVolunteerShareLink() {
  const eventId = elements.shareEventSelect ? elements.shareEventSelect.value : state.activeEventId;
  const deskVal = elements.shareDeskSelect ? elements.shareDeskSelect.value : "gate";
  const coordKey = `volunteer_${eventId}`;
  
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set("event", eventId);
  params.set("coord", coordKey);

  if (deskVal.startsWith("arena:")) {
    params.set("mode", "arena");
    params.set("arena", deskVal.replace("arena:", ""));
  } else {
    params.set("mode", "gate");
  }

  return `${baseUrl}?${params.toString()}`;
}

function updateShareVolunteerModalContent() {
  const link = getVolunteerShareLink();
  if (elements.shareLinkPreview) elements.shareLinkPreview.textContent = link;
  if (elements.volunteerQrImage) {
    elements.volunteerQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(link)}`;
  }
}

function copyVolunteerLink() {
  const link = getVolunteerShareLink();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      alert("✅ Volunteer link copied to clipboard!\nPaste this link in your volunteer WhatsApp group.");
    }).catch(() => {
      prompt("Copy this volunteer link:", link);
    });
  } else {
    prompt("Copy this volunteer link:", link);
  }
}

function shareWhatsapp() {
  const eventId = elements.shareEventSelect ? elements.shareEventSelect.value : state.activeEventId;
  const ev = state.events[eventId] || state.events[state.activeEventId];
  const link = getVolunteerShareLink();
  const desk = elements.shareDeskSelect ? elements.shareDeskSelect.options[elements.shareDeskSelect.selectedIndex].text : "Check-in Scanner";
  const coordKey = `volunteer_${eventId}`;
  const pin = COORDINATORS[coordKey]?.pin || ev.volunteerPin || "1111";

  const message = `🚨 *${(ev.club || "EVENT").toUpperCase()} — ${ev.name.toUpperCase()}* 🚨\n\n` +
    `Hello Team! Here is your live check-in scanner link for *${desk}*:\n\n` +
    `📲 *Open Scanner:* ${link}\n\n` +
    `🔑 *Volunteer PIN:* ${pin}\n\n` +
    `🔒 *Access Level:* Dedicated to ${ev.name} ONLY\n\n` +
    `📌 *Instructions:*\n` +
    `1. Tap the link above in Chrome (Android) or Safari (iPhone)\n` +
    `2. Allow camera permission\n` +
    `3. Enter your PIN: *${pin}*\n` +
    `4. Scan participant QR codes to mark verified attendance!\n\n` +
    `⚡ *VN QR Check-in System*`;

  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
}
