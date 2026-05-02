import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import "./ActivityLogs.css";

// Helper: return a human‑readable explanation for a log entry
const getLogExplanation = (log) => {
  const desc = log.description;
  const props = log.properties || {};

  // Map known description values to friendly messages
  const explanations = {
    'paymongo_connection_error': '❌ PayMongo connection error – the payment gateway could not be reached. Check network or API endpoint.',
    'paymongo_api_error': '❌ PayMongo API error – the payment service returned an error response.',
    'paymongo_unexpected_error': '⚠️ Unexpected payment error – something went wrong while processing the payment.',
    'enrollment_submission_failed': '❌ Enrollment submission failed – the backend could not save the enrollment.',
    'enrollment_approved': '✅ Enrollment approved – student was admitted and assigned to a section.',
    'enrollment_rejected': '❌ Enrollment rejected – application was denied.',
    'requirement_updated': '📎 Requirement updated – changed the status of a submitted document.',
    'view_enrollment_profile': '👁️ Profile viewed – an admin/registrar viewed the student enrollment details.',
    'api_error': '⚠️ API error – a frontend request failed. See properties for details.',
    'api_request': '📡 API request – an authenticated API call was made.',
    'enrollment_approved_with_section': '✅ Enrollment approved and section assigned.',
  };

  let base = explanations[desc] || `Action: ${desc}`;

  // Add specific error details from properties when available
  if (desc === 'paymongo_connection_error' && props.error) {
    base += `\nReason: ${props.error}`;
  } else if (desc === 'paymongo_api_error' && props.response) {
    base += `\nResponse: ${props.response.substring(0, 200)}`; // truncate long responses
  } else if (desc === 'enrollment_submission_failed' && props.error) {
    base += `\nError: ${props.error} (line ${props.line})`;
  } else if (desc === 'api_error' && props.message) {
    base += `\nMessage: ${props.message}`;
  } else if (desc === 'enrollment_rejected' && props.student_name) {
    base += ` – Student: ${props.student_name}`;
  } else if (desc === 'enrollment_approved' && props.student_name) {
    base += ` – Student: ${props.student_name} → Section: ${props.assigned_section || 'N/A'}`;
  } else if (desc === 'requirement_updated' && props.field) {
    base += ` – ${props.field} set to ${props.new_value}`;
  }

  return base;
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', user_id: '', from_date: '', to_date: '' });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  // Safe user parse
  let user = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw && raw !== 'undefined' && raw !== 'null') {
      user = JSON.parse(raw);
    }
  } catch {
    user = null;
  }

  // Fetch logs with cancellation support
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, ...filters };
      const res = await API.get('/admin/activity-logs', { params });
      setLogs(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      });
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = { page: 1, ...filters };
        const res = await API.get('/admin/activity-logs', { params });
        if (!cancelled) {
          setLogs(res.data.data);
          setPagination({
            current_page: res.data.current_page,
            last_page: res.data.last_page,
            total: res.data.total,
          });
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch logs', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchLogs]); // fetchLogs changes when filters change

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => fetchLogs(1);
  const clearFilters = () => {
    setFilters({ action: '', user_id: '', from_date: '', to_date: '' });
    fetchLogs(1);
  };

  return (
  
        <div className="activity-logs-container">
          <div className="activity-logs-header">
            <h2>Activity Logs</h2>
          </div>

          <div className="filters-bar">
            <div className="filter-group">
              <label>Action</label>
              <input
                type="text"
                name="action"
                placeholder="e.g., approved"
                value={filters.action}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label>User ID</label>
              <input
                type="text"
                name="user_id"
                placeholder="User ID"
                value={filters.user_id}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                name="from_date"
                value={filters.from_date}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                name="to_date"
                value={filters.to_date}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-actions">
              <button className="btn-filter" onClick={applyFilters}>Filter</button>
              <button className="btn-clear" onClick={clearFilters}>Clear</button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading logs...</div>
          ) : (
            <>
              <div className="logs-table-wrapper">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th style={{ minWidth: '250px' }}>Explanation</th>
                      <th>Properties (raw)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                          No logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id}>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>{log.causer?.name || 'System'}</td>
                          <td>{log.description}</td>
                          <td>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                              {getLogExplanation(log)}
                            </div>
                          </td>
                          <td>
                            <pre style={{ margin: 0, fontSize: '0.7rem', maxWidth: '300px', overflowX: 'auto' }}>
                              {JSON.stringify(log.properties, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button
                  disabled={pagination.current_page === 1}
                  onClick={() => fetchLogs(pagination.current_page - 1)}
                >
                  Previous
                </button>
                <span>Page {pagination.current_page} of {pagination.last_page}</span>
                <button
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => fetchLogs(pagination.current_page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
     
  );
}