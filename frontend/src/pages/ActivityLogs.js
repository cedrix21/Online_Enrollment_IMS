import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import './ActivityLogs.css'; // optional

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', user_id: '', from_date: '', to_date: '' });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

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
      <SideBar user={JSON.parse(localStorage.getItem('user'))} />
      <div className="main-content">
        <TopBar user={JSON.parse(localStorage.getItem('user'))} />
        <div className="content-scroll-area" style={{ padding: '20px' }}>
          <h2>Activity Logs</h2>
          
          {/* Filters */}
          <div className="filters-bar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <input type="text" name="action" placeholder="Action (e.g., approved)" value={filters.action} onChange={handleFilterChange} />
            <input type="text" name="user_id" placeholder="User ID" value={filters.user_id} onChange={handleFilterChange} />
            <input type="date" name="from_date" placeholder="From" value={filters.from_date} onChange={handleFilterChange} />
            <input type="date" name="to_date" placeholder="To" value={filters.to_date} onChange={handleFilterChange} />
            <button onClick={applyFilters}>Filter</button>
            <button onClick={clearFilters}>Clear</button>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div>Loading logs...</div>
          ) : (
            <>
              <table className="logs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f4f4f4' }}>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Properties</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.causer?.name || 'System'}</td>
                      <td>{log.description}</td>
                      <td><pre style={{ margin: 0, fontSize: '12px' }}>{JSON.stringify(log.properties, null, 2)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button disabled={pagination.current_page === 1} onClick={() => fetchLogs(pagination.current_page - 1)}>Previous</button>
                <span>Page {pagination.current_page} of {pagination.last_page}</span>
                <button disabled={pagination.current_page === pagination.last_page} onClick={() => fetchLogs(pagination.current_page + 1)}>Next</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}