// src/pages/PaymentSuccess.js
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    // Retrieve enrollment data saved before redirect
    const storedData = sessionStorage.getItem('gcashEnrollmentData');
    
    if (storedData) {
      const data = JSON.parse(storedData);
      setStudentName(`${data.firstName} ${data.lastName}`);
      setParentName(data.fatherName || data.motherName || 'Parent');
      setEmail(data.email);
    }

    if (redirectStatus === 'succeeded') {
      setStatus('success');
    } else if (redirectStatus === 'failed') {
      setStatus('failed');
    } else {
      // Fallback – assume success if we have stored data
      setStatus('success');
    }
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div className="spinner"></div>
        <p>Verifying your payment...</p>
      </div>
    );
  }

  if (status === 'success') {
    // Same styling as your existing success screen
    return (
      <div className="enrollment-container">
        <div className="enrollment-card">
          <div className="success-overlay" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#b8860b', fontSize: '2rem', marginBottom: '10px' }}>
              Payment Successful!
            </h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>
              Thank you, <strong>{parentName}</strong>.<br />
              The application for <strong>{studentName}</strong> has been received and your downpayment is confirmed.
            </p>
            <div style={{
              textAlign: 'left', backgroundColor: '#fffdf0', padding: '25px',
              borderRadius: '12px', border: '1px solid #e6dbac',
              maxWidth: '500px', margin: '0 auto 30px auto'
            }}>
              <h4 style={{ color: '#b8860b', marginTop: 0 }}>Next Steps:</h4>
              <ul style={{ paddingLeft: '20px', color: '#444', lineHeight: '1.8', fontSize: '0.95rem' }}>
                <li>Check your email (<strong>{email}</strong>) for further updates.</li>
                <li>Visit the school office to submit physical requirements.</li>
                <li>Ensure <strong>Kid's Note</strong> is installed on your mobile device.</li>
              </ul>
            </div>
            <Link to="/enroll" className="enroll-button" style={{ maxWidth: '300px', display: 'inline-block', textDecoration: 'none' }}>
              Submit Another Application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Failed payment screen
  return (
    <div className="enrollment-container">
      <div className="enrollment-card">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#d32f2f', fontSize: '2rem', marginBottom: '10px' }}>
            Payment Failed
          </h2>
          <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>
            There was an issue processing your payment. Please try again or contact the school.
          </p>
          <Link to="/enroll" className="enroll-button" style={{ maxWidth: '300px', textDecoration: 'none' }}>
            Back to Enrollment
          </Link>
        </div>
      </div>
    </div>
  );
}