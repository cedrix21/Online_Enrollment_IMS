// src/pages/Form137.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/api';
import { SICS_LOGO_BASE64 } from '../constants/reportImages';
import { useOptimizedFetch } from '../hooks/useOptimizedFetch';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';

// ─── constants ───────────────────────────────────────────────────────────────

const GRADES = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const romanToGrade = {
  I: 'Grade 1',
  II: 'Grade 2',
  III: 'Grade 3',
  IV: 'Grade 4',
  V: 'Grade 5',
  VI: 'Grade 6',
};

const gradeToRoman = {
  'Grade 1': 'I',
  'Grade 2': 'II',
  'Grade 3': 'III',
  'Grade 4': 'IV',
  'Grade 5': 'V',
  'Grade 6': 'VI',
};

const CORE_VALUES = [
  { key: 'makaDiyos',      label: '1. Maka-Diyos',    statement: "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others" },
  { key: 'makatao',        label: '2. Makatao',        statement: 'Shows adherence to ethical principles by upholding truth' },
  { key: 'makakalikasan',  label: '3. Maka-kalikasan', statement: 'Cares for the environment and utilizes resources wisely, judiciously, and economically' },
  { key: 'makabansa1',     label: '4. Makabansa',      statement: 'Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen.' },
  { key: 'makabansa2',     label: '',                  statement: 'Demonstrates appropriate behavior in carrying out activities in the school, community, and country' },
];

const makeGradeData = () => ({
  school: '', schoolYear: '', subjects: {}, eligible: '',
});

const makeAttendance = () =>
  Object.fromEntries(GRADES.map(g => [g, { schoolDays: '', absent: '', cause1: '', tardy: '', cause2: '', present: '' }]));

const makeObserved = () =>
  Object.fromEntries(
    GRADES.map(g => [g, Object.fromEntries(CORE_VALUES.map(cv => [cv.key, { q1: '', q2: '', q3: '', q4: '' }]))])
  );

const gradeLabel = (g) => ({ I: 'Grade I', II: 'Grade II', III: 'Grade III', IV: 'Grade IV', V: 'Grade V', VI: 'Grade VI' }[g]);

// ─── Helper to detect MAPEH components (based on subject code) ─────────────
const isMapehComponent = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || '';
  return code.includes('MUSIC') || code.includes('ARTS') || code.includes('PE') || code.includes('HEALTH');
};

// ─── MAPEH component sort order ──────────────────────────────────────────────
const mapehComponentOrder = ['MUSIC', 'ARTS', 'PHYSICAL EDUCATION', 'HEALTH'];
const getMapehSortIndex = (subjectName) => {
  const name = subjectName?.toUpperCase() || '';
  const index = mapehComponentOrder.findIndex(m => name.includes(m));
  return index >= 0 ? index : mapehComponentOrder.length;
};


// ─── sub-components ───────────────────────────────────────────────────────────

const Field = ({ label, value, onChange, placeholder = '', className = '', type = 'text', small = false, style = {} }) => (
  <div className={`field-group ${className}`} style={{ display: 'flex', flexDirection: 'column', ...style }}>
    {label && <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>{label}</label>}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #b8860b', borderRadius: '6px', fontSize: '0.875rem', outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
    />
  </div>
);

const GradeRatingInput = ({ value, onChange, isObserved = false }) => {
  let displayValue = value || '';
  if (!isObserved && value && !isNaN(parseFloat(value))) {
    displayValue = Math.round(parseFloat(value));
  }
  return (
    <input
      type="text"
      maxLength={3}
      value={displayValue}
      onChange={e => onChange(e.target.value)}
      className="rating-input"
      placeholder="—"
    />
  );
};

// ─── main component ───────────────────────────────────────────────────────────

export default function Form137() {
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const { data: studentsRaw, loading: studentsLoading } = useOptimizedFetch('/students');
  const students = studentsRaw || [];

  // ── subjects ──
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [studentSchoolYear, setStudentSchoolYear] = useState('');

 useEffect(() => {
  const fetchSubjects = async () => {
    try {
      const params = {};
      if (studentSchoolYear) {
        params.school_year = studentSchoolYear;
      }
      const res = await API.get('/subjects', { params });
      setSubjects(res.data);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    } finally {
      setSubjectsLoading(false);
    }
  };
  fetchSubjects();
}, [studentSchoolYear]);

  // Group subjects by grade level with MAPEH separated
  const subjectsByGrade = useMemo(() => {
    const grouped = {};
    subjects.forEach(sub => {
      const grade = sub.gradeLevel;
      if (!grouped[grade]) grouped[grade] = [];
      grouped[grade].push(sub);
    });
    // Sort each grade's subjects: regular subjects first, then MAPEH components
    Object.keys(grouped).forEach(grade => {
      const all = grouped[grade];
      const regular = all.filter(s => !isMapehComponent(s.subjectCode));
      const mapeh = all.filter(s => isMapehComponent(s.subjectCode));
      // Sort each group
      regular.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      mapeh.sort((a, b) => {
        const indexA = getMapehSortIndex(a.subjectName);
        const indexB = getMapehSortIndex(b.subjectName);
        return indexA - indexB;
      });
      grouped[grade] = { regular, mapeh };
    });
    return grouped;
  }, [subjects]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const q = query.toLowerCase();
    const results = students.filter(s => {
    const full = `${s.lastName} ${s.firstName} ${s.middleName || ''} ${s.lrn || ''}`.toLowerCase();      return full.includes(q);
    }).slice(0, 8);
    setSearchResults(results);
    setShowDropdown(true);
  };

 const handleSelectStudent = async (s) => {
  const currentEnrollment = s.current_enrollment || s.currentEnrollment || {};

  const dob = s.dateOfBirth || currentEnrollment.dateOfBirth || '';
  const dobParts = dob ? dob.split('-') : [];
  
  const gender = s.gender || currentEnrollment.gender || '';
  const middleName = s.middleName || currentEnrollment.middleName || '';

  const parentName = currentEnrollment.fatherName || currentEnrollment.motherName || '';
  const parentAddress = currentEnrollment.fatherAddress || currentEnrollment.motherAddress || '';
  const parentOccupation = currentEnrollment.fatherOccupation || currentEnrollment.motherOccupation || '';

  setStudent({
    lastName:         s.lastName                              || '',
    firstName:        s.firstName                             || '',
    middleInitial:    middleName ? middleName.charAt(0) + '.' : '',
    division:         '',
    lrn:              s.lrn                                   || '',
    sex:              gender,
    birthMonth:       dobParts[1]                             || '',
    birthDay:         dobParts[2]                             || '',
    birthYear:        dobParts[0]                             || '',
    placeOfBirth:     '',
    entranceMonth:    '',
    entranceDay:      '',
    entranceYear:     '',
    parentName,
    parentAddress,
    parentOccupation,
  });

  setStudentSchoolYear(s.school_year || '');
  setGradeData(Object.fromEntries(GRADES.map(g => [g, makeGradeData()])));

  const studentGradeLevel = s.gradeLevel;
  const gradeRoman = gradeToRoman[studentGradeLevel];

  if (gradeRoman) {
    setGradeField(gradeRoman, 'school', 'Siloam International Christian School');
    setGradeField(gradeRoman, 'schoolYear', s.school_year || '');
  }

  setGradesLoading(true);
  try {
    // 1. Fetch all enrollments for this student
    const enrollRes = await API.get(`/students/${s.id}/enrollments`);
    const enrollments = enrollRes.data;

    // 2. Fetch all grades for this student
    const gradesRes = await API.get(`/admin/grades?student_id=${s.id}`);
    const allGrades = gradesRes.data.data || [];

    // 3. Deduplicate grades: keep the most recent per subject + quarter
    const latestGradesMap = new Map();
    allGrades.forEach(grade => {
      const key = `${grade.subject_id}-${grade.quarter}`;
      const existing = latestGradesMap.get(key);
      if (!existing || new Date(grade.updated_at) > new Date(existing.updated_at)) {
        latestGradesMap.set(key, grade);
      }
    });
    const uniqueGrades = Array.from(latestGradesMap.values());

    // 4. Fetch subjects for each enrollment's school year
    const subjectPromises = enrollments.map(enrollment =>
      API.get('/subjects', { params: { school_year: enrollment.school_year } })
    );
    const subjectResponses = await Promise.all(subjectPromises);

    const subjectsByYearAndGrade = {};
    enrollments.forEach((enrollment, idx) => {
      const subjectsData = subjectResponses[idx].data;
      subjectsData.forEach(sub => {
        const key = `${enrollment.school_year}|${sub.gradeLevel}`;
        if (!subjectsByYearAndGrade[key]) subjectsByYearAndGrade[key] = [];
        subjectsByYearAndGrade[key].push(sub);
      });
    });

    // 5. Build gradeData for each enrollment
    const newGradeData = Object.fromEntries(
      GRADES.map(g => [g, {
        school: 'Siloam International Christian School',
        schoolYear: '',
        subjects: {},
        eligible: '',
      }])
    );

    enrollments.forEach(enrollment => {
      const roman = gradeToRoman[enrollment.gradeLevel];
      if (!roman) return;
      const key = `${enrollment.school_year}|${enrollment.gradeLevel}`;
      const subjectsForThisEnrollment = subjectsByYearAndGrade[key] || [];

      const subjectsObj = {};
      subjectsForThisEnrollment.forEach(sub => {
        subjectsObj[sub.subjectName] = { q1: '', q2: '', q3: '', q4: '', remarks: '' };
      });

      // Use uniqueGrades and filter by subject.school_year
      const gradesForThisEnrollment = uniqueGrades.filter(grade => {
        return grade.subject?.school_year === enrollment.school_year;
      });

      gradesForThisEnrollment.forEach(grade => {
        const subjName = grade.subject?.subjectName;
        if (!subjName || !subjectsObj.hasOwnProperty(subjName)) return;
        let quarter = grade.quarter?.toLowerCase();
        if (quarter?.startsWith('q')) {
          subjectsObj[subjName][quarter] = grade.score;
          if (grade.remarks) subjectsObj[subjName].remarks = grade.remarks;
        }
      });

      newGradeData[roman] = {
        school: 'Siloam International Christian School',
        schoolYear: enrollment.school_year,
        subjects: subjectsObj,
        eligible: '',
      };
    });

    console.log('✅ Final gradeData:', newGradeData);
    setGradeData(newGradeData);
  } catch (err) {
    console.error('❌ Error loading Form 137 data:', err);
  } finally {
    setGradesLoading(false);
  }

  const romanCurrent = gradeToRoman[studentGradeLevel];
if (romanCurrent) {
  setActiveGrade(romanCurrent);
} 

  setSearchQuery(`${s.lastName}, ${s.firstName}`.trim());
  setShowDropdown(false);
};




  const [student, setStudent] = useState({
    lastName: '', firstName: '', middleInitial: '',
    division: '', lrn: '', sex: '',
    birthMonth: '', birthDay: '', birthYear: '',
    placeOfBirth: '',
    entranceMonth: '', entranceDay: '', entranceYear: '',
    parentName: '', parentAddress: '', parentOccupation: '',
  });

  const [gradeData,   setGradeData]   = useState(Object.fromEntries(GRADES.map(g => [g, makeGradeData()])));
  const [attendance,  setAttendance]  = useState(makeAttendance());
  const [observed,    setObserved]    = useState(makeObserved());
  const [activeTab,   setActiveTab]   = useState('student');
  const [activeGrade, setActiveGrade] = useState('I');

  const setStudentField  = useCallback((field, value) => setStudent(p => ({ ...p, [field]: value })), []);
  const setGradeField    = useCallback((grade, field, value) => setGradeData(p => ({ ...p, [grade]: { ...p[grade], [field]: value } })), []);
  const setSubjectGrade  = useCallback((grade, subject, qtr, value) =>
    setGradeData(p => ({ ...p, [grade]: { ...p[grade], subjects: { ...p[grade].subjects, [subject]: { ...p[grade].subjects[subject], [qtr]: value } } } })), []);
  const setSubjectRemarks = useCallback((grade, subject, value) =>
    setGradeData(p => ({ ...p, [grade]: { ...p[grade], subjects: { ...p[grade].subjects, [subject]: { ...p[grade].subjects[subject], remarks: value } } } })), []);
  const setAttField      = useCallback((grade, field, value) => setAttendance(p => ({ ...p, [grade]: { ...p[grade], [field]: value } })), []);
  const setObsField      = useCallback((grade, key, qtr, value) =>
    setObserved(p => ({ ...p, [grade]: { ...p[grade], [key]: { ...p[grade][key], [qtr]: value } } })), []);

  // ─── print (unchanged, but uses the new subjectsByGrade structure) ─────────
  const handlePrint = () => {

    const buildGradeTable = (g) => {
  const gradeKey = romanToGrade[g];
  const gradeDataObj = gradeData[g];
  const subjectsObj = gradeDataObj.subjects || {};

  // Separate regular and MAPEH subjects
  const subjectNames = Object.keys(subjectsObj);
  const regularSubjects = [];
  const mapehSubjects = [];

  subjectNames.forEach(name => {
    // Need subject metadata to detect MAPEH – we can use the subject list from the enrollment
    // Since we only stored subjectName in subjectsObj, we need a way to check MAPEH.
    // We'll assume subject names are unique and we can look up the subject object from a flat list.
    // Alternatively, we can store the subject object during data building, but we stored just scores.
    // Quick fix: use the subjectsByGrade (global) to check MAPEH for that gradeKey.
    const subjectMeta = (subjectsByGrade[gradeKey]?.regular || [])
      .concat(subjectsByGrade[gradeKey]?.mapeh || [])
      .find(s => s.subjectName === name);
    if (subjectMeta) {
      if (isMapehComponent(subjectMeta.subjectCode)) {
        mapehSubjects.push({ name, scores: subjectsObj[name] });
      } else {
        regularSubjects.push({ name, scores: subjectsObj[name] });
      }
    } else {
      // Fallback: assume regular
      regularSubjects.push({ name, scores: subjectsObj[name] });
    }
  });

  // Sort regular subjects alphabetically
  regularSubjects.sort((a, b) => a.name.localeCompare(b.name));

  // Sort MAPEH components by custom order
  mapehSubjects.sort((a, b) => {
    const codeA = subjectsByGrade[gradeKey]?.mapeh?.find(s => s.subjectName === a.name)?.subjectCode || '';
    const codeB = subjectsByGrade[gradeKey]?.mapeh?.find(s => s.subjectName === b.name)?.subjectCode || '';
    return getMapehSortIndex(codeA) - getMapehSortIndex(codeB);
  });

  const renderSubjectRow = (subjectName, scores, isMapehComponent = false) => {
    const indent = isMapehComponent ? '&nbsp;&nbsp;' : '';
    const q1 = scores.q1 ? Math.round(parseFloat(scores.q1)) : '';
    const q2 = scores.q2 ? Math.round(parseFloat(scores.q2)) : '';
    const q3 = scores.q3 ? Math.round(parseFloat(scores.q3)) : '';
    const q4 = scores.q4 ? Math.round(parseFloat(scores.q4)) : '';
    return `<tr>
      <td class="area-col">${indent}${subjectName}</td>
      <td>${q1||''}</td><td>${q2||''}</td><td>${q3||''}</td><td>${q4||''}</td>
      <td>${scores.remarks||''}</td>
    </tr>`;
  };

  let rows = regularSubjects.map(s => renderSubjectRow(s.name, s.scores, false)).join('');

  if (mapehSubjects.length > 0) {
    // MAPEH heading row with per-quarter averages
    const quarterAverages = { q1: [], q2: [], q3: [], q4: [] };
    mapehSubjects.forEach(s => {
      ['q1','q2','q3','q4'].forEach(q => {
        const val = s.scores[q];
        if (val && !isNaN(parseFloat(val))) quarterAverages[q].push(parseFloat(val));
      });
    });
    const avg = (q) => quarterAverages[q].length ? Math.round(quarterAverages[q].reduce((a,b)=>a+b,0)/quarterAverages[q].length) : '';

    rows += `<tr>
      <td class="area-col">MAPEH</td>
      <td>${avg('q1')||''}</td><td>${avg('q2')||''}</td><td>${avg('q3')||''}</td><td>${avg('q4')||''}</td>
      <td></td>
    </tr>`;
    rows += mapehSubjects.map(s => renderSubjectRow(s.name, s.scores, true)).join('');
  }

  // General average (from all subjects)
  const allRatings = [...regularSubjects, ...mapehSubjects].flatMap(s => 
    [s.scores.q1, s.scores.q2, s.scores.q3, s.scores.q4].filter(v => v && !isNaN(parseFloat(v))).map(parseFloat)
  );
  const generalAvg = allRatings.length ? Math.round(allRatings.reduce((a,b)=>a+b,0)/allRatings.length) : '';

  return `
    <div class="grade-block">
      <div class="grade-block-header">${gradeLabel(g)} – School:
        <span style="border-bottom:1px solid #000;display:inline-block;min-width:110px;">&nbsp;${gradeDataObj.school}&nbsp;</span>
      </div>
      <div class="grade-info-line">
        <span class="lbl">School Year:</span>
        <span class="ln">&nbsp;${gradeDataObj.schoolYear}&nbsp;</span>
      </div>
      <table class="grade-table">
        <thead>
          <tr><th class="area-col" rowspan="2">LEARNING AREAS</th>
            <th colspan="4">Periodic Rating</th><th class="rem-col" rowspan="2">Remarks</th>
          </tr>
          <tr><th class="q-col">1</th><th class="q-col">2</th><th class="q-col">3</th><th class="q-col">4</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="bold-row">
            <td class="area-col"><strong>General Average</strong></td>
            <td colspan="4" style="font-weight:bold;">${generalAvg}</td>
            <td></td>
          </tr>
          <tr><td colspan="6" class="eligible-row">
            Eligible for Admission to:
            <span style="border-bottom:1px solid #000;display:inline-block;min-width:120px;">&nbsp;${gradeDataObj.eligible}&nbsp;</span>
          </td></tr>
        </tbody>
      </table>
    </div>`;
};

    const buildObsTable = (grades) => {
      const headerCells = grades.map(g =>
        `<th colspan="4" class="hdr-gr">${gradeLabel(g)} S.Y. ${gradeData[g].schoolYear || '___'}</th>`
      ).join('');
      const qtrHeaders = grades.map(() =>
        `<th class="q-col">1</th><th class="q-col">2</th><th class="q-col">3</th><th class="q-col">4</th>`
      ).join('');
      const bodyRows = CORE_VALUES.map(cv => {
        const cells = grades.map(g => {
          const d = observed[g][cv.key] || {};
          // For observed values, check if it's numeric; if not, use text as-is (AO, SO, RO, NO, etc.)
          const q1 = d.q1 && !isNaN(parseFloat(d.q1)) ? Math.round(parseFloat(d.q1)) : (d.q1 || '');
          const q2 = d.q2 && !isNaN(parseFloat(d.q2)) ? Math.round(parseFloat(d.q2)) : (d.q2 || '');
          const q3 = d.q3 && !isNaN(parseFloat(d.q3)) ? Math.round(parseFloat(d.q3)) : (d.q3 || '');
          const q4 = d.q4 && !isNaN(parseFloat(d.q4)) ? Math.round(parseFloat(d.q4)) : (d.q4 || '');
          return `<td>${q1||''}</td><td>${q2||''}</td><td>${q3||''}</td><td>${q4||''}</td>`;
        }).join('');
        const rowspan    = cv.key === 'makabansa1' ? ' rowspan="2"' : '';
        const labelCell  = cv.key === 'makabansa2' ? '' :
          `<td class="cv-col" style="text-align:left;"${rowspan}>${cv.label}</td>`;
        return `<tr>${labelCell}<td class="beh-col" style="text-align:left;">${cv.statement}</td>${cells}</tr>`;
      }).join('');

      return `<table class="obs-table">
        <thead>
          <tr><th class="cv-col" rowspan="3">Core Values</th><th class="beh-col" rowspan="3">Behavior Statements</th>${headerCells}</tr>
          <tr>${grades.map(() => '<th colspan="4" class="hdr-sub">Quarter</th>').join('')}</tr>
          <tr>${qtrHeaders}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
    };

    const attRows = GRADES.map(g => {
      const a = attendance[g];
      return `<tr>
        <td>${g}</td>
        <td>${a.schoolDays||''}</td>
        <td>${a.absent||''}</td>
        <td>${a.cause1||''}</td>
        <td>${a.tardy||''}</td>
        <td>${a.cause2||''}</td>
        <td>${a.present||''}</td>
      </tr>`;
    }).join('');

    const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Form 137 – ${student.lastName}, ${student.firstName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:9pt;color:#000;}
  @page{size:8.5in 13in portrait;margin:0.4in 0.5in;}
  .school-header{text-align:center;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:6px;display:flex;align-items:center;justify-content:center;gap:10px;}
  .logo-sics{width:55px;height:55px;object-fit:contain;flex-shrink:0;}
  .school-header-text{text-align:center;}
  .school-name{font-size:10pt;font-weight:bold;text-transform:uppercase;}
  .school-address{font-size:8.5pt;}
  .form-title{text-align:center;font-size:13pt;font-weight:bold;text-transform:uppercase;text-decoration:underline;margin:6px 0 8px;letter-spacing:1px;}

  .info-section{border:1px solid #000;padding:6px 8px;margin-bottom:10px;font-size:8.5pt;}
  .info-table{width:100%;border-collapse:collapse;margin-bottom:4px;}
  .info-table td{padding:1px 3px;vertical-align:bottom;font-size:8.5pt;}
  td.info-lbl{font-weight:bold;white-space:nowrap;padding-right:2px;vertical-align:bottom;width:1%;padding-bottom:14px;}
  .info-val{display:block;border-bottom:1px solid #000;min-width:30px;min-height:14px;padding:0 3px;text-align:center;}
  .info-vals{display:block;border-bottom:1px solid #000;min-width:30px;min-height:14px;padding:0 3px;margin-bottom:14px;text-align:center;}
  .info-sub{display:block;font-size:6.5pt;color:#333;text-align:center;line-height:1.6;}

  .section-title{text-align:center;font-weight:bold;font-size:10pt;text-transform:uppercase;background:#dce6f1;padding:3px 0;border:1px solid #000;letter-spacing:.5px;}
  .grades-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}
  .grade-block{border:1px solid #000;font-size:8pt;}
  .grade-block-header{background:#f0f0f0;padding:3px 5px;border-bottom:1px solid #000;font-weight:bold;}
  .grade-info-line{display:flex;gap:2px;padding:2px 5px;border-bottom:1px solid #ccc;align-items:flex-end;font-size:7.5pt;}
  .grade-info-line .lbl{font-weight:bold;white-space:nowrap;}
  .grade-info-line .ln{flex:1;border-bottom:1px solid #000;height:12px;}
  .grade-table{width:100%;border-collapse:collapse;font-size:7.5pt;}
  .grade-table th,.grade-table td{border:1px solid #000;padding:2px 3px;text-align:center;}
  .grade-table .area-col{text-align:left;width:55%;}
  .grade-table .q-col{width:7%;}
  .grade-table .rem-col{width:18%;}
  .grade-table thead tr:first-child th{background:#dce6f1;font-size:7pt;}
  .grade-table .bold-row td{font-weight:bold;background:#f5f5f5;}
  .grade-table .eligible-row{font-style:italic;font-size:7pt;background:#fafafa;text-align:left;padding:2px 4px;}
  .legend-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:7.5pt;}
  .legend-table td{border:1px solid #000;padding:3px 6px;}
  .obs-title{text-align:center;font-weight:bold;font-size:10pt;text-transform:uppercase;background:#dce6f1;padding:3px 0;border:1px solid #000;letter-spacing:.5px;}
  .obs-table{width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:6px;}
  .obs-table th,.obs-table td{border:1px solid #000;padding:2px 3px;text-align:center;vertical-align:middle;}
  .obs-table .cv-col{width:9%;text-align:left;}
  .obs-table .beh-col{width:22%;text-align:left;}
  .obs-table .q-col{width:5%;font-size:6.5pt;}
  .obs-table .hdr-gr{background:#dce6f1;font-weight:bold;}
  .obs-table .hdr-sub{background:#eef3f9;font-weight:bold;}
  .obs-legend{font-size:7.5pt;margin:4px 0 8px;}
  .att-title{text-align:center;font-weight:bold;font-size:10pt;text-transform:uppercase;background:#dce6f1;padding:3px 0;border:1px solid #000;margin:10px 0 0;letter-spacing:.5px;}
  .att-table{width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:8px;}
  .att-table th,.att-table td{border:1px solid #000;padding:3px 4px;text-align:center;}
  .att-table .att-hdr{background:#dce6f1;font-weight:bold;}
  .att-table td{height:18px;}
  .cert-box{border:1px solid #000;padding:8px 10px;margin-top:8px;font-size:8.5pt;}
  .cert-title-text{font-weight:bold;text-align:center;font-size:9pt;text-transform:uppercase;margin-bottom:6px;letter-spacing:.5px;}
  .cert-box p{margin-bottom:8px;line-height:1.7;}
  .cert-sig{display:flex;justify-content:space-between;margin-top:18px;font-size:8pt;}
  .cert-sig .sig-block{text-align:center;}
  .cert-sig .sig-line{border-bottom:1px solid #000;width:160px;margin-bottom:2px;}
  .divider{border-top:1.5px solid #000;margin:10px 0 6px;}
</style>
</head>
<body>
<div class="school-header">
  <img src="${SICS_LOGO_BASE64}" class="logo-sics" alt="SICS Logo">
  <div class="school-header-text">
    <div class="school-name">Siloam International Christian School</div>
    <div class="school-address">Purok Bayanihan, Motong, Dumaguete City, Negros Oriental, Philippines</div>
  </div>
</div>
<div class="form-title">Grade School Permanent Record</div>

<div class="info-section">
  <!-- Row 1: Name / Division / LRN -->
  <table class="info-table">
     <tr><td class="info-lbl">NAME:</td>
       <td style="width:22%"><div class="info-val">${student.lastName}</div><div class="info-sub">LAST</div></td>
       <td style="width:18%"><div class="info-val">${student.firstName}</div><div class="info-sub">FIRST NAME</div></td>
       <td style="width:7%"><div class="info-val">${student.middleInitial}</div><div class="info-sub">M.I.</div></td>
       <td class="info-lbl" style="padding-left:8px;">DIVISION:</td>
       <td style="width:13%"><div class="info-vals">${student.division}</div></td>
       <td class="info-lbl" style="padding-left:8px;">LRN:</td>
       <td style="width:13%"><div class="info-vals">${student.lrn}</div></td>
     </tr>
  </table>
  <!-- Row 2: Sex / DOB / Place -->
  <table class="info-table">
     <tr><td class="info-lbl">SEX:</td>
       <td style="width:6%"><div class="info-vals">${student.sex}</div></td>
       <td class="info-lbl" style="padding-left:8px;">DATE OF BIRTH:</td>
       <td style="width:6%"><div class="info-val">${student.birthMonth}</div><div class="info-sub">M</div></td>
       <td style="width:6%"><div class="info-val">${student.birthDay}</div><div class="info-sub">D</div></td>
       <td style="width:8%"><div class="info-val">${student.birthYear}</div><div class="info-sub">Y</div></td>
       <td class="info-lbl" style="padding-left:8px;">PLACE:</td>
       <td style="width:38%"><div class="info-val">${student.placeOfBirth}</div><div class="info-sub">(BRGY / Town / City / Province)</div></td>
     </tr>
  </table>
  <!-- Row 3: Date of Entrance -->
  <table class="info-table">
     <tr><td class="info-lbl">DATE OF ENTRANCE:</td>
       <td style="width:6%"><div class="info-val">${student.entranceMonth}</div><div class="info-sub">M</div></td>
       <td style="width:6%"><div class="info-val">${student.entranceDay}</div><div class="info-sub">D</div></td>
       <td style="width:8%"><div class="info-val">${student.entranceYear}</div><div class="info-sub">Y</div></td>
       <td></td>
     </tr>
  </table>
  <!-- Row 4: Parent / Guardian -->
  <table class="info-table">
     <tr><td class="info-lbl">PARENT / GUARDIAN:</td>
       <td style="width:20%"><div class="info-val">${student.parentName}</div><div class="info-sub">(Name)</div></td>
       <td style="padding:0 4px;vertical-align:middle;width:1%;">/</td>
       <td style="width:28%"><div class="info-val">${student.parentAddress}</div><div class="info-sub">(Address)</div></td>
       <td style="padding:0 4px;vertical-align:middle;width:1%;">/</td>
       <td style="width:18%"><div class="info-val">${student.parentOccupation}</div><div class="info-sub">(Occupation)</div></td>
     </tr>
  </table>
</div>

<div class="section-title">Elementary School Progress</div>
<div class="grades-grid">
  ${GRADES.map(g => buildGradeTable(g)).join('')}
</div>

<table class="legend-table" style="margin-top:10px;">
  <tr><td><strong>Legend: &nbsp;Outstanding (O)</strong></td><td>90–100%</td>
      <td><strong>Fairly Satisfactory (FS)</strong></td><td>75–79%</td></tr>
  <tr><td><strong>Very Satisfactory (VS)</strong></td><td>85–89%</td>
      <td><strong>Did Not Meet Expectation (DE)</strong></td><td>74% and below</td></tr>
  <tr><td><strong>Satisfactory (S)</strong></td><td>80–84%</td><td colspan="2"></td></tr>
</table>

<div class="divider"></div>
<div class="obs-title">Report on Learner's Observed Values</div>
${buildObsTable(['I','II','III'])}
<div style="margin-top:6px;">${buildObsTable(['IV','V','VI'])}</div>

<div class="obs-legend">
  <strong>AO</strong> – Always Observed &nbsp;&nbsp;
  <strong>SO</strong> – Sometimes Observed &nbsp;&nbsp;
  <strong>RO</strong> – Rarely Observed &nbsp;&nbsp;
  <strong>NO</strong> – Not Observed
</div>

<div class="att-title">Attendance Record</div>
<table class="att-table">
  <thead><tr class="att-hdr">
    <th style="width:8%;">Grade</th>
    <th style="width:12%;">No. of School Days</th>
    <th style="width:14%;">No. of Days Absent</th>
    <th style="width:22%;">Cause</th>
    <th style="width:12%;">No. of Times Tardy</th>
    <th style="width:22%;">Cause</th>
    <th style="width:12%;">No. of Days Present</th>
  </tr></thead>
  <tbody>${attRows}</tbody>
</table>

<div class="cert-box">
  <div class="cert-title-text">Certificate of Transfer</div>
  <p><strong>TO WHOM IT MAY CONCERN:</strong></p>
  <p>This is to certify that this is a true record of the Elementary School Permanent Record of
    <span style="display:inline-block;border-bottom:1px solid #000;min-width:220px;">&nbsp;${student.firstName} ${student.lastName}&nbsp;</span>.
    He / She is eligible for transfer and admission of Grade/Year
    <span style="display:inline-block;border-bottom:1px solid #000;min-width:100px;">&nbsp;</span>.
  </p>
  <div class="cert-sig">
    <div class="sig-block"><div class="sig-line"></div><div>Signature</div></div>
    <div class="sig-block"><div class="sig-line"></div><div>Date</div></div>
    <div class="sig-block"><div class="sig-line"></div><div>Designation</div></div>
  </div>
</div>

<script>
  window.onload = () => {
    setTimeout(() => {
      window.print();
      window.addEventListener('afterprint', () => window.close());
    }, 400);
  };
</script>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Popup blocked. Please allow popups to print.'); return; }
    win.document.write(printHTML);
    win.document.close();
  };

  // ─── render ───────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'student',    label: '👤 Student Info' },
    { id: 'grades',     label: '📚 Grades' },
    { id: 'values',     label: '🌟 Observed Values' },
    { id: 'attendance', label: '📅 Attendance' },
  ];

  return (
    <div className="dashboard-layout">
      <SideBar  />
      <div className="main-content">
        <TopBar />
        <div className="content-scroll-area">
          <div style={styles.page}>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>Form 137</h1>
                <p style={styles.pageSubtitle}>Grade School Permanent Record</p>
              </div>
              <button style={styles.printBtn} onClick={handlePrint}>
                🖨️ Print Form 137
              </button>
            </div>

            <div style={styles.tabBar}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

      <div style={styles.panel}>

        {/* ════ STUDENT INFO ════ */}
        {activeTab === 'student' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Student Information</h2>

            {/* Search bar */}
            <div style={styles.searchWrapper}>
              <div style={styles.searchBox}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Search student by name or LRN..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => searchResults.length && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  style={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                    style={styles.searchClear}
                  >✕</button>
                )}
              </div>
              {studentsLoading && searchQuery ? (
                <div style={styles.dropdown}>
                  <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>Loading students...</div>
                </div>
              ) : showDropdown && searchResults.length > 0 && (
                <div style={styles.dropdown}>
                  {searchResults.map((s, i) => (
                    <div
                      key={i}
                      style={styles.dropdownItem}
                      onMouseDown={() => handleSelectStudent(s)}
                    >
                      <div style={styles.dropdownName}>
                        {s.lastName}, {s.firstName} {s.middleName || ''}
                      </div>
                      <div style={styles.dropdownMeta}>
                        LRN: {s.lrn || '—'} &nbsp;|&nbsp; Grade: {s.gradeLevel || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && searchResults.length === 0 && searchQuery && (
                <div style={styles.dropdown}>
                  <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No students found
                  </div>
                </div>
              )}
            </div>

            <div style={styles.fieldRows}>
              {/* Row 1: Name */}
              <div style={styles.fieldRow}>
                <Field label="Last Name"    value={student.lastName}       onChange={v => setStudentField('lastName', v)}       style={{ flex: 3 }} />
                <Field label="First Name"   value={student.firstName}      onChange={v => setStudentField('firstName', v)}      style={{ flex: 3 }} />
                <Field label="M.I."         value={student.middleInitial}  onChange={v => setStudentField('middleInitial', v)}  style={{ flex: 1 }} />
              </div>
              {/* Row 2: Division / LRN / Sex */}
              <div style={styles.fieldRow}>
                <Field label="Division"     value={student.division}       onChange={v => setStudentField('division', v)}       style={{ flex: 2 }} />
                <Field label="LRN"          value={student.lrn}            onChange={v => setStudentField('lrn', v)}            style={{ flex: 2 }} />
                <Field label="Sex"          value={student.sex}            onChange={v => setStudentField('sex', v)}            style={{ flex: 1 }} />
              </div>
              {/* Row 3: Date of Birth */}
              <div style={styles.fieldRow}>
                <Field label="Birth Month"  value={student.birthMonth}     onChange={v => setStudentField('birthMonth', v)}     style={{ flex: 1 }} />
                <Field label="Birth Day"    value={student.birthDay}       onChange={v => setStudentField('birthDay', v)}       style={{ flex: 1 }} />
                <Field label="Birth Year"   value={student.birthYear}      onChange={v => setStudentField('birthYear', v)}      style={{ flex: 1 }} />
              </div>
              {/* Row 4: Place of Birth (full width) */}
              <div style={styles.fieldRow}>
                <Field label="Place of Birth" value={student.placeOfBirth} onChange={v => setStudentField('placeOfBirth', v)}  style={{ flex: 1 }} />
              </div>
              {/* Row 5: Date of Entrance */}
              <div style={styles.fieldRow}>
                <Field label="Entrance Month" value={student.entranceMonth} onChange={v => setStudentField('entranceMonth', v)} style={{ flex: 1 }} />
                <Field label="Entrance Day"   value={student.entranceDay}   onChange={v => setStudentField('entranceDay', v)}   style={{ flex: 1 }} />
                <Field label="Entrance Year"  value={student.entranceYear}  onChange={v => setStudentField('entranceYear', v)}  style={{ flex: 1 }} />
              </div>
              {/* Row 6: Parent / Guardian */}
              <div style={styles.fieldRow}>
                <Field label="Parent / Guardian Name"    value={student.parentName}       onChange={v => setStudentField('parentName', v)}       style={{ flex: 2 }} />
                <Field label="Parent Address"            value={student.parentAddress}    onChange={v => setStudentField('parentAddress', v)}    style={{ flex: 3 }} />
                <Field label="Parent Occupation"         value={student.parentOccupation} onChange={v => setStudentField('parentOccupation', v)} style={{ flex: 2 }} />
              </div>
            </div>
          </div>
        )}

        {/* ════ GRADES ════ */}
        {activeTab === 'grades' && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Elementary School Progress</h2>
                  <div style={styles.gradeTabBar}>
                    {GRADES.map(g => (
                      <button
                        key={g}
                        style={{ ...styles.gradeTab, ...(activeGrade === g ? styles.gradeTabActive : {}) }}
                        onClick={() => setActiveGrade(g)}
                      >
                        Grade {g}
                      </button>
                    ))}
                  </div>
                  {subjectsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Loading subjects...</div>
                  ) : gradesLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Loading grades...</div>
                  ) : (
                    (() => {
                      const g = activeGrade;
                      const data = gradeData[g];
                      const subjectsObj = data.subjects || {};

                      // Build regular/mapeh lists from the subject names in gradeData
                      const subjectNames = Object.keys(subjectsObj);
                      const regular = [];
                      const mapeh = [];

                      subjectNames.forEach(name => {
                        // Try to get subject metadata from global subjects list (for MAPEH detection)
                        const gradeKey = romanToGrade[g];
                        const subjectMeta = (subjectsByGrade[gradeKey]?.regular || [])
                          .concat(subjectsByGrade[gradeKey]?.mapeh || [])
                          .find(s => s.subjectName === name);

                        if (subjectMeta && isMapehComponent(subjectMeta.subjectCode)) {
                          mapeh.push({ subjectName: name, ...subjectMeta });
                        } else {
                          regular.push({ subjectName: name, ...subjectMeta });
                        }
                      });

                      // Calculate per‑quarter averages for MAPEH components
                      const quarters = ['q1', 'q2', 'q3', 'q4'];
                      const mapehQuarterAverages = quarters.map(quarter => {
                        const scores = mapeh
                          .map(sub => {
                            const sd = data.subjects[sub.subjectName] || {};
                            const val = sd[quarter];
                            return val && !isNaN(parseFloat(val)) ? parseFloat(val) : null;
                          })
                          .filter(v => v !== null);
                        return scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : '';
                      });

                      return (
                        <div style={styles.gradePanel}>
                          <div style={styles.row}>
                            <Field label="School Name" value={data.school} onChange={v => setGradeField(g, 'school', v)} className="flex-3" />
                            <Field label="School Year" value={data.schoolYear} onChange={v => setGradeField(g, 'schoolYear', v)} className="flex-1" />
                            <Field label="Eligible for Admission to" value={data.eligible} onChange={v => setGradeField(g, 'eligible', v)} className="flex-2" />
                          </div>
                          <table style={styles.subjectTable}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Learning Area</th>
                                <th style={{ ...styles.th, ...styles.thQ }}>Q1</th>
                                <th style={{ ...styles.th, ...styles.thQ }}>Q2</th>
                                <th style={{ ...styles.th, ...styles.thQ }}>Q3</th>
                                <th style={{ ...styles.th, ...styles.thQ }}>Q4</th>
                                <th style={{ ...styles.th, width: '120px' }}>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Regular subjects */}
                              {regular.map(sub => {
                                const sd = data.subjects[sub.subjectName] || {};
                                return (
                                  <tr key={sub.subjectName}>
                                    <td style={styles.td}>{sub.subjectName}</td>
                                    {quarters.map(q => (
                                      <td key={q} style={{ ...styles.td, textAlign: 'center' }}>
                                        <GradeRatingInput value={sd[q]} onChange={v => setSubjectGrade(g, sub.subjectName, q, v)} />
                                      </td>
                                    ))}
                                    <td style={styles.td}>
                                      <input type="text" value={sd.remarks || ''} onChange={e => setSubjectRemarks(g, sub.subjectName, e.target.value)} style={styles.remarksInput} placeholder="—" />
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* MAPEH heading row (if there are components) */}
                              {mapeh.length > 0 && (
                                <tr style={{ background: '#fafbfd' }}>
                                  <td style={styles.td}>MAPEH</td>
                                  {mapehQuarterAverages.map((avg, idx) => (
                                    <td key={idx} style={{ ...styles.td, textAlign: 'center' }}>
                                      {avg || '—'}
                                    </td>
                                  ))}
                                  <td style={styles.td}>—</td>
                                </tr>
                              )}

                              {/* MAPEH component rows (indented) */}
                              {mapeh.map(sub => {
                                const sd = data.subjects[sub.subjectName] || {};
                                return (
                                  <tr key={sub.subjectName} style={styles.mapehRow}>
                                    <td style={styles.td}>
                                      <span style={{ marginLeft: '20px', color: '#888' }}>↳</span> {sub.subjectName}
                                    </td>
                                    {quarters.map(q => (
                                      <td key={q} style={{ ...styles.td, textAlign: 'center' }}>
                                        <GradeRatingInput value={sd[q]} onChange={v => setSubjectGrade(g, sub.subjectName, q, v)} />
                                      </td>
                                    ))}
                                    <td style={styles.td}>
                                      <input type="text" value={sd.remarks || ''} onChange={e => setSubjectRemarks(g, sub.subjectName, e.target.value)} style={styles.remarksInput} placeholder="—" />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

        {/* ════ OBSERVED VALUES ════ */}
        {activeTab === 'values' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Report on Learner's Observed Values</h2>
            <p style={styles.hint}>AO – Always Observed &nbsp; SO – Sometimes Observed &nbsp; RO – Rarely Observed &nbsp; NO – Not Observed</p>
            <div style={styles.gradeTabBar}>
              {GRADES.map(g => (
                <button
                  key={g}
                  style={{ ...styles.gradeTab, ...(activeGrade === g ? styles.gradeTabActive : {}) }}
                  onClick={() => setActiveGrade(g)}
                >
                  Grade {g}
                </button>
              ))}
            </div>
            <table style={styles.subjectTable}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '110px' }}>Core Value</th>
                  <th style={styles.th}>Behavior Statement</th>
                  <th style={{ ...styles.th, ...styles.thQ }}>Q1</th>
                  <th style={{ ...styles.th, ...styles.thQ }}>Q2</th>
                  <th style={{ ...styles.th, ...styles.thQ }}>Q3</th>
                  <th style={{ ...styles.th, ...styles.thQ }}>Q4</th>
                </tr>
              </thead>
              <tbody>
                {CORE_VALUES.map(cv => {
                  const d = observed[activeGrade][cv.key] || {};
                  return (
                    <tr key={cv.key}>
                      <td style={{ ...styles.td, fontWeight: cv.label ? '600' : 'normal', color: '#334155' }}>{cv.label}</td>
                      <td style={{ ...styles.td, fontSize: '0.82rem', color: '#475569' }}>{cv.statement}</td>
                      {['q1','q2','q3','q4'].map(q => (
                        <td key={q} style={{ ...styles.td, textAlign: 'center' }}>
                          <GradeRatingInput isObserved={true} value={d[q]} onChange={v => setObsField(activeGrade, cv.key, q, v)} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ════ ATTENDANCE ════ */}
        {activeTab === 'attendance' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Attendance Record</h2>
            <table style={styles.subjectTable}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '60px' }}>Grade</th>
                  <th style={styles.th}>No. of School Days</th>
                  <th style={styles.th}>No. of Days Absent</th>
                  <th style={styles.th}>Cause</th>
                  <th style={styles.th}>No. of Times Tardy</th>
                  <th style={styles.th}>Cause</th>
                  <th style={styles.th}>No. of Days Present</th>
                </tr>
              </thead>
              <tbody>
                {GRADES.map(g => {
                  const a = attendance[g];
                  return (
                    <tr key={g}>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '600' }}>{g}</td>
                      {['schoolDays','absent','cause1','tardy','cause2','present'].map(f => (
                        <td key={f} style={{ ...styles.td, textAlign: 'center' }}>
                          <input
                            type="text"
                            value={a[f]}
                            onChange={e => setAttField(g, f, e.target.value)}
                            style={styles.attInput}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
    </div>
  </div>
  </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: '24px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  pageTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#b8860b',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: '2px 0 0',
  },
  printBtn: {
    background: '#b8860b',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '0.3px',
    boxShadow: '0 2px 8px rgba(184,134,11,0.3)',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '0',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: '-2px',
    borderRadius: '6px 6px 0 0',
    transition: 'all 0.15s',
  },
  tabActive: {
    borderBottomColor: '#b8860b',
    color: '#b8860b',
    background: '#fff',
    fontWeight: '600',
  },
  panel: {
    background: '#fff',
    borderRadius: '0 8px 8px 8px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    padding: '24px',
  },
  section: {},
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#b8860b',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #f7e14b',
  },
  row: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  gradeTabBar: {
    display: 'flex',
    gap: '6px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  gradeTab: {
    background: '#f0f4f8',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '5px 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  gradeTabActive: {
    background: '#b8860b',
    color: '#fff',
    borderColor: '#b8860b',
  },
  gradePanel: {},
  subjectTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
    marginTop: '8px',
  },
  th: {
    background: '#f7e14b',
    border: '1px solid #e0d8b0',
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '0.8rem',
    color: '#333',
  },
  thQ: {
    width: '55px',
    textAlign: 'center',
  },
  td: {
    border: '1px solid #e2e8f0',
    padding: '5px 8px',
    color: '#334155',
    fontSize: '0.875rem',
  },
  mapehRow: {
    background: '#fafbfd',
  },
  hint: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '14px',
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  attInput: {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #cbd5e1',
    padding: '3px 4px',
    fontSize: '0.85rem',
    textAlign: 'center',
    outline: 'none',
    background: 'transparent',
  },
  remarksInput: {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #cbd5e1',
    padding: '3px 4px',
    fontSize: '0.8rem',
    outline: 'none',
    background: 'transparent',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '20px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: '#f8fafc',
    border: '1.5px solid #b8860b',
    borderRadius: '10px',
    padding: '0 12px',
    gap: '8px',
    transition: 'border-color 0.15s',
  },
  searchIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '10px 0',
    fontSize: '0.9rem',
    outline: 'none',
    color: '#334155',
  },
  searchClear: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '0.85rem',
    padding: '2px 4px',
    borderRadius: '4px',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    zIndex: 100,
    overflow: 'hidden',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.1s',
  },
  dropdownName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownMeta: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  fieldRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  fieldRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
};
