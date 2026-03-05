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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    (async () => {
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
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

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

