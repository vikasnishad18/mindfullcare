import { Link } from "react-router-dom";

function TherapistCard({ therapist }) {
  return (
    <div className="surface therapist-card fade-up">
      <div className="therapist-card__top">
        <img src={therapist.image} alt={therapist.name} />
        <div className="therapist-card__badge">{therapist.experience}+ yrs</div>
      </div>

      <h3>{therapist.name}</h3>

      <p className="specialization">{therapist.specialization}</p>

      <div className="therapist-meta">
        <span className="chip">Online sessions</span>
        <span className="chip">Confidential</span>
      </div>

      <div className="therapist-actions">
        <Link className="btn btn--primary" to={`/book?therapist=${encodeURIComponent(therapist.name)}`}>
          Book
        </Link>
        <Link className="btn btn--ghost" to="/book">
          See slots
        </Link>
      </div>
    </div>
  );
}

export default TherapistCard;
