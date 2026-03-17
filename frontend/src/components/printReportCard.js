// src/components/printReportCard.js
import { DEPED_LOGO_BASE64, SICS_LOGO_BASE64 } from '../constants/reportImages';

const printReportCard = ({
  student,
  teacherName = 'AIVY M. GANAGANAG',
  principalName = 'GERRY C. DAYON',
  schoolYear = '2025-2026'
}) => {
  if (!student) {
    console.error('No student data provided');
    return;
  }

  const getAge = () => {
    if (!student.dateOfBirth) return '—';
    const birthDate = new Date(student.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; background: #fff; color: #000; line-height: 1.2; }
    .page { width: 210mm; min-height: 297mm; padding: 10mm 12mm; margin: 0 auto; position: relative; }
    .logo { width: 55px; height: auto; }
    /* Layout Columns */
    .container { display: flex; gap: 8mm; }
    .left-col { width: 42%; border-right: 1px dashed #999; padding-right: 8mm; }
    .right-col { width: 58%; padding-left: 4mm; }

    /* Attendance Table */
    .attendance-title { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }
    .attendance-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .attendance-table th, .attendance-table td { border: 1px solid #000; text-align: center; height: 22px; }
    .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); padding: 5px 1px; height: 60px; font-weight: normal; }
    .row-label { text-align: left; padding-left: 3px; width: 80px; font-size: 7.5pt; }

    /* Header Styling */
    .header-wrapper { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4mm; }
    .school-info { text-align: center; flex-grow: 1; }
    .school-info p { font-size: 9pt; margin: 0; }
    .school-info h2 { font-size: 11pt; margin: 1mm 0; }
    .school-info .sics-name { font-size: 12pt; font-weight: bold; margin-top: 2mm; }
    .school-info .address { font-size: 7.5pt; }
    .logo { width: 45px; height: auto; }

    /* Student Info Grid */
    .student-data { margin: 4mm 0; font-size: 10pt; }
    .data-row { display: flex; margin-bottom: 1.5mm; }
    .field { border-bottom: 1.5px solid #000; font-weight: bold; padding: 0 4px; margin-left: 4px; flex-grow: 1; }
    
    /* Signature Lines */
    .sig-row { display: flex; align-items: flex-end; margin-bottom: 3mm; font-size: 10pt; }
    .sig-line { border-bottom: 1px solid #000; flex-grow: 1; margin-left: 5px; height: 14px; }

    /* Official Signature Blocks */
    .signature-grid { display: flex; justify-content: space-between; margin-top: 6mm; text-align: center; }
    .sig-block { width: 45%; }
    .sig-name { font-weight: bold; border-bottom: 1px solid #000; display: block; padding-bottom: 1px; font-size: 10.5pt; }
    .sig-label { font-size: 9pt; margin-top: 2px; }

    .transfer-section { border-top: none; margin-top: 5mm; }
    .section-head { text-align: center; font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 2mm; }
  </style>
</head>
<body>
<div class="page">
  <div class="container">
    <div class="left-col">
      <div class="attendance-title">Report on Attendance</div>
      <table class="attendance-table">
        <thead>
          <tr>
            <th class="row-label"></th>
            <th class="vertical-text">July</th><th class="vertical-text">August</th><th class="vertical-text">Sept</th>
            <th class="vertical-text">Oct</th><th class="vertical-text">Nov</th><th class="vertical-text">Dec</th>
            <th class="vertical-text">Jan</th><th class="vertical-text">Feb</th><th class="vertical-text">March</th>
            <th class="vertical-text">April</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="row-label">No. of School days</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td class="row-label">No. of days present</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td class="row-label">No. of days absent</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>

      <div style="margin: 25mm 0 5mm 0; font-weight: bold; font-size: 10pt; text-align: center;">PARENT'S / GUARDIAN'S SIGNATURE</div>
      <div class="sig-row">1<sup>st</sup> Quarter <div class="sig-line"></div></div>
      <div class="sig-row">2<sup>nd</sup> Quarter <div class="sig-line"></div></div>
      <div class="sig-row">3<sup>rd</sup> Quarter <div class="sig-line"></div></div>
      <div class="sig-row">4<sup>th</sup> Quarter <div class="sig-line"></div></div>
    </div>

    <div class="right-col">
      <div class="header-wrapper">
        <img src="${DEPED_LOGO_BASE64}" class="logo" alt="DepEd">

        <div class="school-info">
          <p>Republic of the Philippines</p>
          <h2>DEPARTMENT OF EDUCATION</h2>
          <p>Negros Island Region</p>
          <div class="sics-name">Siloam International Christian School</div>
          <p class="address">Purok Bayanihan, Motong Dumaguete City, Negros Oriental 6200 Philippines</p>
          <p><strong>School ID: 448012</strong></p>
        </div>
        <img src="${SICS_LOGO_BASE64}" class="logo" alt="SICS">
      </div>

      <div style="text-align:center; margin-bottom:4mm;">
        <h3 style="font-size: 11pt;">LEARNER'S PROGRESS REPORT CARD</h3>
        <p style="font-size: 9pt;"><strong>GRADE SCHOOL</strong></p>
        <p style="font-size: 9pt;"><strong>S.Y.: ${schoolYear}</strong></p>
      </div>

      <div class="student-data">
        <div class="data-row">Name: <span class="field">${student.lastName}, ${student.firstName} ${student.middleName || ''}</span></div>
        <div class="data-row" style="justify-content: space-between;">
           <div style="flex: 1; display:flex;">Level: <span class="field">${student.gradeLevel}</span></div>
           <div style="flex: 1; display:flex; margin-left: 4mm;">Age: <span class="field">${getAge()}</span></div>
        </div>
        <div class="data-row" style="justify-content: space-between;">
           <div style="flex: 1; display:flex;">Gender: <span class="field">${student.gender}</span></div>
           <div style="flex: 1; display:flex; margin-left: 4mm;">LRN: <span class="field">${student.studentId}</span></div>
        </div>
      </div>

      <div style="font-size: 9pt; line-height: 1.3; margin: 4mm 0;">
        <p>Dear Parent,</p>
        <p style="text-indent: 15px;">This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values. The school welcomes you if you desire to know more about your child's progress.</p>
      </div>

      <div class="signature-grid">
        <div class="sig-block">
          <span class="sig-name">${teacherName}</span>
          <div class="sig-label">Teacher</div>
        </div>
        <div class="sig-block">
          <span class="sig-name">${principalName}</span>
          <div class="sig-label">Principal</div>
        </div>
      </div>

      <div class="transfer-section">
        <div class="section-head" style="margin-top: 8mm;">Certificate of Transfer</div>
        <div class="sig-row">Admitted to Grade: <div class="sig-line"></div> Section: <div class="sig-line"></div></div>
        <div class="sig-row">Eligible for Admission/Transfer to Grade: <div class="sig-line"></div></div>

        <div class="signature-grid" style="margin-top: 4mm;">
          <div class="sig-block">
            <span class="sig-name">${principalName}</span>
            <div class="sig-label">Principal</div>
          </div>
          <div class="sig-block">
            <span class="sig-name">&nbsp;</span>
            <div class="sig-label">Teacher</div>
          </div>
        </div>

        <div class="section-head" style="margin-top: 6mm; font-size: 9pt;">Cancellation of Eligibility to Transfer</div>
        <div class="sig-row">Admitted in: <div class="sig-line"></div> Date: <div class="sig-line"></div></div>
        <div class="signature-grid" style="justify-content: flex-end;">
          <div class="sig-block">
            <span class="sig-name">&nbsp;</span>
            <div class="sig-label">Principal</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
};

export default printReportCard;