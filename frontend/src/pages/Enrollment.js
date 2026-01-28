import { useState } from "react";
import API from "../api/api";
import "./Enrollment.css";
import "./LoadingSpinner.css";

export default function Enrollment() {
  // 1. Added isSubmitted state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(true); 
  const [paymentRef, setPaymentRef] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [formData, setFormData] = useState({
    registrationType: "", 
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


    paymentMethod: "",    
    reference_number: "",      
    amount_paid: "",           
    receipt_image: null,
    payment_status: "",
   
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    // 1. Validation Logic
    if (!paymentMethod) {
        alert("Please select a payment method.");
        return;
    }

    // Only require Ref and File if it's NOT Cash
    if (paymentMethod !== "Cash") {
        if (!paymentRef || !receiptFile || !amountPaid) {
            alert("Please complete the payment details: Reference Number, Amount, and Receipt Image.");
            return;
        }

        if (receiptFile.size > 2048 * 1024) { // 2MB
            alert("Receipt image must be less than 2MB");
            return;
        }
    }

    setLoading(true);
    const dataToSend = new FormData();

    // 2. Append Standard Form Fields
    Object.keys(formData).forEach(key => {
        if (key !== 'siblings' && key !== 'receipt_image') {
            dataToSend.append(key, formData[key]);
        }
    });

    // 3. Append Siblings Array
    if (formData.siblings && formData.siblings.length > 0) {
        formData.siblings.forEach((sib, index) => {
            if (sib.name) {
                dataToSend.append(`siblings[${index}][name]`, sib.name);
            }
            if (sib.birthDate) {
                dataToSend.append(`siblings[${index}][birthDate]`, sib.birthDate);
            }
        });
    }

    

    // 4. --- UPDATED BILLING FIELDS LOGIC ---
    dataToSend.append('paymentMethod', paymentMethod);

    if (paymentMethod === "Cash") {
        dataToSend.append('amount_paid', 0);
        dataToSend.append('reference_number', 'WALK-IN-PENDING');
        // We don't append receipt_image for Cash
    } else {
        dataToSend.append('amount_paid', amountPaid);
        dataToSend.append('reference_number', paymentRef);
        if (receiptFile) {
            dataToSend.append('receipt_image', receiptFile);
        }
    }

    try {
        // 5. API Submission
        await API.post('/enrollment/submit', dataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`Upload Progress: ${percentCompleted}%`);
                // Optional: You can update a progress bar here
            }
        });
        
        setIsSubmitted(true);
        window.scrollTo(0, 0); 
    } catch (err) {
        console.error("Submission Error:", err.response?.data);
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
      {/* --- DATA PRIVACY MODAL --- */}
      {showPrivacy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            borderTop: '10px solid #b8860b'
          }}>
            <h2 style={{ color: '#b8860b', marginTop: 0 }}>Data Privacy Notice</h2>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#444' }}>
              In accordance with the <strong>Data Privacy Act of 2012</strong>, Siloam International Christian School (SICS) 
              is committed to protecting the personal information of our students and their families. 
            </p>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              By clicking <strong>"I Agree and Proceed"</strong>, you authorize SICS to:
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.5' }}>
              <li>Collect and process the personal and sensitive data provided in this form.</li>
              <li>Use the provided email address for official school communications and load slips.</li>
              <li>Store this information securely for the duration of the student's enrollment.</li>
            </ul>
            <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowPrivacy(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#b8860b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                I Agree and Proceed
              </button>
              <button 
                onClick={() => window.location.href = '/*'} // Redirect away if they disagree
                style={{
                  padding: '12px',
                  backgroundColor: '#eee',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="enrollment-card">
        
        {isSubmitted ? (
          /* --- SUCCESS OVERLAY SECTION --- */
          <div className="success-overlay" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#b8860b', fontSize: '2rem', marginBottom: '10px' }}>Submission Successful!</h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>
              Thank you, <strong>{formData.fatherName || formData.motherName || 'Parent'}</strong>. <br />
              The application for <strong>{formData.firstName} {formData.lastName}</strong> has been received.
            </p>
            
            <div style={{ 
              textAlign: 'left', 
              backgroundColor: '#fffdf0', 
              padding: '25px', 
              borderRadius: '12px', 
              border: '1px solid #e6dbac',
              maxWidth: '500px',
              margin: '0 auto 30px auto'
            }}>
              <h4 style={{ color: '#b8860b', marginTop: 0 }}>Next Steps:</h4>
              <ul style={{ paddingLeft: '20px', color: '#444', lineHeight: '1.8', fontSize: '0.95rem' }}>
                <li>Check your email (<strong>{formData.email}</strong>) for further updates.</li>
                <li>Visit the school office to submit physical requirements.</li>
                <li>Ensure <strong>Kid's Note</strong> is installed on your mobile device.</li>
              </ul>
            </div>

            <button 
              className="enroll-button" 
              onClick={() => window.location.reload()}
              style={{ maxWidth: '300px' }}
            >
              Submit Another Application
            </button>
          </div>
        ) : (








          /* --- ORIGINAL FORM SECTION --- */
          <>
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
                    <select name="registrationType" value={formData.registrationType} onChange={handleChange} required>
                      <option value="">Select Status</option>
                      <option value="New Student">New Student</option>
                      <option value="Continuing">Continuing</option>
                      <option value="Transferee">Transferee</option>
                      <option value="Returning Student">Returning Student</option>
                    </select>
                    <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required>
                      <option value="">Enrolling For...</option>
                      <option value="Kindergarten 1">K1 (4 - 5 yrs)</option>
                      <option value="Kindergarten 2">K2 (5 - 6 yrs)</option>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={`Grade ${n}`}>Grade {n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Section: Requirements Reminder */}
                <div className="requirements-box" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fffdf0', border: '1px solid #e6dbac', borderRadius: '8px' }}>
                  <h4 style={{ color: '#b8860b', marginTop: 0 }}>Enrollment Requirements Reminder</h4>
                  {formData.registrationType === "Continuing" ? (
                    <div style={{ padding: '10px', backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '6px' }}>
                      <p style={{ fontSize: '0.9rem', color: '#2e7d32', margin: 0 }}>
                        <strong>Welcome back!</strong> As a continuing student, you only need to ensure your "Kid's Note" app is active.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Please prepare the following for the School Office:</p>
                      <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', listStyleType: 'none', padding: 0, fontSize: '0.85rem' }}>
                        <li>✅ 1x1 ID Picture (Recent)</li>
                        <li>✅ PSA Birth Certificate</li>
                        {(formData.registrationType === "New Student" || formData.registrationType === "Returning Student" || formData.registrationType === "Transferee") && (
                          <>
                            <li>✅ Certificate of Good Moral</li>
                            <li>✅ Original Report Card (Form 138)</li>
                          </>
                        )}
                      </ul>
                    </>
                  )}
                  <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#d32f2f', fontWeight: 'bold', borderTop: '1px dashed #e6dbac', paddingTop: '10px' }}>
                    📌 Required for all: Install "Kid's Note" app for official school updates.
                  </div>
                </div>
              </div>

              {/* Child's Information */}
              <div className="form-section">
                <h3>Child's Information</h3>
                <div className="input-group">
                <div className="input-grid-3">
                  <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
                  <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                  <input name="middleName" placeholder="Middle Name" value={formData.middleName} onChange={handleChange} />
                </div>
                <div className="input-grid-3" style={{ marginTop: '15px' }}>
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
                <div className="input-group" style={{ marginTop: '15px' }}>
                  <label>Handedness</label>
                  <select name="handedness" value={formData.handedness} onChange={handleChange}>
                    <option value="">Select Handedness</option>
                    <option value="Right-handed">Right-handed</option>
                    <option value="Left-handed">Left-handed</option>
                  </select>
                </div>
              </div>
              </div>

              {/* Contact Information */}
              <div className="form-section">
                <h3>Official Contact Information</h3>
                <div className="input-group">
                  <label>Parent/Guardian Email Address</label>
                  <input type="email" name="email" placeholder="email@example.com" value={formData.email} onChange={handleChange} required />
                  <small style={{color: '#8b7500'}}>* This email is where we will send the Student Load Slip.</small>
                </div>
              </div>

              {/* Parents Info */}
              <div className="form-section">
                <h3>Father's Information</h3>
                <div className="input-group">
                <div className="input-grid-2">
                  <input name="fatherName" placeholder="Full Name" value={formData.fatherName} onChange={handleChange} required />
                  <input name="fatherContact" placeholder="Contact #" value={formData.fatherContact} onChange={handleChange} required />
                  <input name="fatherOccupation" placeholder="Occupation" value={formData.fatherOccupation} onChange={handleChange} />
                  <input name="fatherEmail" placeholder="Email Address" value={formData.fatherEmail} onChange={handleChange} />
                </div>
                <input name="fatherAddress" placeholder="Address" value={formData.fatherAddress} onChange={handleChange} style={{ width: '100%', marginTop: '10px' }} />
              </div>
              </div>

              <div className="form-section">
                <h3>Mother's Information</h3>
                <div className="input-group">
                <div className="input-grid-2">
                  <input name="motherName" placeholder="Full Name" value={formData.motherName} onChange={handleChange} required/>
                  <input name="motherContact" placeholder="Contact #" value={formData.motherContact} onChange={handleChange} required/>
                  <input name="motherOccupation" placeholder="Occupation" value={formData.motherOccupation} onChange={handleChange} />
                  <input name="motherEmail" placeholder="Email Address" value={formData.motherEmail} onChange={handleChange} />
                </div>
                <input name="motherAddress" placeholder="Address" value={formData.motherAddress} onChange={handleChange} style={{ width: '100%', marginTop: '10px' }} />
              </div>
              </div>  

              {/* Siblings */}
              <div className="form-section">
                <h3>List of Enrolled Siblings at SICS</h3>
                <div className="input-group">
                {formData.siblings.map((sibling, index) => (
                  <div key={index} className="input-grid-2" style={{ marginBottom: '10px' }}>
                    <div className="input-group">
                      <label>Name</label>
                      <input name="name" placeholder="Sibling Full Name" value={sibling.name} onChange={(e) => handleSiblingChange(index, e)} />
                    </div>
                    <div className="input-group">
                      <label>Birth Date</label>
                      <input type="date" name="birthDate" value={sibling.birthDate} onChange={(e) => handleSiblingChange(index, e)} />
                    </div>
                  </div>          
                ))}
                <button type="button" className="add-sibling-btn" onClick={addSibling}>+ Add Another Sibling</button>
              </div>
              </div>

              {/* Emergency & Medical */}
              <div className="form-section">
                <h3>Emergency & Medical Information</h3>
                <div className="input-group">
                  <label>Emergency Contact Person & Number</label>
                  <input name="emergencyContact" placeholder="e.g. Maria Santos - 09123456789" value={formData.emergencyContact} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label>Medical Conditions / Allergies</label>
                  <textarea name="medicalConditions" placeholder="Please list concerns..." value={formData.medicalConditions} onChange={handleChange} rows="3" />
                </div>
              </div>  


                {/* payment section */}
                <div className="payment-section">
                      <h3 style={{ color: '#b8860b' }}>Initial Downpayment</h3>
                      <p style={{ fontSize: '0.8rem', marginBottom: '15px' }}>This payment will be recorded in the student's billing ledger.</p>
                      
                      <div className="input-group" style={{ marginBottom: '15px' }}>
                          <label>Payment Method</label>
                          <select 
                              value={paymentMethod} 
                              onChange={(e) => setPaymentMethod(e.target.value)} 
                              required
                          >
                              <option value="">Select Method</option>
                              <option value="Cash">💵 Cash (Walk-in)</option>
                              <option value="GCash">📱 GCash</option>
                              <option value="Bank Transfer">🏦 Bank Transfer</option>
                          </select>
                      </div>

                      {paymentMethod === "Cash" && (
                          <div style={{ padding: '15px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', color: '#0d47a1' }}>
                              <strong>📌 Notice:</strong> Please proceed to the <strong>School Registrar Office</strong> to settle your payment. Your enrollment will remain "Pending" until the cash payment is verified.
                          </div>
                      )}

                      {(paymentMethod === "GCash" || paymentMethod === "Bank Transfer") && (
                          <>
                              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f4f8', borderRadius: '8px', fontSize: '0.9rem' }}>
                                  <strong>Account Details:</strong><br />
                                  GCash: 0912-XXX-XXXX (SICS Official)<br />
                                  Bank: BDO - 1234567890 (Siloam International Christian School)
                              </div>
                              
                              <div className="input-grid-2">
                                  <div className="input-group">
                                      <label>Downpayment Amount(₱)</label>
                                      <input 
                                          type="number" 
                                          value={amountPaid}
                                          onChange={(e) => setAmountPaid(e.target.value)} 
                                          placeholder="0.00"
                                          required
                                      />
                                  </div>
                                  <div className="input-group">
                                      <label>Reference Number</label>
                                      <input 
                                          type="text" 
                                          value={paymentRef}
                                          onChange={(e) => setPaymentRef(e.target.value)} 
                                          placeholder="Ref #"
                                          required
                                      />
                                  </div>
                              </div>
                              
                              <div className="input-group" style={{ marginTop: '15px' }}>
                                  <label>Upload Receipt Image</label>
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={(e) => setReceiptFile(e.target.files[0])} 
                                      required
                                  />
                              </div>
                          </>
                      )}
                  </div>

              <button type="submit" className="enroll-button" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </button>
              
              <div className="form-footer-warning">
                THIS FORM IS THE PROPERTY OF SICS. UNAUTHORIZED REPRODUCTION IS PROHIBITED.
              </div>
            </form>
          </>
        )}
      </div>



      <div className="enrollment-container">

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">Submitting Application...</p>
          <p className="loading-subtext">Please wait, do not close this window</p>
        </div>
      )}

    </div>
    </div>

  );
  
}