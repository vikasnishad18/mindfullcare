import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../lib/api";
import { getSessionUser } from "../lib/session";

function formatBooking(booking) {
  const date = booking?.session_date || "";
  const time = String(booking?.session_time || "").slice(0, 5);
  return { date, time };
}

function Dashboard() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const [state, setState] = useState({ loading: true, error: "", bookings: [] });
  const [reschedule, setReschedule] = useState({
    id: null,
    date: "",
    time: "",
    loading: false,
    error: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiFetch("/bookings/mine");
        if (cancelled) return;
        setState({ loading: false, error: "", bookings: data.bookings || [] });
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 401) {
          localStorage.removeItem("mindfullcare_token");
          localStorage.removeItem("mindfullcare_user");
          navigate("/login");
          return;
        }
        setState({ loading: false, error: err.message || "Failed to load bookings.", bookings: [] });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

  const refresh = async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await apiFetch("/bookings/mine");
      setState({ loading: false, error: "", bookings: data.bookings || [] });
    } catch (err) {
      if (err?.status === 401) {
        localStorage.removeItem("mindfullcare_token");
        localStorage.removeItem("mindfullcare_user");
        navigate("/login");
        return;
      }
      setState({ loading: false, error: err.message || "Failed to load bookings.", bookings: [] });
    }
  };

  const startReschedule = (booking) => {
    const { date, time } = formatBooking(booking);
    setReschedule({ id: booking.id, date, time, loading: false, error: "" });
  };

  const closeReschedule = () => {
    setReschedule({ id: null, date: "", time: "", loading: false, error: "" });
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!reschedule.id) return;
    setReschedule((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await apiFetch(`/bookings/${reschedule.id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ date: reschedule.date, time: reschedule.time }),
      });
      closeReschedule();
      await refresh();
    } catch (err) {
      setReschedule((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Reschedule failed.",
      }));
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await apiFetch(`/bookings/${bookingId}/cancel`, { method: "PATCH" });
      if (reschedule.id === bookingId) closeReschedule();
      await refresh();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message || "Cancel failed." }));
    }
  };

  return (
    <div className="page">
      <Navbar />

      <main className="main">
        <header className="page-head">
          <div className="container">
            <h1 className="page-head__title">My dashboard</h1>
            <p className="page-head__subtitle">
              {user?.name ? `Hi ${user.name}, here are your recent bookings.` : "Here are your recent bookings."}
            </p>
          </div>
        </header>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="surface fade-up" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>My bookings</h3>
                <Link className="btn btn--primary" to="/book">
                  Book a session
                </Link>
              </div>

              {state.loading ? (
                <p style={{ marginTop: 12 }}>Loading...</p>
              ) : state.error ? (
                <div className="notice notice--error" style={{ marginTop: 12 }}>
                  {state.error}
                </div>
              ) : state.bookings.length === 0 ? (
                <p style={{ marginTop: 12 }}>
                  No bookings yet.{" "}
                  <Link className="linklike" to="/book">
                    Request your first session
                  </Link>
                  .
                </p>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {state.bookings.map((b) => {
                    const { date, time } = formatBooking(b);
                    const status = String(b.status || "requested").toLowerCase();
                    const isCancelled = status === "cancelled" || status === "canceled";
                    return (
                      <div key={b.id} className="surface" style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{b.therapist_name}</div>
                            <div style={{ opacity: 0.8 }}>
                              {date} {time ? `• ${time}` : ""}
                            </div>
                          </div>
                          <div>
                            <span className="chip">{b.status || "requested"}</span>
                          </div>
                        </div>
                        {b.notes ? <p style={{ marginTop: 10, opacity: 0.85 }}>{b.notes}</p> : null}

                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              className="btn btn--ghost"
                              type="button"
                              disabled={isCancelled}
                              onClick={() => startReschedule(b)}
                            >
                              Reschedule
                            </button>
                            <button
                              className="btn btn--ghost"
                              type="button"
                              disabled={isCancelled}
                              onClick={() => cancelBooking(b.id)}
                            >
                              Cancel
                            </button>
                          </div>
                          {b.updated_at ? (
                            <div style={{ opacity: 0.65, fontSize: 13 }}>
                              Updated: {String(b.updated_at).slice(0, 10)}
                            </div>
                          ) : null}
                        </div>

                        {reschedule.id === b.id ? (
                          <form onSubmit={submitReschedule} style={{ marginTop: 12, display: "grid", gap: 10 }}>
                            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                              <div className="field" style={{ margin: 0 }}>
                                <div className="label">New date</div>
                                <input
                                  className="control"
                                  type="date"
                                  value={reschedule.date}
                                  onChange={(e) =>
                                    setReschedule((prev) => ({ ...prev, date: e.target.value }))
                                  }
                                  required
                                />
                              </div>
                              <div className="field" style={{ margin: 0 }}>
                                <div className="label">New time</div>
                                <input
                                  className="control"
                                  type="time"
                                  value={reschedule.time}
                                  onChange={(e) =>
                                    setReschedule((prev) => ({ ...prev, time: e.target.value }))
                                  }
                                  required
                                />
                              </div>
                            </div>

                            {reschedule.error ? (
                              <div className="notice notice--error">{reschedule.error}</div>
                            ) : null}

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button className="btn btn--primary" disabled={reschedule.loading}>
                                {reschedule.loading ? "Saving..." : "Save changes"}
                              </button>
                              <button className="btn btn--ghost" type="button" onClick={closeReschedule}>
                                Close
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
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

export default Dashboard;
