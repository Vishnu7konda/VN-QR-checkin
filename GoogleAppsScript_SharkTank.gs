/*******************************************************
* =====================================================
* SHARK TANK 2026
* COMPLETE EVENT SYSTEM & QR SCANNER API
* =====================================================
*
* Event:
* SHARK TANK 2026
* Pitch. Validate. Elevate.
*
* Organized by:
* Shark Tank Coordination Team
*
* Google Form Link:
* https://docs.google.com/forms/d/e/1FAIpQLSeVSJk_eZALpeFa9cfIc1XZEaOwAc-CKXuxgECa3RDOmZjCyg/viewform
*
* Pitch Rounds:
* 1. Shark Tank Pitching
* 2. Round 1: 3-Minute Pitch
* 3. Round 2: Shark Q&A
* 4. Round 3: Valuation Battle
*
* =====================================================
*
* WORKFLOW
*
* Google Form Submission
* ↓
* Auto Assigned Registration ID (ST26-0001, etc.)
* ↓
* QR Check-In at Event Entry Gate (via VN Scanner)
* ↓
* Pitch Round / Arena Attendance Recorded (via VN Scanner)
*
* =====================================================
*******************************************************/

/*******************************************************
* CONFIGURATION
*******************************************************/
const CONFIG = {
  // Google Form response sheet/tab
  SHEET_NAME: "Form Responses 1",
  
  // Google Drive folder where tickets/records are stored
  TICKET_FOLDER_ID: "",
  
  // Event details
  EVENT_NAME: "SHARK TANK 2026",
  EVENT_TAGLINE: "Pitch. Validate. Elevate.",
  EVENT_YEAR: "2026",
  ORGANIZER: "SHARK TANK 2026",
  
  // Registration fee / Track
  FEE: "Free / Registered",
  
  // Registration ID prefix for QR Codes
  REG_PREFIX: "ST26-",
  
  // QR size
  QR_SIZE: 500,
  
  // Pitch Rounds & Arenas
  ACTIVITIES: [
    "Shark Tank Pitching",
    "Round 1: 3-Minute Pitch",
    "Round 2: Shark Q&A",
    "Round 3: Valuation Battle"
  ]
};

/*******************************************************
* GOOGLE SHEET MENU
*******************************************************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🦈 SHARK TANK 2026")
    .addItem(" Setup Automation & Columns", "setupAutomation")
    .addSeparator()
    .addItem(" Generate Ticket for Selected Row", "generateTicketForSelectedRow")
    .addItem(" Registration Lookup", "showRegistrationLookup")
    .addSeparator()
    .addItem(" Gate Check In Participant", "showCheckInPrompt")
    .addItem(" Mark Pitch Round Attendance", "showActivityAttendancePrompt")
    .addSeparator()
    .addItem(" Refresh Activity Sheets", "createActivitySheets")
    .addSeparator()
    .addItem(" Test Drive", "testDrive")
    .addItem(" Test Email", "testEmail")
    .addToUi();
}

/*******************************************************
* SETUP AUTOMATION
*******************************************************/
function setupAutomation() {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  
  // Ensure necessary tracking columns exist
  const requiredColumns = [
    "Registration ID",
    "Payment Status",
    "Entry Status",
    "Entry Time",
    "QR Data",
    "Shark Tank Pitching Attendance",
    "Round 1: 3-Minute Pitch Attendance",
    "Round 2: Shark Q&A Attendance",
    "Round 3: Valuation Battle Attendance"
  ];
  
  let currentHeaders = [...headers];
  requiredColumns.forEach(function(colName) {
    if (!findColumn(currentHeaders, [colName])) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(colName);
      currentHeaders.push(colName);
    }
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Remove old triggers created by this project
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    const functionName = trigger.getHandlerFunction();
    if (functionName === "handlePaymentEdit" || functionName === "handleFormSubmit") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Trigger 1: New Google Form submission
  ScriptApp.newTrigger("handleFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  // Create activity sheets and initialize rows
  createActivitySheets();
  initializePendingStatuses();

  SpreadsheetApp.getUi().alert("🦈 Shark Tank automation and columns installed successfully!");
}

/*******************************************************
* FORM SUBMISSION HANDLER
*******************************************************/
function handleFormSubmit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.SHEET_NAME) return;
    const row = e.range.getRow();
    initializeRow(row);
  } catch (error) {
    console.error("Form submission error:\n" + error.stack);
  }
}

/*******************************************************
* INITIALIZE ONE ROW
*******************************************************/
function initializeRow(row) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const regCol = findColumn(headers, ["Registration ID"]);
  const paymentStatusCol = findColumn(headers, ["Payment Status"]);
  const ticketStatusCol = findColumn(headers, ["Ticket Status"]);
  const entryStatusCol = findColumn(headers, ["Entry Status"]);
  const qrCol = findColumn(headers, ["QR Data"]);

  let regId = regCol ? String(sheet.getRange(row, regCol).getValue()).trim() : "";
  if (regCol && !regId) {
    regId = generateRegistrationId(sheet);
    sheet.getRange(row, regCol).setValue(regId);
  }

  if (qrCol && regId && !sheet.getRange(row, qrCol).getValue()) {
    sheet.getRange(row, qrCol).setValue(regId);
  }

  if (paymentStatusCol && !sheet.getRange(row, paymentStatusCol).getValue()) {
    sheet.getRange(row, paymentStatusCol).setValue("VERIFIED");
  }

  if (ticketStatusCol && !sheet.getRange(row, ticketStatusCol).getValue()) {
    sheet.getRange(row, ticketStatusCol).setValue("GENERATED");
  }

  if (entryStatusCol && !sheet.getRange(row, entryStatusCol).getValue()) {
    sheet.getRange(row, entryStatusCol).setValue("NOT CHECKED IN");
  }
}

/*******************************************************
* INITIALIZE EXISTING ROWS
*******************************************************/
function initializePendingStatuses() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  for (let row = 2; row <= lastRow; row++) {
    initializeRow(row);
  }
}

/*******************************************************
* PAYMENT EDIT HANDLER
*******************************************************/
function handlePaymentEdit(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== CONFIG.SHEET_NAME) return;
    const row = range.getRow();
    if (row <= 1) return;

    const headers = getHeaders(sheet);
    const paymentStatusCol = findColumn(headers, ["Payment Status"]);
    if (!paymentStatusCol) throw new Error("Payment Status column not found.");

    if (range.getColumn() !== paymentStatusCol) return;

    const status = String(range.getValue()).trim().toUpperCase();
    if (status === "VERIFIED") {
      generateTicketForRow(row);
    }
  } catch (error) {
    console.error("Payment edit error:\n" + error.stack);
  }
}

/*******************************************************
* GENERATE TICKET
*******************************************************/
function generateTicketForRow(row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet();
    const headers = getHeaders(sheet);

    const cols = {
      name: findColumn(headers, ["Participant: Full Name", "Full Name", "Name"]),
      roll: findColumn(headers, ["Participant: Roll Number", "Roll Number", "Roll No"]),
      year: findColumn(headers, ["Participant: Year of Study", "Year of Study", "Year"]),
      section: findColumn(headers, ["Participant: Section", "Section"]),
      email: findColumn(headers, ["Participant: Email Address", "Email Address", "Email"]),
      phone: findColumn(headers, ["Participant: Phone Number", "Phone Number", "Phone"]),
      activities: findColumn(headers, ["Select Your Arena", "Select Your Arena (Pick any 3 activities mandatory just for ₹119/-)"]),
      utr: findColumn(headers, ["Payment: UPI Transaction ID / UTR Number", "UPI Transaction ID / UTR Number", "UTR"]),
      paymentStatus: findColumn(headers, ["Payment Status"]),
      verificationNote: findColumn(headers, ["Verification Note"]),
      registrationId: findColumn(headers, ["Registration ID"]),
      ticketStatus: findColumn(headers, ["Ticket Status"]),
      qrData: findColumn(headers, ["QR Data"]),
      ticketPdf: findColumn(headers, ["Ticket PDF"]),
      entryStatus: findColumn(headers, ["Entry Status"]),
      entryTime: findColumn(headers, ["Entry Time"]),
      activitySelectionStatus: findColumn(headers, ["Activity Selection Status"])
    };

    const requiredColumns = [
      "name", "roll", "year", "section", "email",
      "activities", "utr", "paymentStatus", "registrationId",
      "ticketStatus", "qrData", "ticketPdf"
    ];
    requiredColumns.forEach(function(key) {
      if (!cols[key]) throw new Error("Required column not found: " + key);
    });

    const paymentStatus = String(sheet.getRange(row, cols.paymentStatus).getValue()).trim().toUpperCase();
    if (paymentStatus !== "VERIFIED") {
      throw new Error("Payment must be VERIFIED before generating a ticket.");
    }

    const existingStatus = String(sheet.getRange(row, cols.ticketStatus).getValue()).trim().toUpperCase();
    if (existingStatus === "SENT") {
      console.log("Ticket already sent for row " + row);
      return;
    }

    const rawActivities = sheet.getRange(row, cols.activities).getValue();
    const activities = parseActivities(rawActivities);

    if (activities.length !== 3) {
      if (cols.activitySelectionStatus) {
        sheet.getRange(row, cols.activitySelectionStatus).setValue("INVALID - SELECT EXACTLY 3");
      }
      if (cols.verificationNote) {
        sheet.getRange(row, cols.verificationNote).setValue("Payment verified, but ticket was not generated. Participant must select exactly 3 activities.");
      }
      throw new Error("Exactly 3 activities must be selected.");
    }

    const cleanActivities = activities.map(cleanActivityName);

    const utr = String(sheet.getRange(row, cols.utr).getValue()).trim();
    if (utr) {
      const duplicates = findDuplicateUTR(utr, row, cols.utr);
      if (duplicates.length > 0) {
        const duplicateMessage = "DUPLICATE UTR - MANUAL REVIEW REQUIRED. Duplicate rows: " + duplicates.join(", ");
        if (cols.verificationNote) {
          sheet.getRange(row, cols.verificationNote).setValue(duplicateMessage);
        }
        throw new Error(duplicateMessage);
      }
    }

    let registrationId = String(sheet.getRange(row, cols.registrationId).getValue()).trim();
    if (!registrationId) {
      registrationId = generateRegistrationId(sheet);
      sheet.getRange(row, cols.registrationId).setValue(registrationId);
    }

    sheet.getRange(row, cols.qrData).setValue(registrationId);

    const participant = {
      name: getValue(sheet, row, cols.name),
      roll: getValue(sheet, row, cols.roll),
      year: getValue(sheet, row, cols.year),
      section: getValue(sheet, row, cols.section),
      email: getValue(sheet, row, cols.email),
      phone: getValue(sheet, row, cols.phone),
      utr: utr
    };

    if (!participant.email) {
      throw new Error("Participant email address is empty.");
    }

    const pdfFile = createTicketPDF(participant, registrationId, cleanActivities);

    sheet.getRange(row, cols.ticketPdf).setValue(pdfFile.getUrl());
    sheet.getRange(row, cols.ticketStatus).setValue("GENERATED");

    sendTicketEmail(participant, registrationId, cleanActivities, pdfFile);

    sheet.getRange(row, cols.ticketStatus).setValue("SENT");
    if (cols.verificationNote) {
      sheet.getRange(row, cols.verificationNote).setValue("Payment manually verified. Ticket generated, saved and emailed successfully.");
    }
    if (cols.activitySelectionStatus) {
      sheet.getRange(row, cols.activitySelectionStatus).setValue("VALID - 3 ACTIVITIES");
    }

    console.log("Ticket successfully generated: " + registrationId);
  } finally {
    lock.releaseLock();
  }
}

/*******************************************************
* GENERATE REGISTRATION ID
*******************************************************/
function generateRegistrationId(sheet) {
  const headers = getHeaders(sheet);
  const registrationIdCol = findColumn(headers, ["Registration ID"]);
  if (!registrationIdCol) throw new Error("Registration ID column not found.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return CONFIG.REG_PREFIX + "0001";

  const values = sheet.getRange(2, registrationIdCol, lastRow - 1, 1).getValues();
  let maximum = 0;
  values.forEach(function(row) {
    const value = String(row[0]).trim();
    if (value.indexOf(CONFIG.REG_PREFIX) === 0) {
      const number = parseInt(value.replace(CONFIG.REG_PREFIX, ""), 10);
      if (!isNaN(number) && number > maximum) {
        maximum = number;
      }
    }
  });

  return CONFIG.REG_PREFIX + String(maximum + 1).padStart(4, "0");
}

/*******************************************************
* CREATE PDF TICKET
*******************************************************/
function createTicketPDF(participant, registrationId, activities) {
  const folder = DriveApp.getFolderById(CONFIG.TICKET_FOLDER_ID);
  const qrUrl = "https://quickchart.io/qr?size=" + CONFIG.QR_SIZE + "&margin=2&text=" + encodeURIComponent(registrationId);
  const qrResponse = UrlFetchApp.fetch(qrUrl, { muteHttpExceptions: true });

  if (qrResponse.getResponseCode() !== 200) {
    throw new Error("QR generation failed. HTTP " + qrResponse.getResponseCode());
  }

  const qrBlob = qrResponse.getBlob().setName(registrationId + "-QR.png");
  const doc = DocumentApp.create(CONFIG.EVENT_NAME + " | " + registrationId);
  const body = doc.getBody();

  body.setMarginTop(28).setMarginBottom(28).setMarginLeft(36).setMarginRight(36);

  const title = body.appendParagraph(CONFIG.EVENT_NAME);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(28).setBold(true).setForegroundColor("#111827");

  const tagline = body.appendParagraph(CONFIG.EVENT_TAGLINE.toUpperCase());
  tagline.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(10).setBold(true).setForegroundColor("#2563EB");

  const organizer = body.appendParagraph(CONFIG.ORGANIZER + " • " + CONFIG.EVENT_YEAR);
  organizer.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(8).setForegroundColor("#6B7280");
  body.appendHorizontalRule();

  const payment = body.appendParagraph("PAYMENT VERIFIED | " + CONFIG.FEE);
  payment.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(11).setBold(true).setForegroundColor("#15803D");

  const idLabel = body.appendParagraph("REGISTRATION ID");
  idLabel.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(9).setBold(true).setForegroundColor("#6B7280");

  const id = body.appendParagraph(registrationId);
  id.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(26).setBold(true).setForegroundColor("#111827");

  const qrParagraph = body.appendParagraph("");
  qrParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  qrParagraph.appendInlineImage(qrBlob).setWidth(205).setHeight(205);

  const scanText = body.appendParagraph("SCAN THIS QR AT EVENT ENTRY");
  scanText.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(9).setBold(true).setForegroundColor("#374151");

  const participantHeading = body.appendParagraph("PARTICIPANT DETAILS");
  participantHeading.setFontSize(13).setBold(true).setForegroundColor("#111827");

  const table = body.appendTable();
  table.setBorderWidth(0);
  addTicketRow(table, "NAME", participant.name);
  addTicketRow(table, "ROLL NUMBER", participant.roll);
  addTicketRow(table, "YEAR", participant.year);
  addTicketRow(table, "SECTION", participant.section);
  addTicketRow(table, "REGISTRATION FEE", CONFIG.FEE + " - VERIFIED");

  const arenasHeading = body.appendParagraph("YOUR 3 SELECTED ARENAS");
  arenasHeading.setFontSize(13).setBold(true).setForegroundColor("#111827");

  activities.forEach(function(activity, index) {
    const arena = body.appendParagraph((index + 1) + " " + activity);
    arena.setFontSize(11).setBold(true).setForegroundColor("#1F2937");
  });

  body.appendHorizontalRule();
  const important = body.appendParagraph("IMPORTANT");
  important.setFontSize(10).setBold(true).setForegroundColor("#DC2626");

  const note = body.appendParagraph(
    "This ticket is valid only for the registered participant. " +
    "Bring this ticket or display the QR code at the event entry. " +
    "The QR code contains only the Registration ID. " +
    "Activity attendance is allowed only for the three arenas selected during registration."
  );
  note.setFontSize(8).setForegroundColor("#4B5563");

  body.appendHorizontalRule();
  const footer = body.appendParagraph(CONFIG.EVENT_NAME + " " + CONFIG.EVENT_YEAR + " • " + CONFIG.ORGANIZER);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(8).setBold(true).setForegroundColor("#6B7280");

  doc.saveAndClose();

  const pdfBlob = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF);
  pdfBlob.setName("TECHNO_SPLURGE_" + registrationId + "_TICKET.pdf");
  const pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(doc.getId()).setTrashed(true);
  return pdfFile;
}

function addTicketRow(table, label, value) {
  const row = table.appendTableRow();
  const labelCell = row.appendTableCell(label);
  const valueCell = row.appendTableCell(String(value || "-"));

  labelCell.setBackgroundColor("#F3F4F6");
  valueCell.setBackgroundColor("#FFFFFF");
  labelCell.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8);
  valueCell.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8);
  labelCell.getChild(0).asParagraph().setFontSize(8).setBold(true).setForegroundColor("#6B7280");
  valueCell.getChild(0).asParagraph().setFontSize(10).setBold(true).setForegroundColor("#111827");
}

/*******************************************************
* EMAIL CONFIRMATION WITH TICKET ATTACHED
*******************************************************/
function sendTicketEmail(participant, registrationId, activities, pdfFile) {
  if (!participant.email) throw new Error("Participant email address is empty.");

  const activityHtml = activities.map(function(activity, index) {
    return `
      <tr>
        <td style="padding:12px;width:35px;font-size:13px;font-weight:700;color:#2563EB;border-bottom:1px solid #E5E7EB;">
          ${index + 1}
        </td>
        <td style="padding:12px;font-size:14px;font-weight:600;color:#111827;border-bottom:1px solid #E5E7EB;">
          ${escapeHtml(activity)}
        </td>
      </tr>
    `;
  }).join("");

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:30px 15px;">
            <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="background:#111827;padding:34px 25px;text-align:center;">
                  <div style="color:#FFFFFF;font-size:28px;font-weight:800;letter-spacing:1px;">TECHNO SPLURGE</div>
                  <div style="margin-top:8px;color:#60A5FA;font-size:12px;font-weight:700;letter-spacing:1px;">THINK. CREATE. PERFORM. COMPETE.</div>
                  <div style="margin-top:9px;color:#9CA3AF;font-size:11px;">IIC CLUB • MALLA REDDY UNIVERSITY • 2026</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 30px 15px;text-align:center;">
                  <span style="display:inline-block;padding:7px 15px;background:#DCFCE7;color:#15803D;border-radius:20px;font-size:11px;font-weight:700;">PAYMENT VERIFIED</span>
                  <h1 style="margin:18px 0 8px;color:#111827;font-size:25px;">Registration Confirmed</h1>
                  <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.6;">
                    Hello <strong>${escapeHtml(participant.name || "Participant")}</strong>,<br>
                    Your registration for <strong>TECHNO SPLURGE</strong> has been successfully confirmed.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 30px 25px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
                    <tr>
                      <td align="center" style="padding:22px;">
                        <div style="color:#6B7280;font-size:10px;font-weight:700;letter-spacing:1px;">YOUR REGISTRATION ID</div>
                        <div style="margin-top:8px;color:#111827;font-size:30px;font-weight:800;letter-spacing:2px;">${escapeHtml(registrationId)}</div>
                        <div style="margin-top:9px;color:#15803D;font-size:12px;font-weight:700;">REGISTRATION FEE: ₹119 • VERIFIED</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 20px;">
                  <h2 style="margin:0 0 12px;color:#111827;font-size:16px;">Participant Details</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9FAFB;border:1px solid #E5E7EB;">
                    <tr><td style="padding:11px;width:38%;color:#6B7280;font-size:11px;font-weight:700;">NAME</td><td style="padding:11px;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(participant.name)}</td></tr>
                    <tr><td style="padding:11px;color:#6B7280;font-size:11px;font-weight:700;">ROLL NUMBER</td><td style="padding:11px;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(participant.roll)}</td></tr>
                    <tr><td style="padding:11px;color:#6B7280;font-size:11px;font-weight:700;">YEAR</td><td style="padding:11px;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(participant.year)}</td></tr>
                    <tr><td style="padding:11px;color:#6B7280;font-size:11px;font-weight:700;">SECTION</td><td style="padding:11px;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(participant.section)}</td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 25px;">
                  <h2 style="margin:0 0 12px;color:#111827;font-size:16px;">Your 3 Selected Arenas</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;">
                    ${activityHtml}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 25px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFF6FF;border:1px solid #BFDBFE;">
                    <tr>
                      <td align="center" style="padding:20px;">
                        <div style="color:#1D4ED8;font-size:14px;font-weight:700;">YOUR OFFICIAL TICKET IS ATTACHED</div>
                        <div style="margin-top:7px;color:#4B5563;font-size:12px;line-height:1.6;">
                          Open the attached PDF ticket and keep it safely. Your QR code will be required at event entry.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFBEB;border-left:4px solid #F59E0B;">
                    <tr>
                      <td style="padding:15px;">
                        <div style="color:#92400E;font-size:12px;font-weight:700;">IMPORTANT</div>
                        <div style="margin-top:6px;color:#78350F;font-size:12px;line-height:1.6;">
                          Bring your ticket or QR code to the event. Entry and activity attendance will be recorded using your Registration ID.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#111827;padding:24px;text-align:center;">
                  <div style="color:#FFFFFF;font-size:13px;font-weight:700;">TECHNO SPLURGE 2026</div>
                  <div style="margin-top:7px;color:#9CA3AF;font-size:11px;">IIC CLUB • MALLA REDDY UNIVERSITY</div>
                  <div style="margin-top:9px;color:#6B7280;font-size:10px;">Think. Create. Perform. Compete.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const plainText =
    "TECHNO SPLURGE 2026\n\nREGISTRATION CONFIRMED\n\nHello " + (participant.name || "Participant") +
    ",\n\nYour registration for TECHNO SPLURGE has been confirmed.\n\nRegistration ID: " + registrationId +
    "\nRegistration Fee: ₹119 - VERIFIED\n\nYOUR 3 SELECTED ARENAS:\n" +
    activities.map(function(act, idx) { return (idx + 1) + ". " + act; }).join("\n") +
    "\n\nYour official ticket is attached to this email.\nPlease bring your QR code to the event.\n\nTECHNO SPLURGE 2026\nIIC CLUB • MALLA REDDY UNIVERSITY\nThink. Create. Perform. Compete.";

  GmailApp.sendEmail(
    participant.email,
    "TECHNO SPLURGE | Registration Confirmed | " + registrationId,
    plainText,
    {
      htmlBody: htmlBody,
      attachments: [pdfFile.getBlob()],
      name: "TECHNO SPLURGE Registration"
    }
  );
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseActivities(value) {
  if (value === null || value === undefined || String(value).trim() === "") return [];
  const text = String(value).replace(/\r/g, "\n");
  let parts;
  if (text.indexOf(",") !== -1) {
    parts = text.split(",");
  } else {
    parts = text.split("\n");
  }
  return parts.map(function(item) { return String(item).trim(); }).filter(function(item) { return item.length > 0; });
}

function cleanActivityName(activity) {
  const normalized = normalizeActivity(activity);
  if (normalized.indexOf("ceofor10minutes") !== -1) return "CEO for 10 Minutes";
  if (normalized.indexOf("techparody") !== -1) return "Tech Parody";
  if (normalized.indexOf("openmic") !== -1) return "Open Mic";
  if (normalized.indexOf("memewar") !== -1) return "Meme War";
  return String(activity).replace(/^[^\w]+/u, "").trim();
}

function validateActivitySelection(row) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const activityCol = findColumn(headers, [
    "Select Your Arena",
    "Select Your Arena (Pick any 3 activities mandatory just for ₹119/-)"
  ]);
  if (!activityCol) return "ACTIVITY COLUMN NOT FOUND";
  const activities = parseActivities(sheet.getRange(row, activityCol).getValue());
  if (activities.length === 3) return "VALID - 3 ACTIVITIES";
  return "INVALID - " + activities.length + " SELECTED";
}

function findDuplicateUTR(utr, currentRow, utrColumn) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, utrColumn, lastRow - 1, 1).getValues();
  const duplicates = [];
  values.forEach(function(row, index) {
    const actualRow = index + 2;
    if (actualRow !== currentRow && String(row[0]).trim() !== "" && String(row[0]).trim().toLowerCase() === String(utr).trim().toLowerCase()) {
      duplicates.push(actualRow);
    }
  });
  return duplicates;
}

/*******************************************************
* ACTIVITY SHEETS MANAGEMENT
*******************************************************/
function createActivitySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  CONFIG.ACTIVITIES.forEach(function(activity) {
    let sheet = ss.getSheetByName(activity);
    if (!sheet) {
      sheet = ss.insertSheet(activity);
    }
    const headers = [
      "Registration ID",
      "Participant Name",
      "Roll Number",
      "Year",
      "Section",
      "Email",
      "Phone",
      "Payment Status",
      "Entry Status",
      "Activity Attendance",
      "Attendance Time"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  });
  refreshActivitySheets();
}

function refreshActivitySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = getSheet();
  const lastRow = mainSheet.getLastRow();
  if (lastRow < 2) return;

  const headers = getHeaders(mainSheet);
  const cols = {
    registrationId: findColumn(headers, ["Registration ID"]),
    name: findColumn(headers, ["Participant: Full Name", "Full Name", "Name"]),
    roll: findColumn(headers, ["Participant: Roll Number", "Roll Number", "Roll No"]),
    year: findColumn(headers, ["Participant: Year of Study", "Year of Study", "Year"]),
    section: findColumn(headers, ["Participant: Section", "Section"]),
    email: findColumn(headers, ["Participant: Email Address", "Email Address", "Email"]),
    phone: findColumn(headers, ["Participant: Phone Number", "Phone Number", "Phone"]),
    payment: findColumn(headers, ["Payment Status"]),
    entry: findColumn(headers, ["Entry Status"]),
    activities: findColumn(headers, ["Select Your Arena", "Select Your Arena (Pick any 3 activities mandatory just for ₹119/-)"])
  };

  const data = mainSheet.getRange(2, 1, lastRow - 1, mainSheet.getLastColumn()).getValues();

  CONFIG.ACTIVITIES.forEach(function(activity) {
    const activitySheet = ss.getSheetByName(activity);
    if (!activitySheet) return;

    if (activitySheet.getLastRow() > 1) {
      activitySheet.getRange(2, 1, activitySheet.getLastRow() - 1, 11).clearContent();
    }

    const rows = [];
    data.forEach(function(row) {
      const selected = parseActivities(row[cols.activities - 1]).map(cleanActivityName);
      const isSelected = selected.some(function(item) {
        return normalizeActivity(item) === normalizeActivity(activity);
      });
      if (!isSelected) return;

      rows.push([
        row[cols.registrationId - 1],
        row[cols.name - 1],
        row[cols.roll - 1],
        row[cols.year - 1],
        row[cols.section - 1],
        row[cols.email - 1],
        row[cols.phone - 1],
        row[cols.payment - 1],
        row[cols.entry - 1],
        "",
        ""
      ]);
    });

    if (rows.length > 0) {
      activitySheet.getRange(2, 1, rows.length, 11).setValues(rows);
    }
  });
}

function normalizeActivity(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/*******************************************************
* EVENT GATE CHECK-IN (CORE LOGIC)
*******************************************************/
function checkInByRegistrationId(registrationId) {
  registrationId = String(registrationId).trim().toUpperCase();
  const sheet = getSheet();
  const headers = getHeaders(sheet);

  const regCol = findColumn(headers, ["Registration ID"]);
  const entryCol = findColumn(headers, ["Entry Status"]);
  const timeCol = findColumn(headers, ["Entry Time"]);
  const paymentCol = findColumn(headers, ["Payment Status"]);

  if (!regCol || !entryCol) {
    throw new Error("Registration ID or Entry Status column not found.");
  }

  const row = findRegistrationRow(registrationId, regCol);
  if (!row) {
    return {
      success: false,
      status: "NOT_FOUND",
      message: "Registration ID not found in sheet."
    };
  }

  const participant = getParticipantDataByRow(sheet, headers, row);

  // Payment check
  if (paymentCol) {
    const payment = String(sheet.getRange(row, paymentCol).getValue()).trim().toUpperCase();
    if (payment !== "VERIFIED") {
      return {
        success: false,
        status: "PAYMENT_UNVERIFIED",
        message: "Entry denied. Payment is not VERIFIED.",
        participant: participant
      };
    }
  }

  // Duplicate entry check
  const currentStatus = String(sheet.getRange(row, entryCol).getValue()).trim().toUpperCase();
  if (currentStatus === "CHECKED IN") {
    const prevTime = timeCol ? sheet.getRange(row, timeCol).getValue() : "";
    return {
      success: false,
      status: "ALREADY_CHECKED_IN",
      message: "ALREADY CHECKED IN.\nDuplicate entry prevented.",
      row: row,
      checkedInAt: prevTime ? Utilities.formatDate(new Date(prevTime), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : "Earlier",
      participant: participant
    };
  }

  // Mark Entry
  const now = new Date();
  const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  sheet.getRange(row, entryCol).setValue("CHECKED IN");
  if (timeCol) {
    sheet.getRange(row, timeCol).setValue(formattedTime);
  }

  participant.entryStatus = "CHECKED IN";
  participant.entryTime = formattedTime;

  return {
    success: true,
    status: "SUCCESS",
    message: "ENTRY SUCCESSFUL\nRegistration ID: " + registrationId,
    row: row,
    checkedInAt: formattedTime,
    participant: participant
  };
}

/*******************************************************
* ACTIVITY ARENA ATTENDANCE (CORE LOGIC)
*******************************************************/
function markActivityAttendance(registrationId, activity) {
  registrationId = String(registrationId).trim().toUpperCase();
  activity = cleanActivityName(activity);

  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const regCol = findColumn(headers, ["Registration ID"]);
  const activitiesCol = findColumn(headers, [
    "Select Your Arena",
    "Select Your Arena (Pick any 3 activities mandatory just for ₹119/-)"
  ]);
  const attendanceCol = getActivityAttendanceColumn(headers, activity);
  const entryCol = findColumn(headers, ["Entry Status"]);
  const paymentCol = findColumn(headers, ["Payment Status"]);

  if (!regCol || !activitiesCol || !attendanceCol) {
    throw new Error("Required activity columns were not found.");
  }

  const row = findRegistrationRow(registrationId, regCol);
  if (!row) {
    return {
      success: false,
      status: "NOT_FOUND",
      message: "Registration ID not found in sheet."
    };
  }

  const participant = getParticipantDataByRow(sheet, headers, row);

  // 1. Payment verification
  if (paymentCol) {
    const payment = String(sheet.getRange(row, paymentCol).getValue()).trim().toUpperCase();
    if (payment !== "VERIFIED") {
      return {
        success: false,
        status: "PAYMENT_UNVERIFIED",
        message: "Entry denied. Payment is not VERIFIED.",
        participant: participant
      };
    }
  }

  // 2. Main gate check-in required first
  if (entryCol) {
    const entryStatus = String(sheet.getRange(row, entryCol).getValue()).trim().toUpperCase();
    if (entryStatus !== "CHECKED IN") {
      return {
        success: false,
        status: "NOT_CHECKED_IN_GATE",
        message: "Participant must CHECK IN at the main event entry gate first!",
        participant: participant
      };
    }
  }

  // 3. Check whether activity was selected (or allow all if form doesn't have an arena selection question)
  if (activitiesCol) {
    const rawVal = sheet.getRange(row, activitiesCol).getValue();
    if (rawVal) {
      const selectedActivities = parseActivities(rawVal).map(cleanActivityName);
      const selected = selectedActivities.some(function(item) {
        return normalizeActivity(item) === normalizeActivity(activity);
      });

      if (!selected) {
        return {
          success: false,
          status: "ACTIVITY_NOT_SELECTED",
          message: "Participant is not enrolled for " + activity + ".\nEnrolled arenas: " + selectedActivities.join(", "),
          participant: participant,
          allowedActivities: selectedActivities
        };
      }
    }
  }

  // 4. Duplicate attendance prevention
  const current = String(sheet.getRange(row, attendanceCol).getValue()).trim().toUpperCase();
  if (current === "PRESENT") {
    return {
      success: false,
      status: "ALREADY_PRESENT",
      message: "ALREADY MARKED PRESENT for " + activity + "!",
      participant: participant
    };
  }

  // 5. Mark attendance
  const now = new Date();
  const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  sheet.getRange(row, attendanceCol).setValue("PRESENT");

  // Also update individual activity sheet if exists
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actSheet = ss.getSheetByName(activity);
  if (actSheet) {
    const actData = actSheet.getDataRange().getValues();
    for (let i = 1; i < actData.length; i++) {
      if (String(actData[i][0]).trim().toUpperCase() === registrationId) {
        actSheet.getRange(i + 1, 10).setValue("PRESENT");
        actSheet.getRange(i + 1, 11).setValue(formattedTime);
        break;
      }
    }
  }

  participant.activityAttendance = "PRESENT";
  participant.attendanceTime = formattedTime;

  return {
    success: true,
    status: "SUCCESS",
    message: "ACTIVITY ATTENDANCE MARKED: " + activity,
    activity: activity,
    checkedInAt: formattedTime,
    participant: participant
  };
}

function getActivityAttendanceColumn(headers, activity) {
  const header = activity + " Attendance";
  let col = findColumn(headers, [header, activity]);
  if (!col) {
    // Auto-create attendance column if missing
    const sheet = getSheet();
    const lastCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, lastCol).setValue(header);
    col = lastCol;
  }
  return col;
}

function findRegistrationRow(registrationId, registrationIdColumn) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, registrationIdColumn, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toUpperCase() === registrationId) {
      return i + 2;
    }
  }
  return null;
}

function getParticipantDataByRow(sheet, headers, row) {
  const cols = {
    regId: findColumn(headers, ["Registration ID", "Ticket ID", "Pass ID"]),
    name: findColumn(headers, ["Team Name", "Startup Name", "Full Name", "Participant: Full Name", "Lead Name", "Name"]),
    rollNo: findColumn(headers, ["Roll Number", "Roll No", "Participant: Roll Number", "Team Leader Roll", "Phone Number", "Phone"]),
    year: findColumn(headers, ["Year of Study", "Year", "Category", "Startup Sector", "Track"]),
    section: findColumn(headers, ["Section", "Branch", "Department", "Team Size"]),
    email: findColumn(headers, ["Email Address", "Email", "Participant: Email Address"]),
    phone: findColumn(headers, ["Phone Number", "Contact", "Phone"]),
    activities: findColumn(headers, ["Select Your Arena", "Pitch Round", "Category"]),
    paymentStatus: findColumn(headers, ["Payment Status", "Payment"]),
    entryStatus: findColumn(headers, ["Entry Status", "Check-in Status"]),
    entryTime: findColumn(headers, ["Entry Time", "Check-in Time"])
  };

  const rawActs = cols.activities ? parseActivities(getValue(sheet, row, cols.activities)).map(cleanActivityName) : CONFIG.ACTIVITIES;

  return {
    regId: String(getValue(sheet, row, cols.regId)),
    name: String(getValue(sheet, row, cols.name) || "Shark Tank Participant"),
    rollNo: String(getValue(sheet, row, cols.rollNo) || "-"),
    year: String(getValue(sheet, row, cols.year) || "Pitch Track"),
    section: String(getValue(sheet, row, cols.section) || "-"),
    email: String(getValue(sheet, row, cols.email)),
    phone: String(getValue(sheet, row, cols.phone)),
    arena1: rawActs[0] || "Shark Tank Pitching",
    arena2: rawActs[1] || "",
    arena3: rawActs[2] || "",
    arenas: rawActs.length ? rawActs : CONFIG.ACTIVITIES,
    paymentStatus: String(getValue(sheet, row, cols.paymentStatus) || "VERIFIED"),
    entryStatus: String(getValue(sheet, row, cols.entryStatus) || "NOT CHECKED IN"),
    entryTime: String(getValue(sheet, row, cols.entryTime) || "")
  };
}

/*******************************************************
* WEB APP API ENDPOINTS (FOR QR SCANNER WEB APP)
*******************************************************/
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action;

    // If no action parameter, serve the standalone Shark Tank Check-In Web App HTML
    if (!action) {
      return HtmlService.createHtmlOutput(getSharkTankCheckInHTML())
        .setTitle("Shark Tank 2026 - Check In")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    if (action === "ping") {
      return jsonResponse({
        success: true,
        event: CONFIG.EVENT_NAME,
        club: CONFIG.ORGANIZER,
        message: "Shark Tank Check-In API is online and ready.",
        timestamp: new Date().toISOString()
      });
    }

    if (action === "stats") {
      return jsonResponse(getEventStats());
    }

    if (action === "checkin") {
      const regId = (params.regId || "").trim();
      const activity = (params.activity || "").trim();

      if (activity) {
        // Activity Arena Check-in
        return jsonResponse(markActivityAttendance(regId, activity));
      } else {
        // Main Event Gate Check-in
        return jsonResponse(checkInByRegistrationId(regId));
      }
    }

    if (action === "search") {
      const query = (params.query || "").trim();
      return jsonResponse(searchParticipants(query));
    }

    return jsonResponse({ success: false, message: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (ex) { payload = e.parameter || {}; }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || "checkin";
    const regId = (payload.regId || "").trim();
    const activity = (payload.activity || "").trim();

    if (action === "checkin") {
      if (activity) {
        return jsonResponse(markActivityAttendance(regId, activity));
      } else {
        return jsonResponse(checkInByRegistrationId(regId));
      }
    }

    if (action === "stats") {
      return jsonResponse(getEventStats());
    }

    return jsonResponse({ success: false, message: "Invalid action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function getEventStats() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, total: 0, checkedIn: 0, pending: 0 };

  const headers = getHeaders(sheet);
  const regCol = findColumn(headers, ["Registration ID"]);
  const entryCol = findColumn(headers, ["Entry Status"]);
  const paymentCol = findColumn(headers, ["Payment Status"]);

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let total = 0;
  let verified = 0;
  let checkedIn = 0;

  values.forEach(function(row) {
    const regId = String(row[regCol - 1] || "").trim();
    if (regId) {
      total++;
      const payment = String(row[paymentCol - 1] || "").trim().toUpperCase();
      if (payment === "VERIFIED") verified++;

      const entry = String(row[entryCol - 1] || "").trim().toUpperCase();
      if (entry === "CHECKED IN") checkedIn++;
    }
  });

  return {
    success: true,
    total: total,
    verified: verified,
    checkedIn: checkedIn,
    pending: Math.max(0, total - checkedIn),
    timestamp: new Date().toISOString()
  };
}

function searchParticipants(query) {
  if (!query) return { success: false, results: [] };
  const q = query.toLowerCase().trim();
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const data = sheet.getDataRange().getValues();

  const regCol = findColumn(headers, ["Registration ID"]);
  const nameCol = findColumn(headers, ["Participant: Full Name", "Full Name", "Name"]);
  const rollCol = findColumn(headers, ["Participant: Roll Number", "Roll Number", "Roll No"]);

  const results = [];
  for (let i = 1; i < data.length; i++) {
    const regId = String(data[i][regCol - 1] || "");
    const name = String(data[i][nameCol - 1] || "");
    const rollNo = String(data[i][rollCol - 1] || "");

    if (regId.toLowerCase().includes(q) || rollNo.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
      results.push(getParticipantDataByRow(sheet, headers, i + 1));
      if (results.length >= 8) break;
    }
  }

  return { success: true, results: results };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/*******************************************************
* UTILITY FUNCTIONS
*******************************************************/
function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error("Sheet '" + CONFIG.SHEET_NAME + "' was not found.");
  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
    return String(header).trim();
  });
}

function findColumn(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const current = normalizeHeader(headers[i]);
    for (let j = 0; j < possibleNames.length; j++) {
      const possible = normalizeHeader(possibleNames[j]);
      if (current === possible) return i + 1;
    }
  }
  for (let i = 0; i < headers.length; i++) {
    const current = normalizeHeader(headers[i]);
    for (let j = 0; j < possibleNames.length; j++) {
      const possible = normalizeHeader(possibleNames[j]);
      if (current.indexOf(possible) !== -1 || possible.indexOf(current) !== -1) return i + 1;
    }
  }
  return null;
}

function normalizeHeader(value) {
  return String(value).toLowerCase().replace(/[₹$]/g, "").replace(/\s+/g, " ").trim();
}

function getValue(sheet, row, column) {
  if (!column) return "";
  return sheet.getRange(row, column).getValue();
}

/*******************************************************
* PROMPT & TEST HELPERS
*******************************************************/
function showCheckInPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("EVENT CHECK-IN", "Enter Registration ID:", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const result = checkInByRegistrationId(response.getResponseText());
  ui.alert(result.message);
}

function showActivityAttendancePrompt() {
  const ui = SpreadsheetApp.getUi();
  const idResponse = ui.prompt("ACTIVITY ATTENDANCE", "Enter Registration ID:", ui.ButtonSet.OK_CANCEL);
  if (idResponse.getSelectedButton() !== ui.Button.OK) return;

  const activityResponse = ui.prompt("SELECT ACTIVITY", CONFIG.ACTIVITIES.join("\n"), ui.ButtonSet.OK_CANCEL);
  if (activityResponse.getSelectedButton() !== ui.Button.OK) return;

  const result = markActivityAttendance(idResponse.getResponseText(), activityResponse.getResponseText());
  ui.alert(result.message);
}

function showRegistrationLookup() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("REGISTRATION LOOKUP", "Enter Registration ID:", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const registrationId = response.getResponseText().trim().toUpperCase();
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const regCol = findColumn(headers, ["Registration ID"]);
  if (!regCol) { ui.alert("Registration ID column not found."); return; }

  const row = findRegistrationRow(registrationId, regCol);
  if (!row) { ui.alert("Registration ID not found."); return; }

  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  let message = "REGISTRATION FOUND\n\n";
  headers.forEach(function(header, index) {
    const value = values[index];
    if (value !== "" && value !== null) {
      message += header + ": " + value + "\n";
    }
  });
  ui.alert(message);
}

function testEmail() {
  const email = Session.getEffectiveUser().getEmail();
  GmailApp.sendEmail(email, "TECHNO SPLURGE - Email Test", "Gmail authorization is working successfully.", {
    htmlBody: "<div style='font-family:Arial;padding:30px;'><h2>TECHNO SPLURGE</h2><p>Gmail authorization is working successfully.</p></div>",
    name: "TECHNO SPLURGE Registration"
  });
  console.log("Test email sent to: " + email);
}

function testDrive() {
  const folder = DriveApp.getFolderById(CONFIG.TICKET_FOLDER_ID);
  console.log("Folder name: " + folder.getName());
  console.log("Folder ID: " + folder.getId());
}

function generateTicketForSelectedRow() {
  const sheet = getSheet();
  const activeRange = sheet.getActiveRange();
  if (!activeRange) { SpreadsheetApp.getUi().alert("Select a participant row first."); return; }
  const row = activeRange.getRow();
  if (row <= 1) { SpreadsheetApp.getUi().alert("Please select a participant row, not the header."); return; }

  try {
    generateTicketForRow(row);
    SpreadsheetApp.getUi().alert("Ticket generated successfully!");
  } catch (error) {
    SpreadsheetApp.getUi().alert("Ticket generation failed:\n\n" + error.message);
  }
}


/***************************************************************
 * 🦈 SHARK TANK 2026
 * MULTI-MEMBER TEAM TICKET EXTENSIONS & STANDALONE CHECK-IN UI
 ***************************************************************/

const FORM = {
  TEAM_NAME: "Team Name",
  TEAM_SIZE: "Team Size",
  LEADER_NAME: "Team Leader: Full Name",
  LEADER_ROLL: "Team Leader: Roll Number",
  LEADER_EMAIL: "Team Leader: Email Address",
  LEADER_PHONE: "Team Leader: Phone Number",
  MEMBER2_NAME: "Member 2: Full Name",
  MEMBER2_ROLL: "Member 2: Roll Number",
  MEMBER3_NAME: "Member 3: Full Name",
  MEMBER3_ROLL: "Member 3: Roll Number"
};

const MGMT = {
  TEAM_ID: "Team ID",
  MEMBER1_ID: "Member 1 ID",
  MEMBER2_ID: "Member 2 ID",
  MEMBER3_ID: "Member 3 ID",
  TICKET1_ID: "Ticket 1 ID",
  TICKET2_ID: "Ticket 2 ID",
  TICKET3_ID: "Ticket 3 ID",
  PAYMENT_STATUS: "Payment Status",
  TICKET_STATUS: "Ticket Status",
  ENTRY_STATUS: "Entry Status",
  ENTRY_TIME: "Entry Time",
  CHECKED_BY: "Checked By",
  TEAM_CHECKIN: "Team Check-In Status",
  CHECKIN_STATUS_MEMBER1: "Member 1 Check-In Status",
  CHECKIN_TIME_MEMBER1: "Member 1 Check-In Time",
  CHECKIN_BY_MEMBER1: "Member 1 Checked By",
  CHECKIN_STATUS_MEMBER2: "Member 2 Check-In Status",
  CHECKIN_TIME_MEMBER2: "Member 2 Check-In Time",
  CHECKIN_BY_MEMBER2: "Member 2 Checked By",
  CHECKIN_STATUS_MEMBER3: "Member 3 Check-In Status",
  CHECKIN_TIME_MEMBER3: "Member 3 Check-In Time",
  CHECKIN_BY_MEMBER3: "Member 3 Checked By"
};

function getRegistrationSheet() {
  return getSheet();
}

function normalize(val) {
  return String(val || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getTeamSize(val) {
  const num = parseInt(String(val || "").replace(/[^0-9]/g, ""), 10);
  if (!isNaN(num) && num >= 1 && num <= 3) return num;
  return 1;
}

function getCheckinFields(member) {
  if (member === 1) return { status: MGMT.CHECKIN_STATUS_MEMBER1, time: MGMT.CHECKIN_TIME_MEMBER1, by: MGMT.CHECKIN_BY_MEMBER1 };
  if (member === 2) return { status: MGMT.CHECKIN_STATUS_MEMBER2, time: MGMT.CHECKIN_TIME_MEMBER2, by: MGMT.CHECKIN_BY_MEMBER2 };
  return { status: MGMT.CHECKIN_STATUS_MEMBER3, time: MGMT.CHECKIN_TIME_MEMBER3, by: MGMT.CHECKIN_BY_MEMBER3 };
}

function setValue(sheet, row, headers, columnName, value) {
  let col = findColumn(headers, [columnName]);
  if (!col) {
    col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue(columnName);
    headers.push(columnName);
  }
  sheet.getRange(row, col).setValue(value);
}

function ensureManagementColumns(sheet) {
  const headers = getHeaders(sheet);
  const required = [
    MGMT.TEAM_ID, MGMT.TICKET1_ID, MGMT.TICKET2_ID, MGMT.TICKET3_ID,
    MGMT.PAYMENT_STATUS, MGMT.TICKET_STATUS, MGMT.ENTRY_STATUS, MGMT.ENTRY_TIME,
    MGMT.TEAM_CHECKIN, MGMT.CHECKIN_STATUS_MEMBER1, MGMT.CHECKIN_TIME_MEMBER1, MGMT.CHECKIN_BY_MEMBER1,
    MGMT.CHECKIN_STATUS_MEMBER2, MGMT.CHECKIN_TIME_MEMBER2, MGMT.CHECKIN_BY_MEMBER2,
    MGMT.CHECKIN_STATUS_MEMBER3, MGMT.CHECKIN_TIME_MEMBER3, MGMT.CHECKIN_BY_MEMBER3
  ];
  let cur = headers.slice();
  required.forEach(c => {
    if (!findColumn(cur, [c])) {
      const next = sheet.getLastColumn() + 1;
      sheet.getRange(1, next).setValue(c);
      cur.push(c);
    }
  });
}

function searchSharkTankTicket(ticketId) {
  try {
    ticketId = String(ticketId || "").trim();
    if (!ticketId) return { success: false, status: "INVALID", message: "Please enter a Ticket ID." };

    const sheet = getRegistrationSheet();
    ensureManagementColumns(sheet);
    const headers = getHeaders(sheet);
    const ticketColumns = [MGMT.TICKET1_ID, MGMT.TICKET2_ID, MGMT.TICKET3_ID, "Registration ID", "QR Data"];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, status: "NOT_FOUND", message: "No registrations found." };

    for (let row = 2; row <= lastRow; row++) {
      for (let member = 1; member <= 3; member++) {
        const ticketColumn = findColumn(headers, [ticketColumns[member - 1]]);
        if (!ticketColumn) continue;
        const currentTicket = String(sheet.getRange(row, ticketColumn).getDisplayValue() || "").trim();

        if (currentTicket && currentTicket.toUpperCase() === ticketId.toUpperCase()) {
          const teamId = getValue(sheet, row, findColumn(headers, [MGMT.TEAM_ID]));
          const teamName = getValue(sheet, row, findColumn(headers, [FORM.TEAM_NAME, "Team Name", "Participant: Full Name", "Full Name"]));
          const paymentStatus = normalize(getValue(sheet, row, findColumn(headers, [MGMT.PAYMENT_STATUS, "Payment Status"])));
          const ticketStatus = normalize(getValue(sheet, row, findColumn(headers, [MGMT.TICKET_STATUS, "Ticket Status"])));
          const memberId = getMemberIdForCheckIn(sheet, row, headers, member);
          const memberName = getMemberNameForCheckIn(sheet, row, headers, member);
          const fields = getCheckinFields(member);
          const checkInStatus = normalize(getValue(sheet, row, findColumn(headers, [fields.status, MGMT.ENTRY_STATUS, "Entry Status"])));
          const checkInTime = getValue(sheet, row, findColumn(headers, [fields.time, MGMT.ENTRY_TIME, "Entry Time"]));
          const checkedBy = getValue(sheet, row, findColumn(headers, [fields.by, MGMT.CHECKED_BY, "Checked By"]));

          return {
            success: true,
            status: "FOUND",
            row: row,
            ticketId: currentTicket,
            teamId: teamId,
            teamName: teamName,
            memberNumber: member,
            memberId: memberId,
            memberName: memberName || teamName,
            paymentStatus: paymentStatus || "VERIFIED",
            ticketStatus: ticketStatus || "SENT",
            checkInStatus: checkInStatus,
            checkInTime: checkInTime,
            checkedBy: checkedBy,
            alreadyCheckedIn: checkInStatus === "CHECKED IN"
          };
        }
      }
    }
    return { success: false, status: "NOT_FOUND", message: "Ticket ID not found: " + ticketId };
  } catch (error) {
    return { success: false, status: "ERROR", message: error.message };
  }
}

function processSharkTankCheckIn(ticketId, volunteerName) {
  try {
    ticketId = String(ticketId || "").trim();
    volunteerName = String(volunteerName || "").trim();
    if (!ticketId) return { success: false, status: "INVALID", message: "Ticket ID is required." };
    if (!volunteerName) return { success: false, status: "INVALID", message: "Volunteer name is required." };

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getRegistrationSheet();
      ensureManagementColumns(sheet);
      const headers = getHeaders(sheet);

      const result = findSharkTankTicketInternal(sheet, headers, ticketId);
      if (!result.success) return result;

      const row = result.row;
      const member = result.member;

      const paymentStatus = normalize(getValue(sheet, row, findColumn(headers, [MGMT.PAYMENT_STATUS, "Payment Status"])));
      if (paymentStatus && paymentStatus !== "VERIFIED" && paymentStatus !== "PAID") {
        return { success: false, status: "PAYMENT_NOT_VERIFIED", message: "PAYMENT NOT VERIFIED", ticketId: result.ticketId, teamName: result.teamName, memberName: result.memberName };
      }

      const fields = getCheckinFields(member);
      const existingStatus = normalize(getValue(sheet, row, findColumn(headers, [fields.status])));
      if (existingStatus === "CHECKED IN") {
        const previousTime = getValue(sheet, row, findColumn(headers, [fields.time]));
        const previousVolunteer = getValue(sheet, row, findColumn(headers, [fields.by]));
        return { success: false, status: "ALREADY_CHECKED_IN", message: "Already checked in.", ticketId: result.ticketId, teamName: result.teamName, memberName: result.memberName, memberId: result.memberId, checkInTime: previousTime, checkedBy: previousVolunteer };
      }

      const now = new Date();
      setValue(sheet, row, headers, fields.status, "CHECKED IN");
      setValue(sheet, row, headers, fields.time, now);
      setValue(sheet, row, headers, fields.by, volunteerName);

      if (member === 1) {
        setValue(sheet, row, headers, MGMT.ENTRY_STATUS, "CHECKED IN");
        setValue(sheet, row, headers, MGMT.ENTRY_TIME, formatDate(now));
      }

      const teamStatus = calculateSharkTankTeamCheckInStatus(sheet, row, headers);
      setValue(sheet, row, headers, MGMT.TEAM_CHECKIN, teamStatus);
      SpreadsheetApp.flush();

      return {
        success: true,
        status: "CHECKED_IN",
        message: "CHECK-IN SUCCESSFUL",
        ticketId: result.ticketId,
        teamId: result.teamId,
        teamName: result.teamName,
        memberNumber: member,
        memberId: result.memberId,
        memberName: result.memberName,
        checkInTime: formatDate(now),
        checkedBy: volunteerName,
        teamCheckInStatus: teamStatus
      };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { success: false, status: "ERROR", message: error.message || "Check-in failed." };
  }
}

function findSharkTankTicketInternal(sheet, headers, ticketId) {
  const normalizedTicket = normalize(ticketId);
  const ticketColumns = [MGMT.TICKET1_ID, MGMT.TICKET2_ID, MGMT.TICKET3_ID, "Registration ID", "QR Data"];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, status: "NOT_FOUND", message: "No registrations found." };

  for (let row = 2; row <= lastRow; row++) {
    for (let member = 1; member <= 3; member++) {
      const column = findColumn(headers, [ticketColumns[member - 1]]);
      if (!column) continue;
      const value = normalize(sheet.getRange(row, column).getDisplayValue());
      if (value && value === normalizedTicket) {
        const teamId = getValue(sheet, row, findColumn(headers, [MGMT.TEAM_ID]));
        const teamName = getValue(sheet, row, findColumn(headers, [FORM.TEAM_NAME, "Team Name", "Participant: Full Name", "Full Name"]));
        const memberId = getMemberIdForCheckIn(sheet, row, headers, member);
        const memberName = getMemberNameForCheckIn(sheet, row, headers, member);
        return {
          success: true,
          row: row,
          member: member,
          ticketId: sheet.getRange(row, column).getDisplayValue().trim(),
          teamId: teamId,
          teamName: teamName,
          memberId: memberId,
          memberName: memberName || teamName
        };
      }
    }
  }
  return { success: false, status: "NOT_FOUND", message: "Ticket not found." };
}

function getMemberIdForCheckIn(sheet, row, headers, member) {
  if (member === 1) return getValue(sheet, row, findColumn(headers, [MGMT.MEMBER1_ID]));
  if (member === 2) return getValue(sheet, row, findColumn(headers, [MGMT.MEMBER2_ID]));
  return getValue(sheet, row, findColumn(headers, [MGMT.MEMBER3_ID]));
}

function getMemberNameForCheckIn(sheet, row, headers, member) {
  if (member === 1) return getValue(sheet, row, findColumn(headers, [FORM.LEADER_NAME, "Participant: Full Name", "Full Name", "Name"]));
  if (member === 2) return getValue(sheet, row, findColumn(headers, [FORM.MEMBER2_NAME]));
  return getValue(sheet, row, findColumn(headers, [FORM.MEMBER3_NAME]));
}

function calculateSharkTankTeamCheckInStatus(sheet, row, headers) {
  const teamSize = getTeamSize(getValue(sheet, row, findColumn(headers, [FORM.TEAM_SIZE])));
  let checkedIn = 0;
  for (let member = 1; member <= teamSize; member++) {
    const fields = getCheckinFields(member);
    const status = normalize(getValue(sheet, row, findColumn(headers, [fields.status])));
    if (status === "CHECKED IN") checkedIn++;
  }
  if (checkedIn === 0) return "NOT CHECKED IN";
  if (checkedIn >= teamSize) return "FULLY CHECKED IN";
  return "PARTIALLY CHECKED IN";
}

function getSharkTankCheckInStats() {
  return getEventStats();
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function getSharkTankCheckInHTML() {
  return String.raw`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shark Tank 2026 Check-In</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, sans-serif; background: #f4f6f8; color: #111827; }
.container { width: 100%; max-width: 650px; margin: 0 auto; padding: 20px; }
.header { background: #064e3b; color: white; border-radius: 22px; padding: 26px; margin-bottom: 18px; text-align: center; }
.logo { font-size: 38px; margin-bottom: 8px; }
.title { font-size: 27px; font-weight: 800; }
.subtitle { margin-top: 5px; color: #a7f3d0; }
.card { background: white; border-radius: 20px; padding: 22px; margin-bottom: 18px; box-shadow: 0 5px 22px rgba(0,0,0,.08); }
label { display: block; font-weight: 700; margin-bottom: 8px; }
input { width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; outline: none; margin-bottom: 12px; }
button { width: 100%; padding: 15px; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; margin-top: 6px; }
.verify { background: #111827; color: white; }
.checkin { background: #059669; color: white; }
button:disabled { opacity: .5; cursor: not-allowed; }
.result { display: none; }
.success { border: 2px solid #059669; background: #ecfdf5; }
.error { border: 2px solid #dc2626; background: #fef2f2; }
.warning { border: 2px solid #f59e0b; background: #fffbeb; }
.member { font-size: 22px; font-weight: 800; }
.info { margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.04); border-radius: 8px; line-height: 1.6; }
.spinner { display: none; text-align: center; margin-top: 10px; font-weight: 700; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">🦈</div>
    <div class="title">SHARK TANK 2026</div>
    <div class="subtitle">Shark Tank 2026 · Entry Check-In</div>
  </div>
  <div class="card">
    <label>Volunteer Name</label>
    <input id="volunteer" type="text" placeholder="Enter volunteer name" value="Scanner Volunteer">
    <label>Ticket ID</label>
    <input id="ticket" type="text" placeholder="Scan / enter ticket ID (e.g. ST26-0001)" autocomplete="off">
    <button class="verify" id="verifyButton" onclick="verifyTicket()">VERIFY TICKET</button>
    <button class="checkin" id="checkinButton" onclick="checkIn()" disabled>CONFIRM ENTRY CHECK-IN</button>
    <div class="spinner" id="spinner">Processing...</div>
  </div>
  <div class="card result" id="result">
    <div id="resultContent"></div>
  </div>
</div>
<script>
var currentTicket = null;
function verifyTicket() {
  var ticket = document.getElementById("ticket").value.trim();
  if (!ticket) return;
  document.getElementById("spinner").style.display = "block";
  google.script.run
    .withSuccessHandler(function(res) {
      document.getElementById("spinner").style.display = "none";
      if (!res.success) {
        document.getElementById("result").className = "card result error";
        document.getElementById("result").style.display = "block";
        document.getElementById("resultContent").innerHTML = "<div class='member'>" + (res.message || "Not Found") + "</div>";
        return;
      }
      currentTicket = res.ticketId;
      document.getElementById("result").className = "card result success";
      document.getElementById("result").style.display = "block";
      document.getElementById("resultContent").innerHTML = "<div class='member'>" + (res.memberName || res.teamName) + "</div><div class='info'>Ticket: " + res.ticketId + "<br>Team: " + (res.teamName || "-") + "<br>Status: " + (res.checkInStatus || "NOT CHECKED IN") + "</div>";
      document.getElementById("checkinButton").disabled = false;
    })
    .searchSharkTankTicket(ticket);
}
function checkIn() {
  var vol = document.getElementById("volunteer").value.trim();
  if (!currentTicket) return;
  document.getElementById("spinner").style.display = "block";
  google.script.run
    .withSuccessHandler(function(res) {
      document.getElementById("spinner").style.display = "none";
      if (res.success) {
        document.getElementById("result").className = "card result success";
        document.getElementById("resultContent").innerHTML = "<div class='member' style='color:#059669;'>✅ CHECK-IN SUCCESSFUL</div><div class='info'>Ticket: " + res.ticketId + "<br>Participant: " + res.memberName + "<br>Time: " + res.checkInTime + "</div>";
        document.getElementById("ticket").value = "";
        document.getElementById("checkinButton").disabled = true;
      } else {
        document.getElementById("result").className = "card result error";
        document.getElementById("resultContent").innerHTML = "<div class='member'>" + res.message + "</div>";
      }
    })
    .processSharkTankCheckIn(currentTicket, vol);
}
</script>
</body>
</html>
`;
}
