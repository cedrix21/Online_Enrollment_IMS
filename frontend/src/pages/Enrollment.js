import { useState } from "react";
import API from "../api/axios";
import "./Enrollment.css";

export default function Enrollment() {
  const [formData, setFormData] = useState({
    // Registration Details
    registrationType: "", 
    gradeLevel: "",
    siblings: [{ name: "", birthDate: "" }],
    
    // Child's Information
    lastName: "",
    firstName: "",
    middleName: "",
    nickname: "",
    email: "", // Primary contact for Load Slips
    gender: "",
    dateOfBirth: "",
    handedness: "",

    // Father's Info
    fatherName: "",
    fatherOccupation: "",
    fatherContact: "",
    fatherEmail: "",
    fatherAddress: "",
    
    // Mother's Info
    motherName: "",
    motherOccupation: "",
    motherContact: "",
    motherEmail: "",
    motherAddress: "", 

    // Emergency & Medical
    emergencyContact: "",
    medicalConditions: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/enrollment/submit', formData);
      alert("Application submitted successfully!");
      // Optional: Reset form or redirect
    } catch (err) {
      // Logic to show specific validation errors from Laravel if available
      const errorMsg = err.response?.data?.message || "Error submitting form.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const addSibling = () => {
    setFormData({
      ...formData,
      siblings: [...formData.siblings, { name: "", birthDate: "" }]
    });
  };

  const handleSiblingChange = (index, e) => {
    const updatedSiblings = [...formData.siblings];
    updatedSiblings[index][e.target.name] = e.target.value;
    setFormData({ ...formData, siblings: updatedSiblings });
  };

  return (
    <div className="enrollment-container">
      <div className="enrollment-card">
        <div className="form-header">
          <h2>SICS ENROLLMENT FORM</h2>
          <p>S.Y. 2026 - 2027</p>
        </div>

        <form onSubmit={handleSubmit} className="enrollment-grid-form">
          {/* Section: Registration Status */}
          <div className="form-section">
            <h3>Registration Status</h3>
            <div className="input-group">
              <div className="input-grid-2">
            <div className="input-row">
              <select name="registrationType" value={formData.registrationType} onChange={handleChange} required>
                <option value="">Select Status</option>
                <option value="New Student">New Student</option>
                <option value="Returning Student">Returning Student</option>
                <option value="Continuing">Continuing</option>
              </select>
              <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required>
                <option value="">Enrolling For...</option>
                <option value="Nursery">Nursery (2 1/2 - 3 yrs)</option>
                <option value="Kindergarten 1">K1 (4 - 5 yrs)</option>
                <option value="Kindergarten 2">K2 (5 - 6 yrs)</option>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={`Grade ${n}`}>Grade {n}</option>)}
              </select>
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
            </div>
            
            {/* Added Handedness to fulfill Model Requirements */}
            <div className="input-group">
              <label>Handedness</label>
              <select name="handedness" value={formData.handedness} onChange={handleChange}>
                <option value="">Select Handedness</option>
                <option value="Right-handed">Right-handed</option>
                <option value="Left-handed">Left-handed</option>
              </select>
            </div>
          </div>

          {/* Section: Official Contact Information */}
          <div className="form-section">
            <h3>Official Contact Information</h3>
            <div className="input-group">
              <label>Parent/Guardian Email Address</label>
              <input 
                type="email" 
                name="email" 
                placeholder="email@example.com"
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
              <small style={{color: '#8b7500'}}>* This email is where we will send the Student Load Slip and School Updates.</small>
            </div>
          </div>

          {/* Section: Parent's Information */}
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

          {/* Section: Siblings */}
          <div className="form-section">
            <h3>List of Enrolled Siblings at SICS</h3>
            <div className="input-group">
            {formData.siblings.map((sibling, index) => (
              <div key={index} className="input-grid-2 mb-2">
                <input 
                  name="name" 
                  placeholder={`Sibling ${index + 1} Full Name`} 
                  value={sibling.name} 
                  onChange={(e) => handleSiblingChange(index, e)} 
                />
                <input 
                  type="date" 
                  name="birthDate" 
                  value={sibling.birthDate} 
                  onChange={(e) => handleSiblingChange(index, e)} 
                />
              </div>          
            ))}
            </div>
            <button type="button" className="add-sibling-btn" onClick={addSibling}>
              + Add Another Sibling
            </button>
          </div>

          {/* Section: Emergency & Medical */}
            <div className="form-section">
              <h3>Emergency & Medical Information</h3>
              <div className="input-group">
                <label>Emergency Contact Person & Number</label>
                <input 
                  name="emergencyContact" 
                  placeholder="e.g. Maria Santos - 09123456789" 
                  value={formData.emergencyContact} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>Medical Conditions / Allergies</label>
                <textarea 
                  name="medicalConditions" 
                  placeholder="Please list any medical conditions, allergies, or developmental concerns." 
                  value={formData.medicalConditions} 
                  onChange={handleChange}
                  rows="3"
                />
              </div>
            </div>  

          <button type="submit" className="enroll-button" disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
          
          <div className="form-footer-warning">
            THIS FORM IS THE PROPERTY OF SICS. UNAUTHORIZED REPRODUCTION IS PROHIBITED.
          </div>
        </form>
      </div>
    </div>
  );
}