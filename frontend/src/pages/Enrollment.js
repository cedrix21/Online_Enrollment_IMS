import { useState, useEffect } from "react";
import API from "../api/api";
import "./Enrollment.css";
import "./LoadingSpinner.css";

export default function Enrollment() {
  const [isSubmitted,        setIsSubmitted]        = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [showPrivacy,        setShowPrivacy]        = useState(true);
  const [paymentRef,         setPaymentRef]         = useState("");
  const [receiptFile,        setReceiptFile]        = useState(null);
  const [amountPaid,         setAmountPaid]         = useState("");
  const [paymentMethod,      setPaymentMethod]      = useState("");
  const [processingPayment,  setProcessingPayment]  = useState(false);
  const [gcashRedirectUrl,   setGcashRedirectUrl]   = useState("");
  const [continuingStudentId, setContinuingStudentId] = useState("");
  const [studentIdValid, setStudentIdValid] = useState(null); 
  // ── Requirement files (all optional) ─────────────────────────
  const [requirementFiles, setRequirementFiles] = useState({
    psa:          null,
    good_moral:   null,
    report_card:  null,
    picture_2x2:  null,
    picture_1x1:  null,
  });

  const handleRequirementFile = (key, file) => {
    setRequirementFiles(prev => ({ ...prev, [key]: file }));
  };

  // ── Tuition fees from API ─────────────────────────────────────
  const [tuitionFees, setTuitionFees] = useState({});
  const [feesLoading, setFeesLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await API.get('/tuition-fees/public');
        setTuitionFees(res.data);
      } catch (err) {
        console.error('Failed to load fees:', err);
      } finally {
        setFeesLoading(false);
      }
    };
    fetchFees();
  }, []);

  // ── School year ───────────────────────────────────────────────
  const getCurrentSchoolYear = () => {
    // return '2026-2027';
    const month = new Date().getMonth() + 1;
    const year  = new Date().getFullYear();
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };
  const [schoolYear] = useState(getCurrentSchoolYear());

  // ── Form state ────────────────────────────────────────────────
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

  // ── Fee breakdown helper ──────────────────────────────────────
  const fmtPeso = (n) =>
    '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });

  // ── Requirements list per registration type ───────────────────
  const getRequirementsList = () => {
    const base = [
      '🖼️ 1x1 ID Picture (1 pc) & 2x2 ID Picture (2 pcs)',
      '📄 PSA Birth Certificate (Photocopy)',
      '📱 Kids Note App',
    ];

    switch (formData.registrationType) {
      case 'New Student':
        return [...base,
          '✅ Certificate of Good Moral',
          '📋 Original Report Card (If Applicable)',
        ];
      case 'Continuing':
        return base;
      case 'Transferee':
        return [...base,
          '✅ Certificate of Good Moral',
          '📋 Original Report Card',
        ];
      case 'Returning Student':
        return [...base,
          '✅ Certificate of Good Moral',
          '📋 Original Report Card',
        ];
      default:
        return base;
    }
  };

  // ── GCash handler ─────────────────────────────────────────────
  const handleGCashPayment = async () => {
    if (!amountPaid || parseFloat(amountPaid) < 5000) {
      alert("Please enter a valid payment amount (Minimum ₱5000)");
      return;
    }
    setProcessingPayment(true);
    try {
      const dataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (!['siblings', 'receipt_image', 'amount_paid', 'paymentMethod'].includes(key)) {
          dataToSend.append(key, formData[key]);
        }
      });
      formData.siblings.forEach((sib, index) => {
        if (sib.name) {
          dataToSend.append(`siblings[${index}][name]`, sib.name);
          dataToSend.append(`siblings[${index}][birthDate]`, sib.birthDate);
        }
      });
      dataToSend.append('paymentMethod', 'GCash');
      dataToSend.append('amount_paid', parseFloat(amountPaid));
      dataToSend.append('payment_status', 'pending');
      dataToSend.append('school_year', schoolYear);


      Object.entries(requirementFiles).forEach(([key, file]) => {
    if (file && file instanceof File) {
        dataToSend.append(`requirement_${key}`, file);
    }
});


      const response = await API.post('/payment/initialize-gcash-enrollment', dataToSend, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
      const { checkout_url, enrollment_id } = response.data;
      if (checkout_url) {
        const enrollmentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        email: formData.email,
        enrollment_id: enrollment_id
      };
      sessionStorage.setItem('gcashEnrollmentData', JSON.stringify(enrollmentData));

        window.location.href = checkout_url;
      } else {
        throw new Error("Checkout URL not received");
      }
    } catch (err) {
    console.error("Full error:", err);
    console.error("Response data:", err.response?.data);
    // Show detailed validation errors
    if (err.response?.data?.errors) {
        alert(JSON.stringify(err.response.data.errors, null, 2));
    } else {
        alert(err.response?.data?.message || "Failed to initiate payment.");
    }
    setProcessingPayment(false);
}
  };
const verifyStudentId = async () => {
  if (!continuingStudentId) {
    setStudentIdValid(null);
    return;
  }
  try {
    const res = await API.get(`/students/by-id/${continuingStudentId}`);
    if (res.status === 200) {
      setStudentIdValid(true);
      const student = res.data;
      // Auto-fill form fields (optional)
      setFormData(prev => ({
        ...prev,
        firstName: student.firstName,
        lastName: student.lastName,
        
      }));
    }
  } catch (err) {
    setStudentIdValid(false);
  }
};
  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!paymentMethod) { alert("Please select a payment method."); return; }

    if (paymentMethod === "GCash") {
      if (!amountPaid) { alert("Please enter the payment amount"); return; }
      handleGCashPayment();
      return;
    }

    if (paymentMethod === "Bank Transfer") {
      if (!paymentRef || !receiptFile || !amountPaid) {
        alert("Please complete the payment details: Reference Number, Amount, and Receipt Image.");
        return;
      }
      if (receiptFile.size > 2048 * 1024) {
        alert("Receipt image must be less than 2MB");
        return;
      }
    }

    await submitEnrollment();
  };

  const submitEnrollment = async () => {
    setLoading(true);
    const dataToSend = new FormData();

    Object.keys(formData).forEach(key => {
      if (key !== 'siblings' && key !== 'receipt_image') {
        dataToSend.append(key, formData[key]);
      }
    });

    formData.siblings?.forEach((sib, index) => {
      if (sib.name)      dataToSend.append(`siblings[${index}][name]`, sib.name);
      if (sib.birthDate) dataToSend.append(`siblings[${index}][birthDate]`, sib.birthDate);
    });

    // ── Append requirement files (all optional) ───────────────
    Object.entries(requirementFiles).forEach(([key, file]) => {
      if (file) dataToSend.append(`requirement_${key}`, file);
    });

    // Inside submitEnrollment, after appending formData fields
    if (formData.registrationType === 'Continuing') {
      dataToSend.append('studentId', continuingStudentId);
    }
    dataToSend.append('school_year', schoolYear); 
    dataToSend.append('paymentMethod', paymentMethod);

    if (paymentMethod === "Cash") {
      dataToSend.append('amount_paid', 0);
      dataToSend.append('reference_number', 'WALK-IN-PENDING');
      if (receiptFile) dataToSend.append('receipt_image', receiptFile);
    } else if (paymentMethod === "GCash") {
      dataToSend.append('amount_paid', amountPaid);
      dataToSend.append('reference_number', paymentRef);
      dataToSend.append('payment_status', 'paid');
    } else if (paymentMethod === "Bank Transfer") {
      dataToSend.append('amount_paid', amountPaid);
      dataToSend.append('reference_number', paymentRef);
      if (receiptFile) dataToSend.append('receipt_image', receiptFile);
    }

    try {
      await API.post('/enrollment/submit', dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Submission Error:", err.response?.data);
      alert(err.response?.data?.message || "Error submitting form.");
    } finally {
      setLoading(false);
    }
  };

  const addSibling = () =>
    setFormData({ ...formData, siblings: [...formData.siblings, { name: "", birthDate: "" }] });

  const handleSiblingChange = (index, e) => {
    const updatedSiblings = [...formData.siblings];
    updatedSiblings[index][e.target.name] = e.target.value;
    setFormData({ ...formData, siblings: updatedSiblings });
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="enrollment-container">

      {/* ── Data Privacy Modal ── */}
      {showPrivacy && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '30px', borderRadius: '12px',
            maxWidth: '600px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            borderTop: '10px solid #b8860b'
          }}>
            <h2 style={{ color: '#b8860b', marginTop: 0 }}>Data Privacy Notice</h2>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#444' }}>
              In accordance with the <strong>Data Privacy Act of 2012</strong>, Siloam International
              Christian School (SICS) is committed to protecting the personal information of our
              students and their families.
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
                style={{ flex: 1, padding: '12px', backgroundColor: '#b8860b', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                I Agree and Proceed
              </button>
              <button
                onClick={() => window.location.href = '/*'}
                style={{ padding: '12px', backgroundColor: '#eee', color: '#666',
                  border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="enrollment-card">
        {isSubmitted ? (
          /* ── Success Screen ── */
          <div className="success-overlay" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#b8860b', fontSize: '2rem', marginBottom: '10px' }}>
              Submission Successful!
            </h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>
              Thank you, <strong>{formData.fatherName || formData.motherName || 'Parent'}</strong>.<br />
              The application for <strong>{formData.firstName} {formData.lastName}</strong> has been received.
            </p>
            <div style={{
              textAlign: 'left', backgroundColor: '#fffdf0', padding: '25px',
              borderRadius: '12px', border: '1px solid #e6dbac',
              maxWidth: '500px', margin: '0 auto 30px auto'
            }}>
              <h4 style={{ color: '#b8860b', marginTop: 0 }}>Next Steps:</h4>
              <ul style={{ paddingLeft: '20px', color: '#444', lineHeight: '1.8', fontSize: '0.95rem' }}>
                <li>Check your email (<strong>{formData.email}</strong>) for further updates.</li>
                <li>Visit the school office to submit physical requirements.</li>
                <li>Ensure <strong>Kid's Note</strong> is installed on your mobile device.</li>
              </ul>
            </div>
            <button className="enroll-button" onClick={() => window.location.reload()}
              style={{ maxWidth: '300px' }}>
              Submit Another Application
            </button>
          </div>
        ) : (
          <>
            <div className="form-header">
              <h2>SICS ENROLLMENT FORM</h2>
              <p>S.Y. {schoolYear}</p>
            </div>

            <form onSubmit={handleSubmit} className="enrollment-grid-form">

             {/* ── Registration Status ── */}
                <div className="form-section">
                  <h3>Registration Status</h3>
                  <div className="input-group">
                    {/* Row 1: Registration Type + Student ID (side by side) */}
                    <div className="input-grid-2">
                      <div>
                        <label>Registration Type</label>
                        <select 
                          name="registrationType" 
                          value={formData.registrationType}
                          onChange={handleChange} 
                          required
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px' }}
                        >
                          <option value="">Select Status</option>
                          <option value="New Student">New Student</option>
                          <option value="Continuing">Continuing</option>
                          <option value="Transferee">Transferee</option>
                          <option value="Returning Student">Returning Student</option>
                        </select>
                      </div>

                      {formData.registrationType === 'Continuing' ? (
                        <div>
                          <label>Student ID (e.g., SICS-2025-0001)</label>
                          <input
                            type="text"
                            value={continuingStudentId}
                            onChange={(e) => {
                              setContinuingStudentId(e.target.value.toUpperCase());
                              setStudentIdValid(null);
                            }}
                            onBlur={verifyStudentId}
                            placeholder="SICS-YYYY-XXXX"
                            required              
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid',
                              borderColor: studentIdValid === false ? '#d32f2f' : 
                                          studentIdValid === true ? '#2e7d32' : '#ccc',
                              borderRadius: '6px'
                            }}
                          />
                          {studentIdValid === true && (
                            <small style={{ color: '#2e7d32', marginTop: '4px', display: 'block' }}>
                              ✓ {formData.firstName} {formData.lastName}
                            </small>
                          )}
                          {studentIdValid === false && (
                            <small style={{ color: '#d32f2f', marginTop: '4px', display: 'block' }}>
                              ✗ Student ID not found
                            </small>
                          )}
                        </div>
                      ) : (
                        <div /> // empty placeholder to maintain grid alignment
                      )}
                    </div>

                    {/* Row 2: Grade Level (full width) */}
                    <div style={{ marginTop: '15px' }}>
                      <label>Enrolling For (Grade Level)</label>
                      <select 
                        name="gradeLevel" 
                        value={formData.gradeLevel}
                        onChange={handleChange} 
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '6px',
                          backgroundColor: '#fff'
                        }}
                      >
                        <option value="">Select Grade</option>
                        <option value="Nursery">Nursery</option>
                        <option value="Kindergarten 1">K1 (4 - 5 yrs)</option>
                        <option value="Kindergarten 2">K2 (5 - 6 yrs)</option>
                        {[1,2,3,4,5,6].map(n =>
                          <option key={n} value={`Grade ${n}`}>Grade {n}</option>
                        )}
                      </select>
                      {formData.registrationType === 'Continuing' && studentIdValid === true && (
                        <small style={{ color: '#2e7d32', marginTop: '4px', display: 'block' }}>
                          ℹ️ Select the grade level for the upcoming school year.
                        </small>
                      )}
                    </div>
                    

                    {/* Additional helper text (optional) */}
                    {formData.registrationType === 'Continuing' && (
                      <small style={{ color: '#8b7500', marginTop: '10px', display: 'block' }}>
                        This ID was provided in your previous enrollment confirmation.
                      </small>
                    )}
                  </div>
                </div>

                {/* ── Requirements Reminder ── */}
                {formData.registrationType && (
                  <div className="requirements-box" style={{
                    marginTop: '20px', padding: '15px', backgroundColor: '#fffdf0',
                    border: '1px solid #e6dbac', borderRadius: '8px'
                  }}>
                    <h4 style={{ color: '#b8860b', marginTop: 0 }}>
                      Enrollment Requirements —{' '}
                      <span style={{ fontWeight: 'normal', fontSize: '0.9rem' }}>
                        {formData.registrationType}
                      </span>
                    </h4>
                    <ul style={{
                      listStyleType: 'none', padding: 0, margin: 0,
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '8px', fontSize: '0.85rem'
                    }}>
                      {getRequirementsList().map((req, i) => (
                        <li key={i} style={{ color: '#444' }}>{req}</li>
                      ))}
                    </ul>
                    <div style={{
                      marginTop: '12px', fontSize: '0.82rem', color: '#d32f2f',
                      fontWeight: 'bold', borderTop: '1px dashed #e6dbac', paddingTop: '10px'
                    }}>
                      📌 Required for all: Install "Kid's Note" app for official school updates.
                    </div>
                  </div>
                )}

                {/* ── Fee Breakdown Box ── */}
                {formData.gradeLevel && tuitionFees[formData.gradeLevel] && (() => {
                  const fee = tuitionFees[formData.gradeLevel];
                  return (
                    <div style={{ marginTop: '16px', border: '1.5px solid #b8860b',
                      borderRadius: '10px', overflow: 'hidden', fontSize: '0.875rem' }}>
                      <div style={{ backgroundColor: '#b8860b', color: '#fff',
                        padding: '10px 15px', fontWeight: 'bold' }}>
                        💰 Tuition & Fee Breakdown — {formData.gradeLevel}
                        <span style={{ fontWeight: 'normal', fontSize: '0.8rem', opacity: 0.85 }}>
                          &nbsp; SY: {fee.school_year}
                        </span>
                      </div>
                      <div style={{ padding: '12px 15px', backgroundColor: '#fffdf0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e6dbac' }}>
                              <th style={{ textAlign: 'left', padding: '5px 0', color: '#666' }}>Fee Details</th>
                              <th style={{ textAlign: 'right', padding: '5px 0', color: '#666' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '4px 0', color: '#444' }}>Tuition Fee</td>
                              <td style={{ textAlign: 'right', color: '#444' }}>{fmtPeso(fee.tuition_fee)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px 0', color: '#444' }}>Miscellaneous Fee</td>
                              <td style={{ textAlign: 'right', color: '#444' }}>{fmtPeso(fee.misc_total)}</td>
                            </tr>
                            {fee.korean_fee > 0 && (
                              <tr>
                                <td style={{ padding: '4px 0', color: '#444' }}>Korean Language Fee</td>
                                <td style={{ textAlign: 'right', color: '#444' }}>{fmtPeso(fee.korean_fee)}</td>
                              </tr>
                            )}
                            <tr style={{ borderTop: '1px solid #e6dbac', fontWeight: 'bold' }}>
                              <td style={{ padding: '6px 0', color: '#b8860b' }}>Total</td>
                              <td style={{ textAlign: 'right', color: '#b8860b' }}>{fmtPeso(fee.total_fee)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div style={{ padding: '10px 15px', backgroundColor: '#f7f0de',
                        borderTop: '1px solid #e6dbac' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px', textAlign: 'center' }}>
                          <div style={{ backgroundColor: '#fff', borderRadius: '8px',
                            padding: '10px', border: '1px solid #e6dbac' }}>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>Down Payment</div>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>{fmtPeso(fee.down_payment)}</div>
                          </div>
                          <div style={{ backgroundColor: '#fff', borderRadius: '8px',
                            padding: '10px', border: '1px solid #e6dbac' }}>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>Remaining Balance</div>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>{fmtPeso(fee.remaining_balance)}</div>
                          </div>
                          <div style={{ backgroundColor: '#b8860b', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>
                              Monthly ({fee.monthly_terms} mo.)
                            </div>
                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{fmtPeso(fee.monthly_payment)}</div>
                          </div>
                        </div>
                        {fee.misc_items?.length > 0 && (
                          <details style={{ marginTop: '10px' }}>
                            <summary style={{ fontSize: '0.8rem', color: '#b8860b',
                              cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>
                              ▼ View Miscellaneous Fee Breakdown
                            </summary>
                            <table style={{ width: '100%', borderCollapse: 'collapse',
                              fontSize: '0.8rem', marginTop: '8px' }}>
                              <tbody>
                                {fee.misc_items.map((item, i) => (
                                  <tr key={i}>
                                    <td style={{ padding: '3px 0', color: '#555' }}>{item.label}</td>
                                    <td style={{ textAlign: 'right', color: '#444' }}>{fmtPeso(item.amount)}</td>
                                  </tr>
                                ))}
                                <tr style={{ borderTop: '1px solid #e6dbac', fontWeight: 600 }}>
                                  <td style={{ padding: '4px 0', color: '#b8860b' }}>Total Misc</td>
                                  <td style={{ textAlign: 'right', color: '#b8860b' }}>{fmtPeso(fee.misc_total)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </details>
                        )}
                        <p style={{ fontSize: '0.75rem', color: '#888', margin: '8px 0 0', textAlign: 'center' }}>
                          * Fees are subject to change. Contact the school for the latest information.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Loading state for fees */}
                {formData.gradeLevel && feesLoading && (
                  <div style={{ marginTop: '12px', padding: '10px', textAlign: 'center',
                    color: '#94a3b8', fontSize: '0.85rem', backgroundColor: '#f8fafc',
                    borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    Loading fee information...
                  </div>
                )}
             

              {/* ── Requirements Upload ── */}
              <div className="form-section">
                <h3>
                  Upload Requirements{' '}
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>
                    (Optional)
                  </span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                  You may upload scanned copies or photos of your documents now for faster
                  processing. You can still submit without uploading — bring the originals
                  to the school office.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                  {/* PSA — all types */}
                  <div className="input-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      📄 PSA Birth Certificate (Photocopy)
                    </label>
                    <input type="file" accept="image/*,.pdf"
                      onChange={e => handleRequirementFile('psa', e.target.files[0])} />
                    {requirementFiles.psa && (
                      <small style={{ color: '#2e7d32' }}>✓ {requirementFiles.psa.name}</small>
                    )}
                  </div>

                  {/* 2x2 Picture — all types */}
                  <div className="input-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      🖼️ 2x2 ID Picture (2 pcs)
                    </label>
                    <input type="file" accept="image/*"
                      onChange={e => handleRequirementFile('picture_2x2', e.target.files[0])} />
                    {requirementFiles.picture_2x2 && (
                      <small style={{ color: '#2e7d32' }}>✓ {requirementFiles.picture_2x2.name}</small>
                    )}
                  </div>

                  {/* 1x1 Picture — all types */}
                  <div className="input-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      🖼️ 1x1 ID Picture (1 pc)
                    </label>
                    <input type="file" accept="image/*"
                      onChange={e => handleRequirementFile('picture_1x1', e.target.files[0])} />
                    {requirementFiles.picture_1x1 && (
                      <small style={{ color: '#2e7d32' }}>✓ {requirementFiles.picture_1x1.name}</small>
                    )}
                  </div>

                  {/* Good Moral — New, Transferee, Returning only */}
                  {['New Student', 'Transferee', 'Returning Student'].includes(formData.registrationType) && (
                    <div className="input-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        📋 Certificate of Good Moral
                      </label>
                      <input type="file" accept="image/*,.pdf"
                        onChange={e => handleRequirementFile('good_moral', e.target.files[0])} />
                      {requirementFiles.good_moral && (
                        <small style={{ color: '#2e7d32' }}>✓ {requirementFiles.good_moral.name}</small>
                      )}
                    </div>
                  )}

                  {/* Report Card — New (if applicable), Transferee, Returning */}
                  {['New Student', 'Transferee', 'Returning Student'].includes(formData.registrationType) && (
                    <div className="input-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        📝 Original Report Card
                        {formData.registrationType === 'New Student' && (
                          <span style={{ fontWeight: 'normal', color: '#94a3b8' }}> (If Applicable)</span>
                        )}
                      </label>
                      <input type="file" accept="image/*,.pdf"
                        onChange={e => handleRequirementFile('report_card', e.target.files[0])} />
                      {requirementFiles.report_card && (
                        <small style={{ color: '#2e7d32' }}>✓ {requirementFiles.report_card.name}</small>
                      )}
                    </div>
                  )}

                </div>

                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#f0f4f8',
                  borderRadius: '8px', fontSize: '0.8rem', color: '#555' }}>
                  📌 Accepted formats: JPG, PNG, PDF &nbsp;|&nbsp; Max size per file: 2MB
                </div>
              </div>

              {/* ── Child's Information ── */}
              <div className="form-section">
                <h3>Child's Information</h3>
                <div className="input-group">
                  <div className="input-grid-3">
                    <input name="lastName" placeholder="Last Name" value={formData.lastName}
                      onChange={handleChange} required />
                    <input name="firstName" placeholder="First Name" value={formData.firstName}
                      onChange={handleChange} required />
                    <input name="middleName" placeholder="Middle Name" value={formData.middleName}
                      onChange={handleChange} />
                  </div>
                  <div className="input-grid-3" style={{ marginTop: '15px' }}>
                    <div className="input-group">
                      <label>Nickname</label>
                      <input name="nickname" placeholder="Nickname" value={formData.nickname}
                        onChange={handleChange} />
                    </div>
                    <div className="input-group">
                      <label>Date of Birth</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth}
                        onChange={handleChange} required />
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

              {/* ── Contact Information ── */}
              <div className="form-section">
                <h3>Official Contact Information</h3>
                <div className="input-group">
                  <label>Parent/Guardian Email Address</label>
                  <input type="email" name="email" placeholder="email@example.com"
                    value={formData.email} onChange={handleChange} required />
                  <small style={{ color: '#8b7500' }}>
                    * This email is where we will send the Student Load Slip.
                  </small>
                </div>
              </div>

              {/* ── Father's Information ── */}
              <div className="form-section">
                <h3>Father's Information</h3>
                <div className="input-group">
                  <div className="input-grid-2">
                    <input name="fatherName" placeholder="Full Name" value={formData.fatherName}
                      onChange={handleChange} required />
                    <input name="fatherContact" placeholder="Contact #" value={formData.fatherContact}
                      onChange={handleChange} required />
                    <input name="fatherOccupation" placeholder="Occupation" value={formData.fatherOccupation}
                      onChange={handleChange} />
                    <input name="fatherEmail" placeholder="Email Address" value={formData.fatherEmail}
                      onChange={handleChange} />
                  </div>
                  <input name="fatherAddress" placeholder="Address" value={formData.fatherAddress}
                    onChange={handleChange} style={{ width: '100%', marginTop: '10px' }} />
                </div>
              </div>

              {/* ── Mother's Information ── */}
              <div className="form-section">
                <h3>Mother's Information</h3>
                <div className="input-group">
                  <div className="input-grid-2">
                    <input name="motherName" placeholder="Full Name" value={formData.motherName}
                      onChange={handleChange} required />
                    <input name="motherContact" placeholder="Contact #" value={formData.motherContact}
                      onChange={handleChange} required />
                    <input name="motherOccupation" placeholder="Occupation" value={formData.motherOccupation}
                      onChange={handleChange} />
                    <input name="motherEmail" placeholder="Email Address" value={formData.motherEmail}
                      onChange={handleChange} />
                  </div>
                  <input name="motherAddress" placeholder="Address" value={formData.motherAddress}
                    onChange={handleChange} style={{ width: '100%', marginTop: '10px' }} />
                </div>
              </div>

              {/* ── Siblings ── */}
              <div className="form-section">
                <h3>List of Enrolled Siblings at SICS</h3>
                <div className="input-group">
                  {formData.siblings.map((sibling, index) => (
                    <div key={index} className="input-grid-2" style={{ marginBottom: '10px' }}>
                      <div className="input-group">
                        <label>Name</label>
                        <input name="name" placeholder="Sibling Full Name" value={sibling.name}
                          onChange={(e) => handleSiblingChange(index, e)} />
                      </div>
                      <div className="input-group">
                        <label>Birth Date</label>
                        <input type="date" name="birthDate" value={sibling.birthDate}
                          onChange={(e) => handleSiblingChange(index, e)} />
                      </div>
                    </div>
                  ))}
                  <button type="button" className="add-sibling-btn" onClick={addSibling}>
                    + Add Another Sibling
                  </button>
                </div>
              </div>

              {/* ── Emergency & Medical ── */}
              <div className="form-section">
                <h3>Emergency & Medical Information</h3>
                <div className="input-group">
                  <label>Emergency Contact Person & Number</label>
                  <input name="emergencyContact" placeholder="e.g. Maria Santos - 09123456789"
                    value={formData.emergencyContact} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label>Medical Conditions / Allergies</label>
                  <textarea name="medicalConditions" placeholder="Please list concerns..."
                    value={formData.medicalConditions} onChange={handleChange} rows="3" />
                </div>
              </div>

              

              {/* ── Payment Section ── */}
              <div className="payment-section">
                <h3 style={{ color: '#b8860b' }}>Initial Downpayment</h3>
                <p style={{ fontSize: '0.8rem', marginBottom: '15px' }}>
                  This payment will be recorded in the student's billing ledger.
                </p>

                <div className="input-group" style={{ marginBottom: '15px' }}>
                  <label>Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                    <option value="">Select Method</option>
                    <option value="Cash">💵 Cash (Walk-in)</option>
                    <option value="GCash">📱 GCash (via PayMongo)</option>
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                  </select>
                </div>

                {paymentMethod === "Cash" && (
                  <>
                    <div style={{ padding: '15px', backgroundColor: '#e3f2fd',
                      border: '1px solid #2196f3', borderRadius: '8px', color: '#0d47a1', marginBottom: '15px' }}>
                      <strong>📌 Notice:</strong> Please proceed to the{' '}
                      <strong>School Registrar Office</strong> to settle your payment. Your enrollment
                      will remain "Pending" until the cash payment is verified.
                    </div>
                    <div className="form-group">
                      <label>Upload Receipt Before Submitting (Optional)</label>
                      <input type="file" accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files[0])} />
                      <small style={{ color: '#666', fontSize: '0.8rem' }}>
                        You may upload a photo of your payment receipt for faster verification.
                      </small>
                    </div>
                  </>
                )}

                {paymentMethod === "GCash" && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ padding: '15px', backgroundColor: '#e8f5e9',
                      border: '2px solid #4caf50', borderRadius: '8px', marginBottom: '15px' }}>
                      <strong style={{ color: '#2e7d32' }}>✅ Secure Payment via PayMongo</strong>
                      <p style={{ fontSize: '0.85rem', color: '#555', margin: '8px 0 0 0' }}>
                        You will be redirected to GCash payment page. After successful payment,
                        your enrollment will be automatically confirmed.
                      </p>
                    </div>
                    <div className="input-group">
                      <label>Downpayment Amount (₱)</label>
                      <input type="number" value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="Enter amount (minimum ₱5000.00)"
                        min="5000.00" step="0.01" required />
                      <small style={{ color: '#666', fontSize: '0.8rem' }}>Minimum: ₱5000.00</small>
                    </div>
                  </div>
                )}

                {paymentMethod === "Bank Transfer" && (
                  <>
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f4f8',
                      borderRadius: '8px', fontSize: '0.9rem' }}>
                      <strong>Bank Account Details:</strong><br />
                      Bank: BPI - 1083497978<br />
                      Account Name: SILOAM
                    </div>
                    <div className="input-grid-2">
                      <div className="input-group">
                        <label>Downpayment Amount (₱)</label>
                        <input type="number" value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" required />
                      </div>
                      <div className="input-group">
                        <label>Reference Number</label>
                        <input type="text" value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)} placeholder="Bank Ref #" required />
                      </div>
                    </div>
                    <div className="input-group" style={{ marginTop: '15px' }}>
                      <label>Upload Receipt Image</label>
                      <input type="file" accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files[0])} required />
                    </div>
                  </>
                )}
              </div>

              <button type="submit" className="enroll-button" disabled={loading || processingPayment}>
                {processingPayment ? "Redirecting to GCash..." : loading ? "Submitting..." :
                  paymentMethod === "GCash" ? "Proceed to GCash Payment" : "Submit Application"}
              </button>

              <div className="form-footer-warning">
                THIS FORM IS THE PROPERTY OF SICS. UNAUTHORIZED REPRODUCTION IS PROHIBITED.
              </div>
            </form>
          </>
        )}
      </div>

      {/* ── Loading Overlay ── */}
      {(loading || processingPayment) && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">
            {processingPayment ? "Preparing GCash Payment..." : "Submitting Application..."}
          </p>
          <p className="loading-subtext">Please wait, do not close this window</p>
        </div>
      )}
    </div>
  );
}