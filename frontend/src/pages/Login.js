import { useState } from "react";
import API from "../api/api";
import "./Login.css";
import { useNavigate } from "react-router-dom"; 

export default function Login() {
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');  

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/login", {
        email,
        password
      });

      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      API.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

     if (user.role === "parent") {
      navigate('/parent-dashboard');
    } else if (user.role === "teacher") {
      navigate('/teacher-advisory');
    } else {
      navigate('/dashboard');   // admin / registrar
    }
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message;

        switch (status) {
          case 423:
            setError(message || "Account locked. Please try again later.");
            break;
          case 429:
            setError("Too many attempts. Please slow down.");
            break;
          default:
            setError(message || "Login failed");
        }
      } else if (err.request) {
        setError("Network error: Could not reach server");
      } else {
        setError("Login failed");
      }
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
        {!showForgot ? (
          <button type="button" onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: '#b8860b', cursor: 'pointer', textDecoration: 'underline' }}>
            Forgot Password?
          </button>
        ) : step === 'email' ? (
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            />
            <button type="button" onClick={async () => {
              try {
                await API.post('/forgot-password', { email: forgotEmail });
                setStep('otp');
                setForgotMsg('An OTP has been sent to your email.');
              } catch (err) {
                setForgotMsg('An error occurred. Please try again.');
              }
            }} style={{ background: '#b8860b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' }}>
              Send OTP
            </button>
            {forgotMsg && <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{forgotMsg}</p>}
          </div>
        ) : step === 'otp' ? (
          <div>
            <input
              type="text"
              placeholder="Enter 6‑digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              style={{ width: '100%', padding: '8px', margin: '5px 0' }}
            />
            <button type="button" onClick={async () => {
              try {
                await API.post('/verify-otp', { email: forgotEmail, otp });
                setStep('email');
                setShowForgot(false);
                setForgotMsg('');
                setOtp('');
                alert('A password reset link has been sent to your email.');
              } catch (err) {
                setForgotMsg(err.response?.data?.message || 'Invalid OTP. Please try again.');
              }
            }} style={{ background: '#b8860b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' }}>
              Verify OTP
            </button>
            {forgotMsg && <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{forgotMsg}</p>}
          </div>
        ) : null}
      </div>
        </form>
      </div>
    </div>
  );
}