// src/components/printReportCard.js
import { DEPED_LOGO_BASE64, SICS_LOGO_BASE64 } from '../constants/reportImages';

// ─── helpers ────────────────────────────────────────────────────────────────
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return '—';
  const parts = dateOfBirth.split('-');
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return '—';
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (parts.length >= 3) {
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay   = parseInt(parts[2], 10);
    if (today.getMonth() < birthMonth || (today.getMonth() === birthMonth && today.getDate() < birthDay)) age--;
  }
  return age;
};

const formatName = (student) =>
  `${student.lastName}, ${student.firstName} ${student.middleName || ''}`.trim();

// Detect MAPEH component by subjectCode (e.g., G4-MUSIC, G5-ARTS, etc.)
const isMapehComponent = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || '';
  return code.includes('MUSIC') || code.includes('ARTS') || code.includes('PE') || code.includes('HEALTH');
};

// Sort order for MAPEH components (if needed)
const getMapehOrderIndex = (subjectCode) => {
  const order = ['MUSIC', 'ARTS', 'PE', 'HEALTH'];
  const code = subjectCode?.toUpperCase() || '';
  const idx = order.findIndex(o => code.includes(o));
  return idx === -1 ? 999 : idx;
};

// ─── main function ───────────────────────────────────────────────────────────
const printReportCard = ({
  student,
  teacherName   = 'AIVY M. GANAGANAG',
  principalName = 'GERRY C. DAYON',
  schoolYear    = '2025-2026',
  gradesData = null,
  subjects = []
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

  // ─── Build subject table rows (MAPEH as a single row) ─────────────────────
 const buildSubjectRows = () => {
  if (!gradesData || !subjects.length) {
    return '<tr><td colspan="7" style="text-align:center;">No grade data available</td></tr>';
  }

  const gradeSubjects = subjects.filter(sub => sub.gradeLevel === gradeLevel);
  const regular = gradeSubjects.filter(s => !isMapehComponent(s.subjectCode));
  const mapehComponents = gradeSubjects.filter(s => isMapehComponent(s.subjectCode));

  regular.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  let rows = '';

  // Helper to get grade as integer (no .00)
  const getGrade = (subjectId, quarter) => {
    const gradesForQuarter = gradesData[quarter] || [];
    const gradeObj = gradesForQuarter.find(g => g.subject_id === subjectId);
    if (!gradeObj) return '';
    const score = parseFloat(gradeObj.score);
    return isNaN(score) ? '' : Math.round(score);
  };

  const getRemarks = (subjectId, quarter) => {
    const gradesForQuarter = gradesData[quarter] || [];
    const gradeObj = gradesForQuarter.find(g => g.subject_id === subjectId);
    return gradeObj?.remarks || '';
  };

  // Final grade only if all quarters have a valid grade
  const getFinalGrade = (subjectId) => {
    let sum = 0;
    let allPresent = true;
    for (let q of quarters) {
      const score = getGrade(subjectId, q);
      if (score === '') {
        allPresent = false;
        break;
      }
      sum += score;
    }
    return allPresent ? Math.round(sum / quarters.length) : '';
  };

  const getFinalRemarks = (subjectId) => {
    for (let q of quarters) {
      const remark = getRemarks(subjectId, q);
      if (remark) return remark;
    }
    return '';
  };

  // Regular subjects
  regular.forEach(sub => {
    const q1 = getGrade(sub.id, 'Q1');
    const q2 = getGrade(sub.id, 'Q2');
    const q3 = getGrade(sub.id, 'Q3');
    const q4 = getGrade(sub.id, 'Q4');
    const finalGrade = getFinalGrade(sub.id);
    const remarks = getFinalRemarks(sub.id);
    rows += `<tr>
      <td>${sub.subjectName}</td>
      <td class="center">${q1 || ''}</td>
      <td class="center">${q2 || ''}</td>
      <td class="center">${q3 || ''}</td>
      <td class="center">${q4 || ''}</td>
      <td class="center"><strong>${finalGrade || ''}</strong></td>
      <td class="center">${remarks || ''}</td>
    </tr>`;
  });

  // MAPEH group
  if (mapehComponents.length > 0) {
    // Calculate quarterly averages for MAPEH (only if all components have that quarter's grade)
    const mapehQuarterGrades = quarters.map(quarter => {
      let sum = 0;
      let allPresent = true;
      for (let comp of mapehComponents) {
        const score = getGrade(comp.id, quarter);
        if (score === '') {
          allPresent = false;
          break;
        }
        sum += score;
      }
      return allPresent ? Math.round(sum / mapehComponents.length) : '';
    });
    // Final grade for MAPEH: only if all four quarterly averages are present
    const allQuartersPresent = mapehQuarterGrades.every(g => g !== '');
    const mapehFinalGrade = allQuartersPresent
      ? Math.round(mapehQuarterGrades.reduce((a,b) => a + b, 0) / quarters.length)
      : '';
    // Remarks (first non‑empty from any component)
    let mapehRemarks = '';
    for (let comp of mapehComponents) {
      const r = getFinalRemarks(comp.id);
      if (r) { mapehRemarks = r; break; }
    }
    // MAPEH main row (normal weight, not bold)
    rows += `<tr class="mapeh-row">
      <td>MAPEH</td>
      ${mapehQuarterGrades.map(g => `<td class="center">${g || ''}</td>`).join('')}
      <td class="center"><strong>${mapehFinalGrade || ''}</strong></td>
      <td class="center">${mapehRemarks || ''}</td>
    </tr>`;

    // Indented component rows (Music, Arts, PE, Health) – no final grade
    mapehComponents.forEach(comp => {
      const q1 = getGrade(comp.id, 'Q1');
      const q2 = getGrade(comp.id, 'Q2');
      const q3 = getGrade(comp.id, 'Q3');
      const q4 = getGrade(comp.id, 'Q4');
      const remarks = getFinalRemarks(comp.id);
      rows += `<tr class="mapeh-component">
        <td style="padding-left: 14px;">↳ ${comp.subjectName}</td>
        <td class="center">${q1 || ''}</td>
        <td class="center">${q2 || ''}</td>
        <td class="center">${q3 || ''}</td>
        <td class="center">${q4 || ''}</td>
        <td class="center"></td>   <!-- Keep dash as placeholder for "no final grade" for components -->
        <td class="center">${remarks || ''}</td>
      </tr>`;
    });
  }

  // General average: only include subjects that have a valid final grade
  let allFinalGrades = [];
  // Regular subjects
  regular.forEach(sub => {
    const f = getFinalGrade(sub.id);
    if (f !== '') allFinalGrades.push(f);
  });
  // MAPEH main subject (if exists)
  if (mapehComponents.length > 0) {
    const mapehQuarterGrades = quarters.map(quarter => {
      let sum = 0, allPresent = true;
      for (let comp of mapehComponents) {
        const score = getGrade(comp.id, quarter);
        if (score === '') { allPresent = false; break; }
        sum += score;
      }
      return allPresent ? Math.round(sum / mapehComponents.length) : '';
    });
    const allQuartersPresent = mapehQuarterGrades.every(g => g !== '');
    const mapehFinal = allQuartersPresent
      ? Math.round(mapehQuarterGrades.reduce((a,b) => a + b, 0) / quarters.length)
      : '';
    if (mapehFinal !== '') allFinalGrades.push(mapehFinal);
  }
  const genAvg = allFinalGrades.length ? Math.round(allFinalGrades.reduce((a,b)=>a+b,0) / allFinalGrades.length) : '';
  rows += `<tr class="total-row">
    <td><strong>General Average</strong></td>
    <td colspan="4"></td>
    <td class="center"><strong>${genAvg || ''}</strong></td>
    <td class="center">${typeof genAvg === 'number' ? (genAvg >= 75 ? 'Passed' : 'Failed') : ''}</td>
  </tr>`;

  return rows;
};

  // ─── Core values table (DepEd standard) ───────────────────────────────────
  const buildCoreValuesRows = () => {
    const coreValues = [
      { label: '1. Maka-Diyos', statements: [
        "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others.",
        "Shows adherence to ethical principles by upholding truth."
      ]},
      { label: '2. Makatao', statements: [
        "Is sensitive to individual, social and cultural differences.",
        "Demonstrates contributions toward solidarity."
      ]},
      { label: '3. Maka-kalikasan', statements: [
        "Cares for the environment and utilizes resources wisely, judiciously, and economically."
      ]},
      { label: '4. Makabansa', statements: [
        "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen.",
        "Demonstrates appropriate behavior in carrying out activities in the school, community, and country."
      ]}
    ];

    let rows = '';
    coreValues.forEach(cv => {
      const firstStmt = cv.statements[0];
      rows += `<tr>
        <td rowspan="${cv.statements.length}" class="core-label">${cv.label}</td>
        <td class="stmt">${firstStmt}</td>
        <td class="center"> </td>
        <td class="center"> </td>
        <td class="center"> </td>
        <td class="center"> </td>
      </tr>`;
      for (let i = 1; i < cv.statements.length; i++) {
        rows += `<tr>
          <td class="stmt">${cv.statements[i]}</td>
          <td class="center"> </td>
          <td class="center"> </td>
          <td class="center"> </td>
          <td class="center"> </td>
        </tr>`;
      }
    });
    return rows;
  };

  // ─── HTML Template (two pages) ────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Report Card – ${fullName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #fff;
      color: #000;
      font-size: 10pt;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: A4 landscape;
      margin: 0mm;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .page-break { page-break-before: always; }
    }

    .page {
      width: 277mm;
      min-height: 190mm;
      margin: 10mm 12mm;
      display: flex;
      gap: 10mm;
    }
    .left-col, .right-col {
      width: 50%;
      display: flex;
      flex-direction: column;
    }

    /* First page styles */
.att-title { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 3mm; }
.att-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; table-layout: fixed; }
.att-table th, .att-table td { border: 1px solid #000; text-align: center; vertical-align: middle; }
.col-label { width: 48px; }
.col-month { width: 20px; }
.col-total { width: 26px; }
.vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; white-space: nowrap; font-size: 7.5pt; }
.row-label { text-align: left; padding: 2px 3px; font-size: 7pt; }
.sig-section { margin-top: 10mm; }
.sig-heading { text-align: center; font-size: 10pt; font-weight: bold; margin-bottom: 6mm; }
.sig-row { display: flex; align-items: flex-end; gap: 4px; margin-bottom: 5mm; font-size: 10pt; white-space: nowrap; }
.sig-line { flex: 1; border-bottom: 1px solid #000; height: 14px; }

.gov-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 4mm; margin-bottom: 2mm; }
.gov-text { text-align: center; flex: 1; font-size: 9pt; }
.gov-text .dept { font-size: 11pt; font-weight: bold; }
.logo-deped, .logo-sics { width: 50px; height: 50px; object-fit: contain; flex-shrink: 0; }
.school-name { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 1mm; }
.school-addr { text-align: center; font-size: 7.5pt; margin-bottom: 0.5mm; }
.school-id { text-align: center; font-size: 8.5pt; margin-bottom: 3mm; }
.card-title { text-align: center; margin-bottom: 3mm; }
.card-title .main { font-size: 11pt; font-weight: bold; }

/* Student info – spaced properly */
.student-data {
  margin-bottom: 5mm;
  width: 100%;
}
.data-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 3mm;
  gap: 8mm;
  flex-wrap: wrap;
}
.top-row .data-group:first-child {
  flex: 2;               /* Name takes more space */
}
.top-row .data-group:last-child {
  flex: 1;
  text-align: right;
}
.bottom-row .data-group {
  flex: 1;
}
.lrn-group {
  text-align: right;
  flex: 1;
}
.data-group {
  display: flex;
  align-items: baseline;
  gap: 3px;
  white-space: nowrap;
}
.data-label {
  font-weight: normal;
  white-space: nowrap;
}
.data-value {
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dear-parent { font-style: italic; font-size: 9pt; margin-bottom: 3mm; }
.official-sigs { display: flex; justify-content: space-between; margin-bottom: 3mm; }
.official-sig-block { text-align: center; }
.official-sig-name { display: inline-block; border-bottom: 1.5px solid #000; font-size: 10pt; min-width: 120px; padding-bottom: 1px; }
.official-sig-role { font-size: 9pt; margin-top: 1px; }
.section-rule { border: none; border-top: 1px solid #000; margin: 3mm 0; }
.cert-title { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }
.cert-row { display: flex; align-items: flex-end; gap: 3px; margin-bottom: 2mm; font-size: 9pt; }
.cert-line { border-bottom: 1px solid #000; height: 14px; flex: 1; }
.cert-sigs { display: flex; justify-content: space-between; margin: 3mm 0 0 8mm; }
.cert-sig-name, .cert-sig-blank { display: inline-block; border-bottom: 1px solid #000; min-width: 110px; height: 14px; }
.cert-sig-role { font-size: 9pt; margin-top: 1px; }
.cancel-title { text-align: center; font-size: 10pt; font-weight: bold; margin: 3mm 0 2mm; }
.cancel-bottom { display: flex; justify-content: flex-end; margin-top: 4mm; }
.cancel-sig-blank { display: block; border-bottom: 1px solid #000; width: 110px; height: 14px; }
.cancel-sig-role { font-size: 9pt; text-align: center; margin-top: 1px; }

    /* Second page styles */
    .p2-section-title {
  font-family: 'Times New Roman', Times, serif;
  font-size: 11pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  margin-bottom: 3mm;
  letter-spacing: 0.3px;
}

.p2-table {
  font-family: 'Times New Roman', Times, serif;
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 0;
  flex: 1;
}
.p2-table th, .p2-table td {
  border: 1px solid #000;
  padding: 6px 5px;
  vertical-align: middle;
}
.p2-table th {
  font-weight: bold;
  text-align: center;
  font-size: 9pt;
}
.p2-table td.center { text-align: center; }
.p2-table td:first-child { text-align: left; }
.p2-col-q { width: 30px; text-align: center; }
.p2-col-final { width: 45px; text-align: center; }
.p2-col-remarks { width: 55px; text-align: center; }

.total-row td { font-weight: bold; background-color: #d9d9d9; }
.mapeh-row td { font-weight: normal; }
.mapeh-component td:first-child {
  padding-left: 14px;
  font-style: italic;
}

/* Left and right columns stretch to full height */
.left-col, .right-col {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.left-col > .p2-table, .right-col > .p2-table {
  flex: 1;
  margin-bottom: 2mm;
}

/* Footer grids – stay at bottom */
.p2-footer-grid {
  font-family: 'Times New Roman', Times, serif;
  display: flex;
  gap: 10mm;
  margin-top: auto;
  width: 100%;
}
.p2-footer-col { flex: 1; }
.p2-footer-col p { margin: 2px 0; font-size: 8.5pt; }
.p2-footer-col p.head { font-weight: bold; margin-bottom: 2px; font-size: 9.5pt; }

.core-label {
  font-family: 'Times New Roman', Times, serif;
  font-weight: bold;
  vertical-align: middle;
  text-align: center;
  font-size: 9pt;
}
.stmt {
  font-family: 'Times New Roman', Times, serif;
  text-align: left;
  font-size: 8.5pt;
  line-height: 1.3;
}
.p2-marking-grid {
  font-family: 'Times New Roman', Times, serif;
  display: flex;
  gap: 10mm;
  margin-top: auto;
  margin-bottom: 0;
}
.p2-marking-col p { margin: 1px 0; font-size: 8.5pt; }
.p2-marking-col p.head { font-weight: bold; margin-bottom: 2px; font-size: 9.5pt; }
  </style>
</head>
<body>

<!-- PAGE 1 (unchanged) -->
<div class="page">
  <div class="left-col">
    <div class="att-title">Report on Attendance</div>
    <table class="att-table">
      <colgroup>
        <col class="col-label">
        ${Array(10).fill('<col class="col-month">').join('')}
        <col class="col-total">
      </colgroup>
      <thead>
        <tr><th></th>
        ${['July','August','September','October','November','December','January','February','March','April'].map(m => `<th><span class="vertical-text">${m}</span></th>`).join('')}
        <th style="font-size:7pt;">Total</th>
      </tr>
      </thead>
      <tbody>
        <tr><td class="row-label">No. of<br>School<br>days</td>${Array(10).fill('<td> </td>').join('')}<td> </td></tr>
        <tr><td class="row-label">No. of<br>days<br>present</td>${Array(10).fill('<td> </td>').join('')}<td> </td></tr>
        <tr><td class="row-label">No. of<br>days<br>absent</td>${Array(10).fill('<td> </td>').join('')}<td> </td></tr>
      </tbody>
    </table>
    <div class="sig-section">
      <div class="sig-heading">PARENT'S / GUARDIAN'S SIGNATURE</div>
      <div class="sig-row">1<sup>st</sup>&nbsp;Quarter<div class="sig-line"></div></div>
      <div class="sig-row">2<sup>nd</sup>&nbsp;Quarter<div class="sig-line"></div></div>
      <div class="sig-row">3<sup>rd</sup>&nbsp;Quarter<div class="sig-line"></div></div>
      <div class="sig-row">4<sup>th</sup>&nbsp;Quarter<div class="sig-line"></div></div>
    </div>
  </div>
  <div class="right-col">
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
  <div class="data-row top-row">
    <div class="data-group"><span class="data-label">Name:&nbsp;</span><span class="data-value">${fullName}</span></div>
    <div class="data-group"><span class="data-label">Level:&nbsp;</span><span class="data-value">${gradeLevel}</span></div>
  </div>
  <div class="data-row bottom-row">
    <div class="data-group"><span class="data-label">Age:&nbsp;</span><span class="data-value">${age}</span></div>
    <div class="data-group"><span class="data-label">Gender:&nbsp;</span><span class="data-value">${gender}</span></div>
    <div class="data-group lrn-group"><span class="data-label">LRN:&nbsp;</span><span class="data-value">${lrn}</span></div>
  </div>
</div>
    <div class="dear-parent">
      <div>Dear Parent,</div>
      <div>This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values.</div>
      <div>The school welcomes you if you desire to know more about your child's progress.</div>
    </div>
    <div class="official-sigs">
      <div class="official-sig-block"><div class="official-sig-name">${teacherName}</div><div class="official-sig-role">Teacher</div></div>
      <div class="official-sig-block"><div class="official-sig-name">${principalName}</div><div class="official-sig-role">Principal</div></div>
    </div>
    <hr class="section-rule">
    <div class="cert-title">CERTIFICATE OF TRANSFER</div>
    <div class="cert-row">Admitted to Grade:&nbsp;<div class="cert-line"></div>&nbsp;Section:&nbsp;<div class="cert-line"></div></div>
    <div class="cert-row">Eligible for Admission/Transfer to Grade:&nbsp;<div class="cert-line"></div></div>
    <div class="cert-sigs">
      <div><div class="cert-sig-name">${principalName}</div><div class="cert-sig-role">Principal</div></div>
      <div><div class="cert-sig-blank"></div><div class="cert-sig-role">Teacher</div></div>
    </div>
    <div class="cancel-title">Cancellation of Eligibility to Transfer</div>
    <div>Admitted in: __________________________________</div>
    <div>Date: ________________________________________</div>
    <div class="cancel-bottom"><div><span class="cancel-sig-blank"></span><div class="cancel-sig-role">Principal</div></div></div>
  </div>
</div>

<!-- PAGE 2 -->
<div class="page page-break">
  <div class="left-col">
    <div class="p2-section-title">Report on Learning Progress and Achievement</div>
    <table class="p2-table">
      <colgroup>
        <col style="width:38%;">
        <col class="p2-col-q"><col class="p2-col-q"><col class="p2-col-q"><col class="p2-col-q">
        <col class="p2-col-final">
        <col class="p2-col-remarks">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2" style="text-align:left;">Learning Area</th>
          <th colspan="4">QUARTER</th>
          <th rowspan="2">Final<br>Grade</th>
          <th rowspan="2">Remarks</th>
        </tr>
        <tr>
          <th>1</th><th>2</th><th>3</th><th>4</th>
        </tr>
      </thead>
      <tbody>
        ${buildSubjectRows()}
      </tbody>
    </table>
    <div class="p2-footer-grid">
  <div class="p2-footer-col">
    <p class="head">Description</p>
    <p>Outstanding</p>
    <p>Very Satisfactory</p>
    <p>Satisfactory</p>
    <p>Fairly Satisfactory</p>
    <p>Did not meet expectations</p>
  </div>
  <div class="p2-footer-col">
    <p class="head">Grading Scale</p>
    <p>90-100</p>
    <p>85-89</p>
    <p>80-84</p>
    <p>75-79</p>
    <p>Below 75</p>
  </div>
  <div class="p2-footer-col">
    <p class="head">Remarks</p>
    <p>Passed</p>
    <p>Passed</p>
    <p>Passed</p>
    <p>Passed</p>
    <p>Failed</p>
  </div>
</div>
  </div>
  <div class="right-col">
    <div class="p2-section-title">Report on Learner's Observed Values</div>
    <table class="p2-table">
      <colgroup>
        <col style="width:22%;">
        <col style="width:42%;">
        <col class="p2-col-q"><col class="p2-col-q"><col class="p2-col-q"><col class="p2-col-q">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2">Core<br>Values</th>
          <th rowspan="2">Behavior Statements</th>
          <th colspan="4">QUARTER</th>
        </tr>
        <tr>
          <th>1</th><th>2</th><th>3</th><th>4</th>
        </tr>
      </thead>
      <tbody>
        ${buildCoreValuesRows()}
      </tbody>
    </table>
    <div class="p2-marking-grid">
      <div class="p2-marking-col">
        <p class="head">Marking</p>
        <p>AO</p>
        <p>SO</p>
        <p>RO</p>
        <p>NO</p>
      </div>
      <div class="p2-marking-col">
        <p class="head">Non-numerical Rating</p>
        <p>Always Observed</p>
        <p>Sometimes Observed</p>
        <p>Rarely Observed</p>
        <p>Not Observed</p>
      </div>
    </div>
  </div>
</div>

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

  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site to print the report card.');
    return;
  }
  win.document.write(html);
  win.document.close();
};

export default printReportCard;