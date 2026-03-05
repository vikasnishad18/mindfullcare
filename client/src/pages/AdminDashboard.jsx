import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../lib/api";
import { getSessionUser, isAdminUser } from "../lib/session";

const emptyForm = { name: "", specialization: "", experience: 0, image: "" };

function AdminDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => getSessionUser(), []);
  const [experts, setExperts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", success: "" });

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
        const data = await apiFetch("/experts");
        if (cancelled) return;
        setExperts(data.experts || []);
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
    const data = await apiFetch("/experts");
    setExperts(data.experts || []);
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
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;
