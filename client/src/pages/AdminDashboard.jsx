import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../lib/api";
import { getSessionUser, isAdminUser } from "../lib/session";

const emptyForm = { name: "", specialization: "", experience: 0, image: "" };
const bookingStatuses = ["requested", "confirmed", "rescheduled", "completed", "cancelled"];

function formatBookingLine(booking) {
  const date = booking?.session_date || "";
  const time = String(booking?.session_time || "").slice(0, 5);
  return `${date}${time ? ` • ${time}` : ""}`;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => getSessionUser(), []);
  const [experts, setExperts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", success: "" });
  const [bookingEdit, setBookingEdit] = useState({
    id: null,
    therapistName: "",
    date: "",
    time: "",
    status: "requested",
    saving: false,
    error: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/admin/login");
      return;
    }
    if (!isAdminUser(user)) {
      navigate("/dashboard");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [expertData, bookingData] = await Promise.all([apiFetch("/experts"), apiFetch("/bookings")]);
        if (cancelled) return;
        setExperts(expertData.experts || []);
        setBookings(bookingData.bookings || []);
        setStatus((s) => ({ ...s, loading: false, error: "" }));
      } catch (err) {
        if (cancelled) return;
        setStatus((s) => ({ ...s, loading: false, error: err.message || "Failed to load experts." }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

  const reload = async () => {
    const [expertData, bookingData] = await Promise.all([apiFetch("/experts"), apiFetch("/bookings")]);
    setExperts(expertData.experts || []);
    setBookings(bookingData.bookings || []);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "experience" ? Number(value || 0) : value }));
  };

  const startEdit = (expert) => {
    setEditingId(expert.id);
    setForm({
      name: expert.name || "",
      specialization: expert.specialization || "",
      experience: Number(expert.experience || 0),
      image: expert.image || "",
    });
    setStatus((s) => ({ ...s, error: "", success: "" }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStatus((s) => ({ ...s, error: "", success: "" }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus((s) => ({ ...s, saving: true, error: "", success: "" }));
    try {
      const payload = {
        name: form.name,
        specialization: form.specialization,
        experience: Number(form.experience || 0),
        image: form.image || null,
      };

      if (editingId) {
        await apiFetch(`/experts/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setStatus((s) => ({ ...s, saving: false, success: "Expert updated." }));
      } else {
        await apiFetch("/experts", { method: "POST", body: JSON.stringify(payload) });
        setStatus((s) => ({ ...s, saving: false, success: "Expert added." }));
      }

      await reload();
      cancelEdit();
    } catch (err) {
      setStatus((s) => ({ ...s, saving: false, error: err.message || "Save failed." }));
    }
  };

  const onDelete = async (expert) => {
    if (!window.confirm(`Delete ${expert.name}?`)) return;
    setStatus((s) => ({ ...s, error: "", success: "" }));
    try {
      await apiFetch(`/experts/${expert.id}`, { method: "DELETE" });
      await reload();
      if (editingId === expert.id) cancelEdit();
      setStatus((s) => ({ ...s, success: "Expert deleted." }));
    } catch (err) {
      setStatus((s) => ({ ...s, error: err.message || "Delete failed." }));
    }
  };

  const startBookingEdit = (booking) => {
    setBookingEdit({
      id: booking.id,
      therapistName: booking.therapist_name || "",
      date: booking.session_date || "",
      time: String(booking.session_time || "").slice(0, 5),
      status: String(booking.status || "requested").toLowerCase(),
      saving: false,
      error: "",
    });
    setStatus((s) => ({ ...s, error: "", success: "" }));
  };

  const closeBookingEdit = () => {
    setBookingEdit({
      id: null,
      therapistName: "",
      date: "",
      time: "",
      status: "requested",
      saving: false,
      error: "",
    });
  };

  const saveBookingEdit = async (e) => {
    e.preventDefault();
    if (!bookingEdit.id) return;
    setBookingEdit((b) => ({ ...b, saving: true, error: "" }));
    try {
      await apiFetch(`/bookings/${bookingEdit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          therapistName: bookingEdit.therapistName,
          date: bookingEdit.date,
          time: bookingEdit.time,
          status: bookingEdit.status,
        }),
      });
      setStatus((s) => ({ ...s, success: "Booking updated." }));
      closeBookingEdit();
      await reload();
    } catch (err) {
      setBookingEdit((b) => ({ ...b, saving: false, error: err.message || "Update failed." }));
    }
  };

  return (
    <div className="page">
      <Navbar />

      <main className="main">
        <header className="page-head">
          <div className="container">
            <h1 className="page-head__title">Admin dashboard</h1>
            <p className="page-head__subtitle">Add and manage experts shown in the app.</p>
          </div>
        </header>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container" style={{ display: "grid", gap: 16 }}>
            <form className="surface form-card fade-up" onSubmit={onSubmit}>
              <h2 className="form-title">{editingId ? "Edit expert" : "Add expert"}</h2>
              <p className="form-subtitle">These experts appear on the Therapists page and booking form.</p>

              <div className="field">
                <div className="label">Name</div>
                <input className="control" name="name" value={form.name} onChange={onChange} required />
              </div>

              <div className="field">
                <div className="label">Specialization</div>
                <input
                  className="control"
                  name="specialization"
                  value={form.specialization}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="field">
                <div className="label">Experience (years)</div>
                <input
                  className="control"
                  type="number"
                  min="0"
                  name="experience"
                  value={form.experience}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="field">
                <div className="label">Image URL (optional)</div>
                <input className="control" name="image" value={form.image} onChange={onChange} />
              </div>

              <div className="form-actions">
                <button className="btn btn--primary" disabled={status.saving}>
                  {status.saving ? "Saving..." : editingId ? "Save changes" : "Add expert"}
                </button>
                {editingId ? (
                  <button className="btn btn--ghost" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                ) : null}
              </div>

              {status.error && <div className="notice notice--error">{status.error}</div>}
              {status.success && <div className="notice notice--success">{status.success}</div>}
            </form>

            <div className="surface fade-up" style={{ padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Experts</h3>
              {status.loading ? (
                <p>Loading...</p>
              ) : experts.length === 0 ? (
                <p>No experts yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {experts.map((expert) => (
                    <div
                      key={expert.id}
                      className="surface"
                      style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12 }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{expert.name}</div>
                        <div style={{ opacity: 0.85 }}>
                          {expert.specialization} • {expert.experience}+ yrs
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button className="btn btn--ghost" type="button" onClick={() => startEdit(expert)}>
                          Edit
                        </button>
                        <button className="btn btn--ghost" type="button" onClick={() => onDelete(expert)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface fade-up" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ marginTop: 0 }}>Bookings</h3>
                <button className="btn btn--ghost" type="button" onClick={reload} disabled={status.loading}>
                  Refresh
                </button>
              </div>

              {status.loading ? (
                <p>Loading...</p>
              ) : bookings.length === 0 ? (
                <p>No bookings yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="surface"
                      style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {b.therapist_name} <span style={{ opacity: 0.6, fontWeight: 500 }}>• #{b.id}</span>
                        </div>
                        <div style={{ opacity: 0.85 }}>{formatBookingLine(b)}</div>
                        <div style={{ opacity: 0.75, fontSize: 13 }}>
                          {b.name} • {b.email}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="chip">{b.status || "requested"}</span>
                        <button className="btn btn--ghost" type="button" onClick={() => startBookingEdit(b)}>
                          Manage
                        </button>
                      </div>

                      {bookingEdit.id === b.id ? (
                        <form
                          onSubmit={saveBookingEdit}
                          style={{ width: "100%", marginTop: 10, display: "grid", gap: 10 }}
                        >
                          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
                            <div className="field" style={{ margin: 0 }}>
                              <div className="label">Therapist</div>
                              <input
                                className="control"
                                value={bookingEdit.therapistName}
                                onChange={(e) =>
                                  setBookingEdit((prev) => ({ ...prev, therapistName: e.target.value }))
                                }
                                required
                              />
                            </div>

                            <div className="field" style={{ margin: 0 }}>
                              <div className="label">Date</div>
                              <input
                                className="control"
                                type="date"
                                value={bookingEdit.date}
                                onChange={(e) => setBookingEdit((prev) => ({ ...prev, date: e.target.value }))}
                                required
                              />
                            </div>

                            <div className="field" style={{ margin: 0 }}>
                              <div className="label">Time</div>
                              <input
                                className="control"
                                type="time"
                                value={bookingEdit.time}
                                onChange={(e) => setBookingEdit((prev) => ({ ...prev, time: e.target.value }))}
                                required
                              />
                            </div>

                            <div className="field" style={{ margin: 0 }}>
                              <div className="label">Status</div>
                              <select
                                className="control"
                                value={bookingEdit.status}
                                onChange={(e) => setBookingEdit((prev) => ({ ...prev, status: e.target.value }))}
                                required
                              >
                                {bookingStatuses.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {bookingEdit.error ? <div className="notice notice--error">{bookingEdit.error}</div> : null}

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button className="btn btn--primary" disabled={bookingEdit.saving}>
                              {bookingEdit.saving ? "Saving..." : "Save"}
                            </button>
                            <button className="btn btn--ghost" type="button" onClick={closeBookingEdit}>
                              Close
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;
