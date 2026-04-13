// src/components/printReportCard.js
import { DEPED_LOGO_BASE64, SICS_LOGO_BASE64 } from '../constants/reportImages';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Calculates age from a YYYY-MM-DD (or YYYY-MM or YYYY) date string.
 * Returns '—' when the date is missing or unparseable.
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return '—';

  const parts = dateOfBirth.split('-');
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return '—';

  const today = new Date();
  let age = today.getFullYear() - birthYear;

  if (parts.length >= 3) {
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
    const birthDay   = parseInt(parts[2], 10);
    if (
      today.getMonth() < birthMonth ||
      (today.getMonth() === birthMonth && today.getDate() < birthDay)
    ) {
      age--;
    }
  }

  return age;
};

/**
 * Formats the student's full name as "Last, First Middle".
 * Trims trailing whitespace when middle name is absent.
 */
const formatName = (student) =>
  `${student.lastName}, ${student.firstName} ${student.middleName || ''}`.trim();

// ─── main function ───────────────────────────────────────────────────────────

const printReportCard = ({
  student,
  teacherName   = 'AIVY M. GANAGANAG',
  principalName = 'GERRY C. DAYON',
  schoolYear    = '2025-2026',
}) => {
  if (!student) {
    console.error('[printReportCard] No student data provided.');
    return;
  }

  const gender      = student.enrollment?.gender      ?? student.gender      ?? '—';
  const dateOfBirth = student.enrollment?.dateOfBirth ?? student.dateOfBirth ?? null;
  const age         = calculateAge(dateOfBirth);
  const fullName    = formatName(student);
  const lrn         = student.lrn        || '—';
  const gradeLevel  = student.gradeLevel || '—';

  const html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Report Card – ${fullName}</title>
  <style>
    /* ── Reset ────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, serif;
      background: #fff;
      color: #000;
      font-size: 10pt;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Print: A4 landscape ──────────────────────────── */
    @page {
      size: A4 landscape;
      margin: 0mm;
      padding: 0;
    }
    @media print {
      body { 
        background: #fff;
        margin: 0;
        padding: 0;
      }
    }

    /* ── Page wrapper ─────────────────────────────────── */
    .page {
      width: 277mm;   /* A4 landscape: 297mm - 20mm margins */
      min-height: 190mm;
      margin: 10mm 12mm;
      display: flex;
      gap: 10mm;
    }

    /* ── Columns ──────────────────────────────────────── */
    .left-col {
      width: 50%;
      flex-shrink: 0;
      padding-right: 10mm;
      display: flex;
      flex-direction: column;
    }
    .right-col {
      width: 50%;
      display: flex;
      flex-direction: column;
    }

    /* ════════════════════════════════════════════════════
       LEFT COLUMN
    ════════════════════════════════════════════════════ */

    .att-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 3mm;
    }

    /* ── Attendance table ─────────────────────────────── */
    .att-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      table-layout: fixed;
    }
    .att-table th,
    .att-table td {
      border: 1px solid #000;
      text-align: center;
      vertical-align: middle;
    }
    .col-label { width: 48px; }
    .col-month { width: 20px; }
    .col-blank { width: 18px; }
    .col-total { width: 26px; }

    .att-table thead th {
      height: 70px;
      vertical-align: bottom;
      padding-bottom: 2px;
    }
    .vertical-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      display: inline-block;
      white-space: nowrap;
      font-weight: normal;
      font-size: 7.5pt;
      padding: 3px 1px;
    }
    .att-table tbody td { height: 20px; }
    .row-label {
      text-align: left;
      padding: 2px 3px;
      font-size: 7pt;
      line-height: 1.25;
      vertical-align: middle;
    }

    /* ── Parent signature ─────────────────────────────── */
    .sig-section {
      margin-top: 10mm;
      padding-top: 0;
    }
    .sig-heading {
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 6mm;
    }
    .sig-row {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      margin-bottom: 5mm;
      font-size: 10pt;
      white-space: nowrap;
    }
    .sig-row sup { font-size: 7pt; line-height: 1; }
    .sig-line {
      flex: 1;
      border-bottom: 1px solid #000;
      height: 14px;
    }

    /* ════════════════════════════════════════════════════
       RIGHT COLUMN
    ════════════════════════════════════════════════════ */

    /* ── Gov header ───────────────────────────────────── */
    .gov-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 4mm;
      margin-bottom: 2mm;
    }
    .gov-text {
      text-align: center;
      flex: 1;
      font-size: 9pt;
      line-height: 1.4;
    }
    .gov-text .dept { font-size: 11pt; font-weight: bold; }
    .logo-deped {
      width: 55px; height: 50px;
      object-fit: contain; flex-shrink: 0;
    }
    .logo-sics {
      width: 50px; height: 50px;
      object-fit: contain; flex-shrink: 0;
    }

    /* ── School info ──────────────────────────────────── */
    .school-name {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    .school-addr {
      text-align: center;
      font-size: 7.5pt;
      margin-bottom: 0.5mm;
    }
    .school-id {
      text-align: center;
      font-size: 8.5pt;
      margin-bottom: 3mm;
    }

    /* ── Card title ───────────────────────────────────── */
    .card-title {
      text-align: center;
      margin-bottom: 3mm;
      line-height: 1.6;
    }
    .card-title .main { font-size: 11pt; font-weight: bold; }
    .card-title .sub  { font-size: 9.5pt; font-weight: bold; }

    /* ── Student info ─────────────────────────────────── */
    .student-data { margin-bottom: 3mm; font-size: 9.5pt; }
    .data-row {
      display: flex;
      gap: 6mm;
      margin-bottom: 1.5mm;
      align-items: baseline;
    }
    .data-group {
      display: flex;
      align-items: baseline;
      gap: 3px;
      min-width: 0;
    }
    .data-label { white-space: nowrap; flex-shrink: 0; }
    .data-value {
      font-weight: bold;
      text-decoration: underline;
      text-underline-offset: 2px;
      white-space: nowrap;
    }

    /* ── Dear parent ──────────────────────────────────── */
    .dear-parent {
      font-style: italic;
      font-size: 9pt;
      line-height: 1.45;
      margin-bottom: 3mm;
    }
    .dear-parent .salutation { margin-bottom: 1mm; }
    .dear-parent .body { text-indent: 14px; }

    /* ── Official signatures ──────────────────────────── */
    .official-sigs {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3mm;
    }
    .official-sig-block { text-align: center; }
    .official-sig-name {
      display: inline-block;
      border-bottom: 1.5px solid #000;
      font-size: 10pt;
      padding-bottom: 1px;
      min-width: 120px;
    }
    .official-sig-role { font-size: 9pt; margin-top: 1px; }

    /* ── Divider ──────────────────────────────────────── */
    .section-rule { border: none; border-top: 1px solid #000; margin: 3mm 0; }

    /* ── Certificate of Transfer ──────────────────────── */
    .cert-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    .cert-row {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      margin-bottom: 2mm;
      font-size: 9pt;
    }
    .cert-line {
      border-bottom: 1px solid #000;
      height: 14px;
      flex: 1;
      min-width: 40px;
    }
    .cert-sigs {
      display: flex;
      justify-content: space-between;
      margin: 3mm 0 0 8mm;
    }
    .cert-sig-block { text-align: center; }
    .cert-sig-name {
      display: inline-block;
      border-bottom: 1px solid #000;
      font-size: 9.5pt;
      padding-bottom: 1px;
      min-width: 110px;
    }
    .cert-sig-blank {
      display: inline-block;
      border-bottom: 1px solid #000;
      height: 14px;
      min-width: 110px;
    }
    .cert-sig-role { font-size: 9pt; margin-top: 1px; }

    /* ── Cancellation ─────────────────────────────────── */
    .cancel-title {
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
      margin: 3mm 0 2mm;
    }
    .cancel-row { font-size: 9pt; margin-bottom: 1.5mm; }
    .cancel-bottom {
      display: flex;
      justify-content: flex-end;
      margin-top: 4mm;
    }
    .cancel-sig-blank {
      display: block;
      border-bottom: 1px solid #000;
      width: 110px;
      height: 14px;
      margin-bottom: 1px;
    }
    .cancel-sig-role { font-size: 9pt; text-align: center; }
  </style>
</head>
<body>
<div class="page">

  <!-- ══════════════ LEFT COLUMN ══════════════ -->
  <div class="left-col">

    <div class="att-title">Report on Attendance</div>

    <table class="att-table">
      <colgroup>
        <col class="col-label">
        <col class="col-month"><!-- July -->
        <col class="col-month"><!-- August -->
        <col class="col-month"><!-- September -->
        <col class="col-month"><!-- October -->
        <col class="col-month"><!-- November -->
        <col class="col-month"><!-- December -->
        <col class="col-month"><!-- January -->
        <col class="col-month"><!-- February -->
        <col class="col-month"><!-- March -->
        <col class="col-month"><!-- April -->
        <col class="col-blank"><!-- spare 1 -->
        <col class="col-blank"><!-- spare 2 -->
        <col class="col-total"><!-- Total -->
      </colgroup>
      <thead>
        <tr>
          <th class="col-label"></th>
          <th><span class="vertical-text">July</span></th>
          <th><span class="vertical-text">August</span></th>
          <th><span class="vertical-text">September</span></th>
          <th><span class="vertical-text">October</span></th>
          <th><span class="vertical-text">November</span></th>
          <th><span class="vertical-text">December</span></th>
          <th><span class="vertical-text">January</span></th>
          <th><span class="vertical-text">February</span></th>
          <th><span class="vertical-text">March</span></th>
          <th><span class="vertical-text">April</span></th>
          <th></th>
          <th></th>
          <th style="font-size:7pt; vertical-align:middle; padding:2px;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-label">No. of<br>School<br>days</td>
          <td></td><td></td><td></td><td></td><td></td><td></td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
        <tr>
          <td class="row-label">No. of<br>days<br>present</td>
          <td></td><td></td><td></td><td></td><td></td><td></td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
        <tr>
          <td class="row-label">No. of<br>days<br>absent</td>
          <td></td><td></td><td></td><td></td><td></td><td></td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      </tbody>
    </table>

    <!-- Signature block — pushed to bottom via margin-top: auto -->
    <div class="sig-section">
      <div class="sig-heading">PARENT'S / GUARDIAN'S SIGNATURE</div>
      <div class="sig-row">1<sup>st</sup>&nbsp;Quarter<div class="sig-line"></div></div>
      <div class="sig-row">2<sup>nd</sup>&nbsp;Quarter<div class="sig-line"></div></div>
      <div class="sig-row">3<sup>rd</sup>&nbsp;Quarter<div class="sig-line"></div></div>
      <div class="sig-row">4<sup>th</sup>&nbsp;Quarter<div class="sig-line"></div></div>
    </div>

  </div><!-- /left-col -->

  <!-- ══════════════ RIGHT COLUMN ══════════════ -->
  <div class="right-col">

    <!-- Government header -->
    <div class="gov-header">
      <img src="${DEPED_LOGO_BASE64}" class="logo-deped" alt="DepEd Logo">
      <div class="gov-text">
        Republic of the Philippines<br>
        <span class="dept">DEPARTMENT OF EDUCATION</span><br>
        Negros Island Region
      </div>
      <img src="${SICS_LOGO_BASE64}" class="logo-sics" alt="SICS Logo">
    </div>

    <div class="school-name">Siloam International Christian School</div>
    <div class="school-addr">Purok Bayanihan, Motong Dumaguete City, Negros Oriental 6200 Philippines</div>
    <div class="school-id">School ID: <strong>448012</strong></div>

    <div class="card-title">
      <div class="main">LEARNER'S PROGRESS REPORT CARD</div>
      <div class="sub">GRADE SCHOOL</div>
      <div class="sub">S.Y.: ${schoolYear}</div>
    </div>

    <div class="student-data">
      <div class="data-row">
        <div class="data-group" style="flex: 1.8;">
          <span class="data-label">Name:&nbsp;</span>
          <span class="data-value">${fullName}</span>
        </div>
        <div class="data-group" style="flex: 1;">
          <span class="data-label">Level:&nbsp;</span>
          <span class="data-value">${gradeLevel}</span>
        </div>
      </div>
      <div class="data-row">
        <div class="data-group" style="flex: 0.5;">
          <span class="data-label">Age:&nbsp;</span>
          <span class="data-value">${age}</span>
        </div>
        <div class="data-group" style="flex: 1;">
          <span class="data-label">Gender:&nbsp;</span>
          <span class="data-value">${gender}</span>
        </div>
        <div class="data-group" style="flex: 1.2;">
          <span class="data-label">LRN:&nbsp;</span>
          <span class="data-value">${lrn}</span>
        </div>
      </div>
    </div>

    <div class="dear-parent">
      <div class="salutation">Dear Parent,</div>
      <div class="body">This report card shows the ability and progress your child
      has made in the different learning areas as well as his/her core values.
      The school welcomes you if you desire to know more about your child's progress.</div>
    </div>

    <div class="official-sigs">
      <div class="official-sig-block">
        <div class="official-sig-name">${teacherName}</div>
        <div class="official-sig-role">Teacher</div>
      </div>
      <div class="official-sig-block">
        <div class="official-sig-name">${principalName}</div>
        <div class="official-sig-role">Principal</div>
      </div>
    </div>

    <hr class="section-rule">

    <!-- Certificate of Transfer -->
    <div class="cert-title">CERTIFICATE OF TRANSFER</div>

    <div class="cert-row">
      Admitted to Grade:&nbsp;<div class="cert-line"></div>
      &nbsp;Section:&nbsp;<div class="cert-line"></div>
    </div>
    <div class="cert-row">
      Eligible for Admission/Transfer to Grade:&nbsp;<div class="cert-line"></div>
    </div>

    <div class="cert-sigs">
      <div class="cert-sig-block">
        <div class="cert-sig-name">${principalName}</div>
        <div class="cert-sig-role">Principal</div>
      </div>
      <div class="cert-sig-block">
        <div class="cert-sig-blank"></div>
        <div class="cert-sig-role">Teacher</div>
      </div>
    </div>

    <div class="cancel-title">Cancellation of Eligibility to Transfer</div>
    <div class="cancel-row">Admitted in:</div>
    <div class="cancel-row">Date:</div>

    <div class="cancel-bottom">
      <div>
        <span class="cancel-sig-blank"></span>
        <div class="cancel-sig-role">Principal</div>
      </div>
    </div>

  </div><!-- /right-col -->

</div><!-- /page -->

<script>
  window.onload = () => {
    setTimeout(() => {
      window.print();
      window.addEventListener('afterprint', () => window.close());
    }, 500);
  };
</script>
</body>
</html>`;

  // Guard against browsers blocking popups
  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site to print the report card.');
    return;
  }

  win.document.write(html);
  win.document.close();
};

export default printReportCard;