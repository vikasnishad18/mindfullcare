import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="container">
        <div className="hero__grid">
          <div className="surface hero__content fade-up">
            <h1 className="hero__title">A calmer mind, one session at a time.</h1>

            <p className="hero__subtitle">
              Meet certified therapists and book a session that fits your schedule. Private,
              compassionate, and simple.
            </p>

            <div className="hero__actions">
              <button className="btn btn--primary" onClick={() => navigate("/book")}>
                Book a session
              </button>
              <button className="btn btn--ghost" onClick={() => navigate("/therapists")}>
                Browse therapists
              </button>
            </div>

            <div className="hero__facts">
              <span className="chip">Confidential</span>
              <span className="chip">Flexible slots</span>
              <span className="chip">Evidence-based</span>
            </div>
          </div>

          <div className="surface hero__aside fade-up">
            <div className="aside-card">
              <h3>How it works</h3>
              <p>Pick a therapist, choose a date/time, and you’re set.</p>
              <ul>
                <li>Browse specialties</li>
                <li>Request a session</li>
                <li>Track your bookings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
