import { useState, useEffect } from "react";
import API from "../api/api";
import { useCurrentSchoolYear } from "../hooks/useCurrentSchoolYear";

export default function AdminSchoolYear() {
  const { schoolYear: currentYear, loading: yearLoading } = useCurrentSchoolYear();
  const [selectedYear, setSelectedYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentRealYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => {
    const start = currentRealYear - 5 + i;
    return `${start}-${start + 1}`;
  });

  useEffect(() => {
    if (currentYear && !selectedYear) setSelectedYear(currentYear);
  }, [currentYear, selectedYear]);

    const handleSave = async () => {
    setSaving(true);
    try {
      await API.post("/admin/school-year", { school_year: selectedYear });

      // remove cached data that depends on the old school year
      [
        "teacher_directory_data",
        "teacher_directory_data_time",
        "dashboard_summary",
        "dashboard_summary_time",
        "dashboard_teachers",
        "dashboard_teachers_time",
      ].forEach(key => localStorage.removeItem(key));

      window.location.reload(); // restart the app with fresh data
    } catch (err) {
      setMessage("❌ Failed to update school year.");
      setSaving(false);
    }
  };

  if (yearLoading) return <div>Loading...</div>;

  return (
    <div className="content-scroll-area" style={{ padding: "24px" }}>
      <h2 style={{ color: "#b8860b" }}>Change School Year</h2>
      <div style={{ maxWidth: 400, marginTop: 20 }}>
        <label>Current Active Year:</label>
        <p style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{currentYear}</p>
        <label style={{ marginTop: 20 }}>Select New School Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 8 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={handleSave} disabled={saving || selectedYear === currentYear}
          style={{
            marginTop: 16, padding: "10px 24px", backgroundColor: "#b8860b",
            color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
            opacity: selectedYear === currentYear ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Set as Active"}
        </button>
        {message && <p style={{ marginTop: 12 }}>{message}</p>}
      </div>
    </div>
  );
}