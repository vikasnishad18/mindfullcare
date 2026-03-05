import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const fallbackExperts = [
  { name: "Dr. Aisha Sharma" },
  { name: "Dr. Rahul Mehta" },
  { name: "Dr. Neha Kapoor" },
];

function BookingForm({ initialTherapistName = "" }) {
  const [experts, setExperts] = useState(fallbackExperts);
  const [form, setForm] = useState({
    name: "",
    email: "",
    therapistName: initialTherapistName || fallbackExperts[0].name,
    date: "",
    time: "",
    notes: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/experts");
        if (cancelled) return;
        const next = (data.experts || []).map((e) => ({ name: e.name }));
        if (!next.length) return;
        setExperts(next);
        setForm((prev) => {
          const nextName = initialTherapistName && next.some((e) => e.name === initialTherapistName)
            ? initialTherapistName
            : next.some((e) => e.name === prev.therapistName)
              ? prev.therapistName
              : next[0].name;
          return { ...prev, therapistName: nextName };
        });
      } catch (err) {
        // fallback experts already set
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTherapistName]);

  useEffect(() => {
    const raw = localStorage.getItem("mindfullcare_user");
    if (!raw) return;
    try {
      const user = JSON.parse(raw);
      setForm((prev) => ({
        ...prev,
        name: prev.name || user?.name || "",
        email: prev.email || user?.email || "",
      }));
    } catch (err) {
      // ignore
    }
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus({ loading: false, error: "", success: "Session requested." });
      setForm((prev) => ({ ...prev, date: "", time: "", notes: "" }));
    } catch (err) {
      setStatus({ loading: false, error: err.message || "Booking failed.", success: "" });
    }
  };

  return (
    <form className="surface form-card fade-up" onSubmit={handleSubmit}>
      <h2 className="form-title">Request a therapy session</h2>
      <p className="form-subtitle">We’ll save your request. Login to view your booking history.</p>

      <div className="field">
        <div className="label">Your name</div>
        <input
          className="control"
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="field">
        <div className="label">Email</div>
        <input
          className="control"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="field">
        <div className="label">Therapist</div>
        <select
          className="control"
          name="therapistName"
          value={form.therapistName}
          onChange={handleChange}
          required
        >
          {experts.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="label">Date</div>
        <input
          className="control"
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="field">
        <div className="label">Time</div>
        <input
          className="control"
          type="time"
          name="time"
          value={form.time}
          onChange={handleChange}
          required
        />
      </div>

      <div className="field">
        <div className="label">Notes (optional)</div>
        <textarea
          className="control"
          name="notes"
          placeholder="Anything you’d like your therapist to know"
          value={form.notes}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button className="btn btn--primary" disabled={status.loading}>
          {status.loading ? "Submitting..." : "Request session"}
        </button>
        <span className="chip">Takes ~10 seconds</span>
      </div>

      {status.error && <div className="notice notice--error">{status.error}</div>}
      {status.success && <div className="notice notice--success">{status.success}</div>}
    </form>
  );
}

export default BookingForm;
