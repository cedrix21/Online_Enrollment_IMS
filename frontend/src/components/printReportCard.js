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

// Sort order based on subject code: MUSIC, ARTS, PE, HEALTH
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
  gradesData = null,        // { Q1: [...grades], Q2: [...grades], Q3: [...grades], Q4: [...] }
  subjects = []             // list of subjects (each with id, subjectName, subjectCode, gradeLevel)
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

  // ─── Build subject table rows (dynamic, no hardcoded names) ─────────────────
  const buildSubjectRows = () => {
    console.log('🔍 DEBUG printReportCard:');
    console.log('  - gradesData:', gradesData);
    console.log('  - subjects:', subjects);
    console.log('  - student.gradeLevel:', gradeLevel);
    
    if (!gradesData || !subjects.length) {
      console.warn('Missing gradesData or subjects');
      return '<tr><td colspan="6">No grade data available</td></tr>';
    }

    // Get subjects for this student's grade level
    const gradeSubjects = subjects.filter(sub => sub.gradeLevel === gradeLevel);
    console.log('  - gradeSubjects (filtered):', gradeSubjects);
    const regular = gradeSubjects.filter(s => !isMapehComponent(s.subjectCode));
    let mapeh = gradeSubjects.filter(s => isMapehComponent(s.subjectCode));
    // Sort MAPEH components by their code (MUSIC → ARTS → PE → HEALTH)
    mapeh.sort((a, b) => getMapehOrderIndex(a.subjectCode) - getMapehOrderIndex(b.subjectCode));
    // Sort regular subjects alphabetically by name
    regular.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    let rows = '';

    const getGrade = (subjectId, quarter) => {
      const gradesForQuarter = gradesData[quarter] || [];
      const gradeObj = gradesForQuarter.find(g => g.subject_id === subjectId);
      return gradeObj ? gradeObj.score : '';
    };

    const getRemarks = (subjectId, quarter) => {
      const gradesForQuarter = gradesData[quarter] || [];
      const gradeObj = gradesForQuarter.find(g => g.subject_id === subjectId);
      return gradeObj?.remarks || '';
    };

    const getFinalGrade = (subjectId) => {
      let sum = 0, count = 0;
      quarters.forEach(q => {
        const score = parseFloat(getGrade(subjectId, q));
        if (!isNaN(score)) { sum += score; count++; }
      });
      return count ? Math.round(sum / count) : '';
    };

    const getFinalRemarks = (subjectId) => {
      for (let q of quarters) {
        const remark = getRemarks(subjectId, q);
        if (remark) return remark;
      }
      return '';
    };

    // 1. Regular subjects
    regular.forEach(sub => {
      const q1 = getGrade(sub.id, 'Q1');
      const q2 = getGrade(sub.id, 'Q2');
      const q3 = getGrade(sub.id, 'Q3');
      const q4 = getGrade(sub.id, 'Q4');
      const finalGrade = getFinalGrade(sub.id);
      const remarks = getFinalRemarks(sub.id);
      rows += `<tr>
        <td>${sub.subjectName}</td>
        <td class="center">${q1 || '—'}</td>
        <td class="center">${q2 || '—'}</td>
        <td class="center">${q3 || '—'}</td>
        <td class="center">${q4 || '—'}</td>
        <td class="center"><strong>${finalGrade || '—'}</strong></td>
        <td class="center">${remarks || '—'}</td>
      </tr>`;
    });

    // 2. MAPEH heading + component rows (only if any)
    if (mapeh.length) {
      rows += `<tr class="mapeh-heading">
        <td><strong>MAPEH</strong></td>
        <td colspan="6"></td>
      </tr>`;
      mapeh.forEach(sub => {
        const q1 = getGrade(sub.id, 'Q1');
        const q2 = getGrade(sub.id, 'Q2');
        const q3 = getGrade(sub.id, 'Q3');
        const q4 = getGrade(sub.id, 'Q4');
        const finalGrade = getFinalGrade(sub.id);
        const remarks = getFinalRemarks(sub.id);
        rows += `<tr class="mapeh-component">
          <td style="padding-left: 20px;">↳ ${sub.subjectName}</td>
          <td class="center">${q1 || '—'}</td>
          <td class="center">${q2 || '—'}</td>
          <td class="center">${q3 || '—'}</td>
          <td class="center">${q4 || '—'}</td>
          <td class="center"><strong>${finalGrade || '—'}</strong></td>
          <td class="center">${remarks || '—'}</td>
        </tr>`;
      });
    }

    // General average (average of all final grades)
    let allFinalGrades = [];
    regular.forEach(sub => { let f = getFinalGrade(sub.id); if (f) allFinalGrades.push(f); });
    mapeh.forEach(sub => { let f = getFinalGrade(sub.id); if (f) allFinalGrades.push(f); });
    const genAvg = allFinalGrades.length ? Math.round(allFinalGrades.reduce((a,b)=>a+b,0)/allFinalGrades.length) : '—';
    rows += `<tr class="total-row">
      <td><strong>General Average</strong></td>
      <td colspan="6" class="center"><strong>${genAvg}</strong></td>
    </tr>`;

    return rows;
  };

  // ─── Core values table (static – DepEd standard) ──────────────────────────
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
        <td class="center">  </td><td class="center">  </td><td class="center">  </td><td class="center">  </td>
      </tr>`;
      for (let i = 1; i < cv.statements.length; i++) {
        rows += `<tr>
          <td class="stmt">${cv.statements[i]}</td>
          <td class="center">  </td><td class="center">  </td><td class="center">  </td><td class="center">  </td>
        </tr>`;
      }
    });
    return rows;
  };

  // ─── HTML (two pages) ─────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Report Card – ${fullName}</title>
  <style>
    /* Reset & base */
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
    @page {
      size: A4 landscape;
      margin: 0mm;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .page-break { page-break-before: always; }
    }

    /* Page container */
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
    .student-data { margin-bottom: 3mm; font-size: 9.5pt; }
    .data-row { display: flex; gap: 6mm; margin-bottom: 1.5mm; flex-wrap: wrap; }
    .data-group { display: flex; align-items: baseline; gap: 3px; }
    .data-label { white-space: nowrap; }
    .data-value { font-weight: bold; text-decoration: underline; text-underline-offset: 2px; }
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
    .grades-title, .core-values-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    .grades-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 3mm;
    }
    .grades-table th, .grades-table td {
      border: 1px solid #000;
      padding: 2px 3px;
      vertical-align: top;
    }
    .grades-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
    }
    .grades-table td.center {
      text-align: center;
    }
    .grades-table td:first-child {
      text-align: left;
    }
    .mapeh-heading {
      background-color: #f9f9f9;
      font-weight: bold;
    }
    .mapeh-component td:first-child {
      padding-left: 15px;
      font-style: italic;
    }
    .total-row {
      background-color: #e6e6e6;
      font-weight: bold;
    }
    .core-values-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 3mm;
    }
    .core-values-table th, .core-values-table td {
      border: 1px solid #000;
      padding: 2px 3px;
      vertical-align: top;
    }
    .core-values-table th {
      background-color: #f0f0f0;
      text-align: center;
      font-weight: bold;
      font-size: 7pt;
    }
    .core-label {
      font-weight: bold;
      vertical-align: middle;
      text-align: center;
      font-size: 7.5pt;
    }
    .stmt {
      text-align: left;
      font-size: 7pt;
    }
    .legend {
      margin-top: 2mm;
      font-size: 7pt;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }
    .legend-group {
      border: 1px solid #aaa;
      padding: 2mm;
    }
    .legend-group strong {
      display: block;
      margin-bottom: 1mm;
      font-size: 8pt;
    }
    .legend-group div {
      line-height: 1.3;
    }
  </style>
</head>
<body>
<!-- PAGE 1 -->
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
        <tr><td class="row-label">No. of<br>School<br>days</td>${Array(10).fill('<td></td>').join('')}<td></td></tr>
        <tr><td class="row-label">No. of<br>days<br>present</td>${Array(10).fill('<td></td>').join('')}<td></td></tr>
        <tr><td class="row-label">No. of<br>days<br>absent</td>${Array(10).fill('<td></td>').join('')}<td></td></tr>
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
      <div class="data-row">
        <div class="data-group"><span class="data-label">Name:&nbsp;</span><span class="data-value">${fullName}</span></div>
        <div class="data-group"><span class="data-label">Level:&nbsp;</span><span class="data-value">${gradeLevel}</span></div>
      </div>
      <div class="data-row">
        <div class="data-group"><span class="data-label">Age:&nbsp;</span><span class="data-value">${age}</span></div>
        <div class="data-group"><span class="data-label">Gender:&nbsp;</span><span class="data-value">${gender}</span></div>
        <div class="data-group"><span class="data-label">LRN:&nbsp;</span><span class="data-value">${lrn}</span></div>
      </div>
    </div>
    <div class="dear-parent">
      <div class="salutation">Dear Parent,</div>
      <div class="body">This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values. The school welcomes you if you desire to know more about your child's progress.</div>
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
      <div class="cert-sig-block"><div class="cert-sig-name">${principalName}</div><div class="cert-sig-role">Principal</div></div>
      <div class="cert-sig-block"><div class="cert-sig-blank"></div><div class="cert-sig-role">Teacher</div></div>
    </div>
    <div class="cancel-title">Cancellation of Eligibility to Transfer</div>
    <div class="cancel-row">Admitted in:</div>
    <div class="cancel-row">Date:</div>
    <div class="cancel-bottom"><div><span class="cancel-sig-blank"></span><div class="cancel-sig-role">Principal</div></div></div>
  </div>
</div>

<!-- PAGE 2 -->
<div class="page page-break">
  <div class="left-col">
    <div class="grades-title">Progress in Learning Areas</div>
    <table class="grades-table">
      <thead>
        <tr>
          <th>Learning Area</th>
          <th>1</th><th>2</th><th>3</th><th>4</th>
          <th>Final</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${buildSubjectRows()}
      </tbody>
    </table>
  </div>

  <div class="right-col">
    <div class="core-values-title">Observed Values</div>
    <table class="core-values-table">
      <thead>
        <tr><th style="width: 25%;">Core Values</th><th style="width: 40%;">Behavior Statements</th><th>1</th><th>2</th><th>3</th><th>4</th></tr>
      </thead>
      <tbody>
        ${buildCoreValuesRows()}
      </tbody>
    </table>

    <div class="legend">
      <div class="legend-group">
        <strong>Grading Scale</strong>
        <div>Outstanding &nbsp; 90-100</div>
        <div>Very Satisfactory &nbsp; 85-89</div>
        <div>Satisfactory &nbsp; 80-84</div>
        <div>Fairly Satisfactory &nbsp; 75-79</div>
        <div>Did Not Meet &nbsp; 74 &amp; below</div>
      </div>
      <div class="legend-group">
        <strong>Rating</strong>
        <div>AO – Always</div>
        <div>SO – Sometimes</div>
        <div>RO – Rarely</div>
        <div>NO – Not Observed</div>
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