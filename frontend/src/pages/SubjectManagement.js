import { useEffect, useState } from "react";
import API from "../api/api";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import { 
  FaBookOpen, 
  FaPlus, 
  FaTimes, 
  FaEdit, 
  FaTrash,
  FaSearch
} from "react-icons/fa";
import "./SubjectManagement.css";

// ─── Base subject templates (without grade prefix) ─────────────────────────
const BASE_SUBJECTS = [
  { code: "ENG",  name: "English",           description: "Language and literature" },
  { code: "FIL",  name: "Filipino",          description: "Wikang Filipino" },
  { code: "MATH", name: "Mathematics",       description: "Numbers, operations, problem solving" },
  { code: "SCI",  name: "Science",           description: "Scientific inquiry and concepts" },
  { code: "AP",   name: "Araling Panlipunan",description: "Social studies and history" },
  { code: "ESP",  name: "Edukasyon sa Pagpapakatao", description: "Values education" },
  { code: "TLE",  name: "Technology and Livelihood Education", description: "Home economics and ICT" },
  { code: "HELE", name: "Home Economics and Livelihood Education", description: "Practical skills" },
  { code: "KOREAN", name: "Korean Language", description: "Basic Korean language" },
  { code: "BIBLE", name: "Bible Class",      description: "Christian values and stories" },
  // MAPEH components
  { code: "MUSIC", name: "Music",             description: "Music theory and performance" },
  { code: "ARTS",  name: "Arts",              description: "Visual arts and crafts" },
  { code: "PE",    name: "Physical Education",description: "Sports and physical activities" },
  { code: "HEALTH",name: "Health",            description: "Health education and hygiene" },
];

// ─── Grade to prefix mapping ───────────────────────────────────────────────
const getGradePrefix = (gradeLevel) => {
  const map = {
    "Nursery": "N",
    "Kindergarten 1": "K1",
    "Kindergarten 2": "K2",
    "Grade 1": "G1",
    "Grade 2": "G2",
    "Grade 3": "G3",
    "Grade 4": "G4",
    "Grade 5": "G5",
    "Grade 6": "G6",
  };
  return map[gradeLevel] || "";
};

export default function SubjectManagement() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [schoolYear, setSchoolYear] = useState("2025-2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [formData, setFormData] = useState({
    subjectName: "",
    subjectCode: "",
    gradeLevel: "",
    school_year: "2025-2026",
    description: "",
  });

  const gradeLevels = [
    "Nursery",
    "Kindergarten 1",
    "Kindergarten 2",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6"
  ];

  useEffect(() => {
    fetchSubjects();
  }, [schoolYear]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await API.get("/subjects", { params: { school_year: schoolYear } });
      setSubjects(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch subjects");
      setError("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentSubject(null);
    setFormData({
      subjectName: "",
      subjectCode: "",
      gradeLevel: "",
      school_year: schoolYear,
      description: "",
    });
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setIsEditing(true);
    setCurrentSubject(subject);
    setFormData({
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      gradeLevel: subject.gradeLevel,
      school_year: subject.school_year || schoolYear,
      description: subject.description || "",
    });
    setShowModal(true);
  };

  // ─── Get available subject codes (excluding already created ones) ─────────
  const getAvailableSubjectCodeOptions = () => {
    if (!formData.gradeLevel) return [];
    const prefix = getGradePrefix(formData.gradeLevel);
    if (!prefix) return [];

    // Get existing subject codes for this grade level
    const existingCodes = subjects
      .filter(sub => sub.gradeLevel === formData.gradeLevel)
      .map(sub => sub.subjectCode);

    // Filter base subjects that are not yet created
    return BASE_SUBJECTS
      .filter(base => !existingCodes.includes(`${prefix}-${base.code}`))
      .map(base => ({
        fullCode: `${prefix}-${base.code}`,
        name: base.name,
        description: base.description,
      }));
  };

  const handleSubjectCodeChange = (e) => {
    const selectedFullCode = e.target.value;
    if (!selectedFullCode) return;
    
    const prefix = getGradePrefix(formData.gradeLevel);
    const baseCode = selectedFullCode.replace(`${prefix}-`, '');
    const baseSubject = BASE_SUBJECTS.find(b => b.code === baseCode);
    
    if (baseSubject) {
      setFormData(prev => ({
        ...prev,
        subjectCode: selectedFullCode,
        subjectName: baseSubject.name,
        description: baseSubject.description,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.subjectName || !formData.subjectCode || !formData.gradeLevel) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      if (isEditing) {
        await API.put(`/subjects/${currentSubject.id}`, formData);
        setSuccess("Subject updated successfully!");
        await fetchSubjects();
        setTimeout(() => setShowModal(false), 1500);
      } else {
        await API.post("/subjects", formData);
        setSuccess("Subject created successfully!");
        
        // Reset form for next entry, keeping grade level and school year
        setFormData({
          subjectName: "",
          subjectCode: "",
          gradeLevel: formData.gradeLevel,
          school_year: formData.school_year,
          description: "",
        });
        
        await fetchSubjects();
        // Modal stays open for bulk entry
      }
    } catch (err) {
      console.error("Error:", err.response?.data);
      const errorMsg = err.response?.data?.message || "Failed to save subject";
      setError(errorMsg);
    }
  };

  const handleDelete = async (subjectId, subjectName) => {
    if (!window.confirm(`Delete "${subjectName}"? This will remove all associated assignments and grades.`)) {
      return;
    }

    try {
      await API.delete(`/subjects/${subjectId}`);
      setSuccess("Subject deleted successfully!");
      await fetchSubjects();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Delete Error:", err.response?.data);
      const errorMsg = err.response?.data?.message || "Failed to delete subject";
      setError(errorMsg);
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade =
      filterGrade === "all" ? true : subject.gradeLevel === filterGrade;

    return matchesSearch && matchesGrade;
  });

  const subjectsByGrade = gradeLevels.reduce((acc, grade) => {
    acc[grade] = filteredSubjects.filter((s) => s.gradeLevel === grade);
    return acc;
  }, {});

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div className="content-scroll-area" style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          <div className="subject-management-container">
            
            <div className="page-header">
              <div className="title-group">
                <FaBookOpen className="title-icon" />
                <div>
                  <h2>Subject Management</h2>
                  <p>Create and manage subjects for all grade levels</p>
                </div>
              </div>
              <div className="header-actions">
                <select
                  className="school-year-select"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                >
                  {['2024-2025','2025-2026','2026-2027','2027-2028'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button className="create-btn" onClick={openCreateModal}>
                  <FaPlus /> Create Subject
                </button>
              </div>
            </div>

            <div className="filters-bar">
              <div className="subject-management-search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="grade-filter"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
              >
                <option value="all">All Grade Levels</option>
                {gradeLevels.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>

              <div className="subject-count">
                Total: {filteredSubjects.length} subjects
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="subjects-container">
              {gradeLevels.map((grade) => {
                const gradeSubjects = subjectsByGrade[grade];
                
                if (gradeSubjects.length === 0 && filterGrade !== "all" && filterGrade !== grade) {
                  return null;
                }

                return (
                  <div key={grade} className="grade-section">
                    <div className="grade-header">
                      <h3>{grade}</h3>
                      <span className="subject-badge">{gradeSubjects.length} subjects</span>
                    </div>

                    {gradeSubjects.length > 0 ? (
                      <div className="subjects-grid">
                        {gradeSubjects.map((subject) => (
                          <div 
                            key={subject.id} 
                            className={`subject-card ${['MUSIC','ARTS','PE','HEALTH'].includes(subject.subjectCode?.replace(/^[A-Z0-9]+-/, '')) ? 'mapeh-card' : ''}`}
                          >
                            <div className="subject-code-badge">
                              {subject.subjectCode}
                              {['MUSIC','ARTS','PE','HEALTH'].includes(subject.subjectCode?.replace(/^[A-Z0-9]+-/, '')) && (
                                <span className="mapeh-indicator">
                                  {subject.subjectCode?.includes('MUSIC') && '🎵'}
                                  {subject.subjectCode?.includes('ARTS') && '🎨'}
                                  {subject.subjectCode?.includes('PE') && '🏃'}
                                  {subject.subjectCode?.includes('HEALTH') && '❤️'}
                                </span>
                              )}
                            </div>
                            
                            <div className="subject-info">
                              <h4>{subject.subjectName}</h4>
                              {subject.description && (
                                <p className="subject-description">{subject.description}</p>
                              )}
                            </div>

                            <div className="subject-actions">
                              <button
                                className="edit-btn"
                                onClick={() => openEditModal(subject)}
                                title="Edit subject"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="delete-btn"
                                onClick={() => handleDelete(subject.id, subject.subjectName)}
                                title="Delete subject"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-subjects">
                        <p>No subjects created for this grade level yet</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{isEditing ? "Edit Subject" : "Create New Subject"}</h3>
                <FaTimes className="close-icon" onClick={() => setShowModal(false)} />
              </div>

              {error && <div className="alert alert-error" style={{ margin: "15px 20px 0" }}>{error}</div>}
              {success && <div className="alert alert-success" style={{ margin: "15px 20px 0" }}>{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Grade Level <span className="required">*</span></label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => {
                      const newGrade = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        gradeLevel: newGrade,
                        subjectCode: "",
                        subjectName: "",
                        description: "",
                      }));
                    }}
                    required
                  >
                    <option value="">-- Select Grade --</option>
                    {gradeLevels.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subject Code <span className="required">*</span></label>
                  <select
                    value={formData.subjectCode}
                    onChange={handleSubjectCodeChange}
                    required
                    disabled={!formData.gradeLevel}
                    style={{ backgroundColor: formData.gradeLevel ? "#fff" : "#f0f0f0" }}
                  >
                    <option value="">-- Select Subject Code --</option>
                    {getAvailableSubjectCodeOptions().map(opt => (
                      <option key={opt.fullCode} value={opt.fullCode}>
                        {opt.fullCode} – {opt.name}
                      </option>
                    ))}
                  </select>
                  {!formData.gradeLevel && (
                    <small style={{ color: "#d32f2f" }}>Please select a grade level first</small>
                  )}
                  {formData.gradeLevel && getAvailableSubjectCodeOptions().length === 0 && (
                    <small style={{ color: "#d32f2f" }}>
                      All subjects have been created for this grade level.
                    </small>
                  )}
                  <small style={{ color: "#666", display: "block", marginTop: "4px" }}>
                    Selecting a code will automatically fill the Subject Name and Description.
                  </small>
                </div>

                <div className="form-group">
                  <label>Subject Name <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., Mathematics, English, Science"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>School Year <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., 2025-2026"
                    value={formData.school_year}
                    onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    placeholder="Add a description for this subject..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {isEditing ? "Update Subject" : "Create Subject"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}