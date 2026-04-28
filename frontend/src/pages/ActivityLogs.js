import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import "./ActivityLogs.css";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', user_id: '', from_date: '', to_date: '' });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const user = JSON.parse(localStorage.getItem('user'));

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
    fetchLogs(1);
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => fetchLogs(1);

  const clearFilters = () => {
    setFilters({ action: '', user_id: '', from_date: '', to_date: '' });
    fetchLogs(1);
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />
        <div className="activity-logs-container">
          <div className="activity-logs-header">
            <h2>Activity Logs</h2>
          </div>

          {/* Filters Bar with proper structure */}
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

          {/* Logs Table */}
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
                      <th>Properties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
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
                            <pre>{JSON.stringify(log.properties, null, 2)}</pre>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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
      </div>
    </div>
  );
}