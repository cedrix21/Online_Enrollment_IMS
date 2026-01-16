import { useEffect, useState } from "react";
import API from "../api/axios";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import { FaChalkboardTeacher, FaUserPlus, FaBookOpen, FaEnvelope, FaTimes } from "react-icons/fa";
import "./TeacherDirectory.css";

export default function TeacherDirectory() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialization: "",
    advisory_grade: "",
    phone: "",      
    status: "active" 
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await API.get("/teachers");
      setTeachers(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch teachers");
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      // Logic for teacherId is handled in your Controller, so we don't send it from here
      await API.post("/teachers", newTeacher);
      setShowModal(false);
      // Reset form
      setNewTeacher({ 
        firstName: "", lastName: "", email: "", 
        specialization: "", advisory_grade: "", 
        phone: "", status: "active" 
      });
      fetchTeachers();
    } catch (err) {
      console.error("Backend Error:", err.response?.data);
      alert(err.response?.data?.message || "Check console for details.");
    }
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

      <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

        <div className="directory-container">
          <div className="directory-header">
            <div className="title-group">
              <FaChalkboardTeacher className="title-icon" style={{ color: '#b8860b', fontSize: '2rem', marginRight: '15px' }} />
              <div>
                <h2>Faculty Directory</h2>
                <p>Manage advisory roles and subject assignments</p>
              </div>
            </div>
            <button className="add-teacher-btn" onClick={() => setShowModal(true)}>
              <FaUserPlus /> Add Teacher
            </button>
          </div>

          <div className="teacher-grid">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="teacher-card">
                <div className="card-top">
                  <div className="teacher-avatar">
                    {teacher.firstName[0]}{teacher.lastName[0]}
                  </div>
                  <div className="teacher-info">
                    <h3>{teacher.firstName} {teacher.lastName}</h3>
                    <span className="teacher-id">{teacher.teacherId}</span>
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <FaEnvelope className="icon" />
                    <span>{teacher.email}</span>
                  </div>
                  <div className="info-row">
                    <FaBookOpen className="icon" />
                    <strong>Adviser of: </strong> 
                    <span className="advisory-tag">{teacher.advisory_grade || "None"}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                    Specialization: <strong>{teacher.specialization}</strong>
                  </p>

                  {/* NEW: TEACHER LOAD SECTION */}
                  {expandedTeacher === teacher.id && (
                    <div className="teacher-load-dropdown">
                      <h4>Assigned Subjects:</h4>
                      {teacher.subjects && teacher.subjects.length > 0 ? (
                        <ul>
                          {teacher.subjects.map(sub => (
                            <li key={sub.id}>
                              <strong>{sub.subjectCode}:</strong> {sub.subjectName} 
                              <span className="grade-pill">{sub.gradeLevel}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-data-text">No subjects assigned yet.</p>
                      )}
                    </div>
                  )}
                </div>


                
                <div className="card-actions">
                  <button className="edit-link">Edit</button>
                  <button 
                    className="assign-link" 
                    onClick={() => setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id)}
                  >
                    {expandedTeacher === teacher.id ? "Hide Load" : "View Load"}
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD TEACHER MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Faculty</h3>
              <FaTimes className="close-icon" onClick={() => setShowModal(false)} />
            </div>
            
            <form onSubmit={handleAddTeacher}>
              <div className="form-grid">
                <input 
                  type="text" placeholder="First Name" required 
                  value={newTeacher.firstName}
                  onChange={(e) => setNewTeacher({...newTeacher, firstName: e.target.value})}
                />
                <input 
                  type="text" placeholder="Last Name" required 
                  value={newTeacher.lastName}
                  onChange={(e) => setNewTeacher({...newTeacher, lastName: e.target.value})}
                />
              </div>

              <div className="form-grid">
                <input 
                  type="email" placeholder="Email Address" required 
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                />
                <input 
                  type="text" placeholder="Phone Number" required 
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({...newTeacher, phone: e.target.value})}
                />
              </div>

              <input 
                type="text" placeholder="Specialization (e.g., Mathematics)" required 
                value={newTeacher.specialization}
                onChange={(e) => setNewTeacher({...newTeacher, specialization: e.target.value})}
              />

              <div className="form-grid">
                <select 
                  value={newTeacher.advisory_grade}
                  onChange={(e) => setNewTeacher({...newTeacher, advisory_grade: e.target.value})}
                >
                  <option value="">No Advisory (N/A)</option>
                  <option value="Kindergarten 1">Kindergarten 1</option>
                  <option value="Kindergarten 2">Kindergarten 2</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>  
                </select>

                <select 
                  value={newTeacher.status}
                  onChange={(e) => setNewTeacher({...newTeacher, status: e.target.value})}
                >
                  <option value="active">Status: Active</option>
                  <option value="on_leave">Status: On Leave</option>
                  <option value="resigned">Status: Resigned</option>
                </select>
              </div>

              <button type="submit" className="submit-btn">Register Teacher</button>
            </form>
          </div>
        </div>
        
      )}
    </div>
    </div>
  );
}