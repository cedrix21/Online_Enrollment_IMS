// src/pages/TuitionFeeManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import './TuitionFeeManagement.css';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';

const GRADE_LEVELS = [
  'Nursery', 'Kindergarten 1', 'Kindergarten 2',
  'Grade 1', 'Grade 2', 'Grade 3',
  'Grade 4', 'Grade 5', 'Grade 6',
];

const fmt = (n) => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });

const emptyForm = {
  grade_level:   '',
  school_year:   '',
  tuition_fee:   '',
  korean_fee:    0,
  down_payment:  5000,
  monthly_terms: 10,
  is_active:     true,
  misc_items:    [],
};

export default function TuitionFeeManagement() {
  const [fees,       setFees]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [modal,      setModal]      = useState(null);   // null | 'create' | 'edit'
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);

  // ── fetch ────────────────────────────────────────────────
  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/tuition-fees', { params: { school_year: schoolYear } });
      setFees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolYear]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  // ── form helpers ─────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...emptyForm, school_year: schoolYear, misc_items: [] });
    setSelected(null);
    setModal('create');
  };

  const openEdit = (fee) => {
    setForm({
      grade_level:   fee.grade_level,
      school_year:   fee.school_year,
      tuition_fee:   fee.tuition_fee,
      korean_fee:    fee.korean_fee,
      down_payment:  fee.down_payment,
      monthly_terms: fee.monthly_terms,
      is_active:     fee.is_active,
      misc_items:    fee.misc_items.map(m => ({ ...m })),
    });
    setSelected(fee);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setSelected(null); };
  const setField   = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const addMiscItem    = () =>
    setForm(p => ({ ...p, misc_items: [...p.misc_items, { label: '', amount: '' }] }));

  const updateMiscItem = (i, key, val) =>
    setForm(p => {
      const items = [...p.misc_items];
      items[i] = { ...items[i], [key]: val };
      return { ...p, misc_items: items };
    });

  const removeMiscItem = (i) =>
    setForm(p => ({ ...p, misc_items: p.misc_items.filter((_, idx) => idx !== i) }));

  // computed preview
  const miscTotal = form.misc_items.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const totalFee  = (parseFloat(form.tuition_fee) || 0) + miscTotal + (parseFloat(form.korean_fee) || 0);
  const remaining = totalFee - (parseFloat(form.down_payment) || 0);
  const monthly   = form.monthly_terms > 0 ? Math.round(remaining / form.monthly_terms) : 0;

  // ── submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tuition_fee:   parseFloat(form.tuition_fee),
        korean_fee:    parseFloat(form.korean_fee) || 0,
        down_payment:  parseFloat(form.down_payment),
        monthly_terms: parseInt(form.monthly_terms),
        misc_items:    form.misc_items.map((m, i) => ({
          ...m,
          amount:     parseFloat(m.amount),
          sort_order: i,
        })),
      };
      if (modal === 'create') {
        await API.post('/tuition-fees', payload);
      } else {
        await API.put(`/tuition-fees/${selected.id}`, payload);
      }
      closeModal();
      fetchFees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // ── delete ───────────────────────────────────────────────
  const handleDelete = async (fee) => {
    if (!window.confirm(`Delete ${fee.grade_level} (${fee.school_year})?`)) return;
    try {
      await API.delete(`/tuition-fees/${fee.id}`);
      fetchFees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  // ── toggle active ────────────────────────────────────────
  const toggleActive = async (fee) => {
    try {
      await API.put(`/tuition-fees/${fee.id}`, { is_active: !fee.is_active });
      fetchFees();
    } catch {
      alert('Failed to update status.');
    }
  };

  // ── render ───────────────────────────────────────────────
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />
        <div className="content-scroll-area">
          <div className="tfm-page">

      {/* Header */}
      <div className="tfm-header">
        <div>
          <h1 className="tfm-title">Tuition Fee Management</h1>
          <p className="tfm-subtitle">Manage tuition and miscellaneous fees per grade level</p>
        </div>
        <div className="tfm-header-actions">
          <select
            className="tfm-sy-select"
            value={schoolYear}
            onChange={e => setSchoolYear(e.target.value)}
          >
            {['2024-2025','2025-2026','2026-2027','2027-2028'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="tfm-add-btn" onClick={openCreate}>+ Add Fee</button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="tfm-loading">Loading fees...</div>
      ) : fees.length === 0 ? (
        <div className="tfm-empty">
          No fees found for SY {schoolYear}.{' '}
          <span className="tfm-empty-link" onClick={openCreate}>Add one now →</span>
        </div>
      ) : (
        <div className="tfm-grid">
          {fees.map(fee => (
            <div key={fee.id} className={`tfm-card ${!fee.is_active ? 'tfm-card--inactive' : ''}`}>

              {/* Card header */}
              <div className="tfm-card-header">
                <div>
                  <div className="tfm-grade-label">{fee.grade_level}</div>
                  <div className="tfm-sy-badge">SY {fee.school_year}</div>
                </div>
                <div className="tfm-card-actions">
                  <button
                    onClick={() => toggleActive(fee)}
                    className={`tfm-status-badge ${fee.is_active ? 'tfm-status-badge--active' : 'tfm-status-badge--inactive'}`}
                  >
                    {fee.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => openEdit(fee)} className="tfm-icon-btn">✏️</button>
                  <button onClick={() => handleDelete(fee)} className="tfm-icon-btn tfm-icon-btn--danger">🗑️</button>
                </div>
              </div>

              {/* Totals */}
              <div className="tfm-totals-row">
                <div className="tfm-total-box">
                  <div className="tfm-total-label">Total Fee</div>
                  <div className="tfm-total-val">{fmt(fee.total_fee)}</div>
                </div>
                <div className="tfm-total-box">
                  <div className="tfm-total-label">Down Payment</div>
                  <div className="tfm-total-val">{fmt(fee.down_payment)}</div>
                </div>
                <div className="tfm-total-box tfm-total-box--highlight">
                  <div className="tfm-total-label tfm-total-label--light">Monthly</div>
                  <div className="tfm-total-val tfm-total-val--light">{fmt(fee.monthly_payment)}</div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="tfm-breakdown">
                <div className="tfm-breakdown-row">
                  <span>Tuition Fee</span><span>{fmt(fee.tuition_fee)}</span>
                </div>
                {fee.korean_fee > 0 && (
                  <div className="tfm-breakdown-row">
                    <span>Korean Language Fee</span><span>{fmt(fee.korean_fee)}</span>
                  </div>
                )}
                <div className="tfm-breakdown-row">
                  <span>Miscellaneous Fee</span><span>{fmt(fee.misc_total)}</span>
                </div>
              </div>

              {/* Misc toggle */}
              <button
                className="tfm-misc-toggle"
                onClick={() => setExpandedId(expandedId === fee.id ? null : fee.id)}
              >
                {expandedId === fee.id ? '▲ Hide' : '▼ View'} Misc Breakdown ({fee.misc_items.length} items)
              </button>

              {expandedId === fee.id && (
                <div className="tfm-misc-list">
                  {fee.misc_items.map((m, i) => (
                    <div key={i} className="tfm-misc-item">
                      <span>{m.label}</span>
                      <span>{fmt(m.amount)}</span>
                    </div>
                  ))}
                  <div className="tfm-misc-item tfm-misc-item--total">
                    <span>Total Misc</span>
                    <span>{fmt(fee.misc_total)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ Modal ══ */}
      {modal && (
        <div className="tfm-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="tfm-modal">

            <div className="tfm-modal-header">
              <h2 className="tfm-modal-title">
                {modal === 'create' ? 'Add New Fee' : `Edit — ${selected?.grade_level}`}
              </h2>
              <button className="tfm-close-btn" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="tfm-modal-body">

              {/* Grade level & school year */}
              <div className="tfm-form-row">
                <div className="tfm-form-group">
                  <label className="tfm-label">Grade Level</label>
                  <select
                    className="tfm-input"
                    value={form.grade_level}
                    onChange={e => setField('grade_level', e.target.value)}
                    required
                    disabled={modal === 'edit'}
                  >
                    <option value=''>Select grade</option>
                    {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="tfm-form-group">
                  <label className="tfm-label">School Year</label>
                  <input
                    className="tfm-input"
                    value={form.school_year}
                    onChange={e => setField('school_year', e.target.value)}
                    placeholder='e.g. 2026-2027'
                    required
                    disabled={modal === 'edit'}
                  />
                </div>
              </div>

              {/* Tuition + Korean */}
              <div className="tfm-form-row">
                <div className="tfm-form-group">
                  <label className="tfm-label">Tuition Fee (₱)</label>
                  <input
                    type='number' step='0.01' min='0'
                    className="tfm-input"
                    value={form.tuition_fee}
                    onChange={e => setField('tuition_fee', e.target.value)}
                    required
                  />
                </div>
                <div className="tfm-form-group">
                  <label className="tfm-label">Korean Language Fee (₱)</label>
                  <input
                    type='number' step='0.01' min='0'
                    className="tfm-input"
                    value={form.korean_fee}
                    onChange={e => setField('korean_fee', e.target.value)}
                  />
                </div>
              </div>

              {/* Down payment + monthly terms */}
              <div className="tfm-form-row">
                <div className="tfm-form-group">
                  <label className="tfm-label">Down Payment (₱)</label>
                  <input
                    type='number' step='0.01' min='0'
                    className="tfm-input"
                    value={form.down_payment}
                    onChange={e => setField('down_payment', e.target.value)}
                    required
                  />
                </div>
                <div className="tfm-form-group">
                  <label className="tfm-label">Monthly Terms (months)</label>
                  <input
                    type='number' min='1'
                    className="tfm-input"
                    value={form.monthly_terms}
                    onChange={e => setField('monthly_terms', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Active */}
              <div className="tfm-checkbox-row">
                <input
                  type='checkbox'
                  id='is_active'
                  checked={form.is_active}
                  onChange={e => setField('is_active', e.target.checked)}
                />
                <label htmlFor='is_active'>Active (visible on enrollment form)</label>
              </div>

              {/* Live preview */}
              <div className="tfm-preview">
                <div className="tfm-preview-row">
                  <span>Misc Total</span><span>{fmt(miscTotal)}</span>
                </div>
                <div className="tfm-preview-row tfm-preview-row--total">
                  <span>Total Fee</span><span>{fmt(totalFee)}</span>
                </div>
                <div className="tfm-preview-row">
                  <span>Remaining Balance</span><span>{fmt(remaining)}</span>
                </div>
                <div className="tfm-preview-row tfm-preview-row--bold">
                  <span>Monthly Payment</span><span>{fmt(monthly)}</span>
                </div>
              </div>

              {/* Misc items */}
              <div className="tfm-misc-section">
                <div className="tfm-misc-section-header">
                  <h3 className="tfm-misc-section-title">Miscellaneous Fee Items</h3>
                  <button type='button' className="tfm-add-misc-btn" onClick={addMiscItem}>
                    + Add Item
                  </button>
                </div>

                {form.misc_items.length === 0 ? (
                  <p className="tfm-misc-empty">No misc items yet. Click "+ Add Item" to add.</p>
                ) : (
                  <div className="tfm-misc-items-list">
                    {form.misc_items.map((item, i) => (
                      <div key={i} className="tfm-misc-input-row">
                        <input
                          className="tfm-input"
                          style={{ flex: 2 }}
                          placeholder='Fee label (e.g. Library Fee)'
                          value={item.label}
                          onChange={e => updateMiscItem(i, 'label', e.target.value)}
                          required
                        />
                        <input
                          type='number' step='0.01' min='0'
                          className="tfm-input"
                          style={{ flex: 1 }}
                          placeholder='Amount'
                          value={item.amount}
                          onChange={e => updateMiscItem(i, 'amount', e.target.value)}
                          required
                        />
                        <button
                          type='button'
                          className="tfm-remove-btn"
                          onClick={() => removeMiscItem(i)}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="tfm-modal-actions">
                <button type='button' className="tfm-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type='submit' className="tfm-save-btn" disabled={saving}>
                  {saving ? 'Saving...' : modal === 'create' ? 'Create Fee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </div> {/* end tfm-page */}
        </div> {/* end content-scroll-area */}
      </div> {/* end main-content */}
    </div>  /* end dashboard-layout */
  );
}