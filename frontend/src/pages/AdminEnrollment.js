import { useState } from "react";
import API from "../api/axios";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import "./Enrollment.css"; 

export default function AdminEnrollment() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [formData, setFormData] = useState({
    registrationType: "New Student", 
    gradeLevel: "",
    siblings: [{ name: "", birthDate: "" }],
    lastName: "",
    firstName: "",
    middleName: "",
    nickname: "",
    email: "", 
    gender: "",
    dateOfBirth: "",
    handedness: "",
    fatherName: "",
    fatherOccupation: "",
    fatherContact: "",
    fatherEmail: "",
    fatherAddress: "",
    motherName: "",
    motherOccupation: "",
    motherContact: "",
    motherEmail: "",
    motherAddress: "", 
    emergencyContact: "",
    medicalConditions: "",
    enrollmentDate: new Date().toISOString().split('T')[0],
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSiblingChange = (index, e) => {
    const updatedSiblings = [...formData.siblings];
    updatedSiblings[index][e.target.name] = e.target.value;
    setFormData({ ...formData, siblings: updatedSiblings });
  };

  const addSibling = () => {
    setFormData({
      ...formData,
      siblings: [...formData.siblings, { name: "", birthDate: "" }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await API.post("/admin/enroll-student", formData);
      alert(`Success! Student ID: ${response.data.studentId} has been created and approved.`);
      // Reset logic can be added here if needed
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Could not register student.";
      setMessage("Error: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div className="enrollment-container" style={{backgroundImage: 'none', padding: '20px'}}>
          <div className="enrollment-card" style={{maxWidth: '100%', backgroundColor: '#fff'}}>
            <div className="form-header">
              <span className="role-badge registrar" style={{background: '#b8860b', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '12px'}}>OFFICE USE ONLY</span>
              <h2>INTERNAL STUDENT REGISTRATION</h2>
              <p>S.Y. 2026 - 2027</p>
            </div>

            {message && <div className="message" style={{backgroundColor: '#f8d7da', color: '#721c24'}}>{message}</div>}

            <form onSubmit={handleSubmit} className="enrollment-grid-form">
              
              {/* Section: Registration Status */}
              <div className="form-section">
                <h3>Registration Status</h3>
                <div className="input-row">
                  <div className="input-group">
                    <div className="input-grid-3">
                  <select name="registrationType" value={formData.registrationType} onChange={handleChange} required>
                    <option value="New Student">New Student</option>
                    <option value="Returning Student">Returning Student</option>
                    <option value="Continuing">Continuing</option>
                  </select>
                  <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required>
                    <option value="">Select Grade Level</option>
                    <option value="Nursery">Nursery</option>
                    <option value="Kindergarten 1">K1</option>
                    <option value="Kindergarten 2">K2</option>
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={`Grade ${n}`}>Grade {n}</option>)}
                  </select>
                  <input type="date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleChange} required />
                </div>
              </div>
              </div>
              </div>

              {/* Section: Child's Information */}
              <div className="form-section">
                <h3>Child's Information</h3>
                <div className="input-group">
                <div className="input-grid-3">
                  <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
                  <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                  <input name="middleName" placeholder="Middle Name" value={formData.middleName} onChange={handleChange} />
                </div>
                <div className="input-grid-3">
                  <div className="input-group">
                    <label>Nickname</label>
                    <input name="nickname" placeholder="Nickname" value={formData.nickname} onChange={handleChange} />
                  </div>
                  <div className="input-group">
                    <label>Date of Birth</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label>Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>Handedness</label>
                  <select name="handedness" value={formData.handedness} onChange={handleChange}>
                    <option value="">Select Handedness</option>
                    <option value="Right-handed">Right-handed</option>
                    <option value="Left-handed">Left-handed</option>
                  </select>
                </div>
              </div>
              </div>

              {/* Section: Official Contact */}
              <div className="form-section">
                <h3>Official Contact Information</h3>
                <div className="input-group">
                  <label>Primary Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
              </div>

              {/* Section: Parents */}
              <div className="form-section">
                <h3>Father's Information</h3>
                <div className="input-group">          
                <div className="input-grid-2">
                  <input name="fatherName" placeholder="Full Name" value={formData.fatherName} onChange={handleChange} />
                  <input name="fatherContact" placeholder="Contact #" value={formData.fatherContact} onChange={handleChange} />
                  <input name="fatherOccupation" placeholder="Occupation" value={formData.fatherOccupation} onChange={handleChange} />
                  <input name="fatherEmail" placeholder="Email Address" value={formData.fatherEmail} onChange={handleChange} />
                  <input name="fatherAddress" placeholder="Address" value={formData.fatherAddress} onChange={handleChange} />  
                </div>
              </div>

              <div className="form-section">
                <h3>Mother's Information</h3>
                <div className="input-group"> 
                <div className="input-grid-2">
                  <input name="motherName" placeholder="Full Name" value={formData.motherName} onChange={handleChange} />
                  <input name="motherContact" placeholder="Contact #" value={formData.motherContact} onChange={handleChange} />
                  <input name="motherOccupation" placeholder="Occupation" value={formData.motherOccupation} onChange={handleChange} />
                  <input name="motherEmail" placeholder="Email Address" value={formData.motherEmail} onChange={handleChange} />
                  <input name="motherAddress" placeholder="Address" value={formData.motherAddress} onChange={handleChange} />  
                </div>
              </div>
              </div>
              </div>

              {/* Section: Siblings */}
              <div className="form-section">
                <h3>List of Enrolled Siblings</h3>
                <div className="input-group"> 
                {formData.siblings.map((sibling, index) => (
                  <div key={index} className="input-grid-2 mb-2">
                    <input name="name" placeholder="Sibling Name" value={sibling.name} onChange={(e) => handleSiblingChange(index, e)} />
                    <input type="date" name="birthDate" value={sibling.birthDate} onChange={(e) => handleSiblingChange(index, e)} />
                  </div>
                ))}
                <button type="button" className="add-sibling-btn" onClick={addSibling}>+ Add Sibling</button>
              </div>
              </div>

              {/* Section: Emergency & Medical */}
              <div className="form-section">
                <h3>Emergency & Medical Information</h3>
                <div className="input-group">
                  <label>Emergency Contact</label>
                  <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label>Medical Conditions</label>
                  <textarea name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} rows="3" />
                </div>
              </div>

              <button type="submit" className="enroll-button" disabled={loading}>
                {loading ? "Processing..." : "Register & Approve Student"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}