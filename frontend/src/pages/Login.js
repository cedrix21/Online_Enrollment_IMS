import { useState } from "react";
import API from "../api/api";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Send login request
      const response = await API.post("/login", {
        email,
        password
      });

      // Save token and user to localStorage
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      // Set Authorization header for all future requests
      API.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      console.log("Login successful:", response.data);

      // Redirect based on user role
      if (user.role === "teacher") {
        window.location.href = "/teacher-advisory";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      // Handle network errors vs API errors
      if (err.response) {
        // Server responded with a status outside 2xx
        setError(err.response.data?.message || "Login failed");
      } else if (err.request) {
        // No response received (CORS, network error)
        setError("Network error: Could not reach server");
      } else {
        // Other errors
        setError("Login failed");
      }

      console.error("Login error:", err);
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
            />
          </div>
          <div className="input-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
