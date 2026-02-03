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

export default function SubjectManagement() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [formData, setFormData] = useState({
    subjectName: "",
    subjectCode: "",
    gradeLevel: "",
    description: "",
  });

  const gradeLevels = [
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
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects");
      setSubjects(res.data);
    } catch (err) {
      console.error("Failed to fetch subjects");
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentSubject(null);
    setFormData({
      subjectName: "",
      subjectCode: "",
      gradeLevel: "",
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
      description: subject.description || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subjectName || !formData.subjectCode || !formData.gradeLevel) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      if (isEditing) {
        await API.put(`/subjects/${currentSubject.id}`, formData);
        alert("Subject updated successfully!");
      } else {
        await API.post("/subjects", formData);
        alert("Subject created successfully!");
      }

      setShowModal(false);
      fetchSubjects();
    } catch (err) {
      console.error("Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to save subject");
    }
  };

  const handleDelete = async (subjectId, subjectName) => {
    if (!window.confirm(`Delete "${subjectName}"? This will remove all associated assignments and grades.`)) {
      return;
    }

    try {
      await API.delete(`/subjects/${subjectId}`);
      alert("Subject deleted successfully!");
      fetchSubjects();
    } catch (err) {
      console.error("Delete Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to delete subject");
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
              <button className="create-btn" onClick={openCreateModal}>
                <FaPlus /> Create Subject
              </button>
            </div>

            <div className="filters-bar">
              <div className="search-box">
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
                          <div key={subject.id} className="subject-card">
                            <div className="subject-code-badge">{subject.subjectCode}</div>
                            
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

              <form onSubmit={handleSubmit}>
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

                <div className="form-grid">
                  <div className="form-group">
                    <label>Subject Code <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., MATH, ENG, SCI"
                      value={formData.subjectCode}
                      onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Grade Level <span className="required">*</span></label>
                    <select
                      value={formData.gradeLevel}
                      onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
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