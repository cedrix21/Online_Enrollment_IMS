import { useEffect, useState } from "react";
import API from "../../api/api";
import "./LockedUsers.css";

export default function LockedUsers() {
  const [lockedUsers, setLockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLockedUsers();
  }, []);

  const fetchLockedUsers = async () => {
    try {
      const response = await API.get("/admin/locked-users");
      setLockedUsers(response.data.locked_users);
    } catch (err) {
      setError("Failed to load locked users");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (userId) => {
    try {
      const response = await API.post(`/admin/unlock-user/${userId}`);
      setMessage(response.data.message);
      setLockedUsers(lockedUsers.filter(user => user.id !== userId));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError("Failed to unlock user");
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="locked-users-container">
      <h2>Locked Accounts Management</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading locked users...</div>
      ) : lockedUsers.length === 0 ? (
        <p>No locked accounts at this time.</p>
      ) : (
        <table className="locked-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Locked Until</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lockedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.locked_until).toLocaleString()}</td>
                <td>
                  <button className="unlock-btn" onClick={() => handleUnlock(user.id)}>
                    Unlock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}