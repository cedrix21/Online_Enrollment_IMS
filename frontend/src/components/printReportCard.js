// src/components/printReportCard.js

const printReportCard = ({
  student,
  teacherName = 'ROGELYN A. PATRICIO',
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
  <title>Report Card - ${student.lastName}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .report-card {
      width: 1100px;
      background: white;
      border: 2px solid #000;
      padding: 25px 30px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .row {
      display: flex;
    }
    .left-col {
      width: 32%;
      border-right: 1px solid #000;
      padding-right: 20px;
      margin-right: 20px;
    }
    .right-col {
      width: 68%;
    }
    h2 {
      font-size: 16pt;
      text-align: center;
      margin: 5px 0 10px;
      font-weight: bold;
      text-transform: uppercase;
    }
    h3 {
      font-size: 14pt;
      margin: 15px 0 8px;
      font-weight: bold;
      text-transform: uppercase;
    }
    h4 {
      font-size: 12pt;
      font-weight: bold;
      margin: 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #000;
      padding: 4px 2px;
      text-align: center;
      vertical-align: middle;
    }
    .attendance-table th {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .sig-line {
      display: flex;
      align-items: baseline;
      margin: 10px 0;
      font-size: 11pt;
    }
    .sig-line span {
      flex: 1;
      border-bottom: 1px solid #000;
      margin-left: 8px;
      height: 1.2em;
    }
    .school-header {
      text-align: center;
      margin-bottom: 15px;
    }
    .school-header p {
      margin: 0;
      font-size: 11pt;
    }
    .school-header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin: 2px 0;
    }
    .learner-info {
      margin: 15px 0;
    }
    .info-line {
      display: flex;
      font-size: 11pt;
      margin: 5px 0;
    }
    .info-line strong {
      font-weight: bold;
      text-decoration: underline;
      margin-left: 5px;
    }
    .info-item {
      display: flex;
      align-items: baseline;
      margin-right: 25px;
    }
    .message {
      font-style: italic;
      margin: 15px 0;
      font-size: 10.5pt;
      line-height: 1.3;
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      margin: 15px 0 20px;
    }
    .signature {
      text-align: center;
    }
    .signature .name {
      font-weight: bold;
      text-decoration: underline;
      font-size: 11pt;
    }
    .transfer {
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 15px;
    }
    .transfer p {
      margin: 5px 0;
      font-size: 10.5pt;
    }
    .blank {
      display: inline-block;
      width: 140px;
      border-bottom: 1px solid #000;
      margin: 0 5px;
    }
    .float-left {
      float: left;
      width: 45%;
    }
    .float-right {
      float: right;
      width: 45%;
    }
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
    }
    @media print {
      body { background: white; padding: 0; }
      .report-card { box-shadow: none; border: 2px solid #000; }
    }
  </style>
</head>
<body>
<div class="report-card">
  <div class="row">
    <!-- LEFT COLUMN -->
    <div class="left-col">
      <h2>Report on Attendance</h2>
      <table class="attendance-table">
        <thead>
          <tr>
            <th></th>
            <th>Day</th>
            <th>Month</th>
            <th>Semester</th>
            <th>Order</th>
            <th>Number</th>
            <th>January</th>
            <th>February</th>
            <th>March</th>
            <th>April</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>No. of school days</td>
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td>No. of days present</td>
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td>No. of days absent</td>
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>

      <h3>PARENT'S / GUARDIAN'S SIGNATURE</h3>
      <div class="sig-line">1<sup>st</sup> Quarter <span></span></div>
      <div class="sig-line">2<sup>nd</sup> Quarter <span></span></div>
      <div class="sig-line">3<sup>rd</sup> Quarter <span></span></div>
      <div class="sig-line">4<sup>th</sup> Quarter <span></span></div>
    </div>

    <!-- RIGHT COLUMN -->
    <div class="right-col">
      <div class="school-header">
        <p>Republic of the Philippines</p>
        <h1>DEPARTMENT OF EDUCATION</h1>
        <p>Negros Island Region</p>
        <div style="margin-top: 10px;">
          <strong style="font-size: 14pt;">SILOAM INTERNATIONAL CHRISTIAN SCHOOL</strong><br>
          <span style="font-size: 9pt;">Purok Bayanihan, Motong Dumaguete City, Negros Oriental 6200 Philippines</span><br>
          <strong>School ID: 448012</strong>
        </div>
      </div>

      <h2>LEARNER'S PROGRESS REPORT CARD</h2>
      <p style="text-align: center; font-weight: bold; font-size: 11pt;">GRADE SCHOOL &nbsp; S.Y.: <strong>${schoolYear}</strong></p>

      <div class="learner-info">
        <div class="info-line">
          <div class="info-item">Name: <strong>${student.lastName}, ${student.firstName} ${student.middleName || ''}</strong></div>
          <div class="info-item">Level: <strong>${student.gradeLevel}</strong></div>
        </div>
        <div class="info-line">
          <div class="info-item">Age: <strong>${getAge()}</strong></div>
          <div class="info-item">Gender: <strong>${student.gender || '—'}</strong></div>
          <div class="info-item">LRN: <strong>${student.studentId}</strong></div>
        </div>
      </div>

      <div class="message">
        <p>Dear Parent,</p>
        <p>This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values.</p>
        <p>The school welcomes you if you desire to know more about your child's progress.</p>
      </div>

      <div class="signatures">
        <div class="signature">
          <div class="name">${teacherName}</div>
          <div>Teacher</div>
        </div>
        <div class="signature">
          <div class="name">${principalName}</div>
          <div>Principal</div>
        </div>
      </div>

      <div class="transfer">
        <h3 style="text-align: center;">CERTIFICATE OF TRANSFER</h3>
        <p>Admitted to Grade: <span class="blank"></span> Section: <span class="blank"></span></p>
        <p>Eligible for Admission/Transfer to Grade: <span class="blank"></span></p>
        <div class="clearfix" style="margin: 10px 0;">
          <div class="signature float-left">
            <div class="name">${principalName}</div>
            <div>Principal</div>
          </div>
          <div class="signature float-right">
            <div class="name">_____________________</div>
            <div>Teacher</div>
          </div>
        </div>
        <h4 style="text-align: center;">Cancellation of Eligibility to Transfer</h4>
        <p>Admitted in: <span class="blank"></span> Date: <span class="blank"></span></p>
        <p>Principal: _____________________</p>
      </div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) {
    alert('Pop‑up blocked. Please allow pop‑ups for this site.');
    return;
  }
  win.document.write(html);
  win.document.close();
};

export default printReportCard;