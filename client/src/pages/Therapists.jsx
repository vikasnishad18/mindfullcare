import Navbar from "../components/Navbar";
import TherapistCard from "../components/TherapistCard";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const fallbackTherapists = [
  {
    name: "Dr. Aisha Sharma",
    specialization: "Anxiety & Stress Therapy",
    experience: 8,
    image: "https://i.pravatar.cc/300?img=32",
  },
  {
    name: "Dr. Rahul Mehta",
    specialization: "Depression Counseling",
    experience: 10,
    image: "https://i.pravatar.cc/300?img=12",
  },
  {
    name: "Dr. Neha Kapoor",
    specialization: "Relationship Therapy",
    experience: 6,
    image: "https://i.pravatar.cc/300?img=25",
  },
];

function Therapists() {
  const [state, setState] = useState({ loading: true, error: "", therapists: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/experts");
        if (cancelled) return;
        const therapists = (data.experts || []).map((t) => ({
          ...t,
          image: t.image || "https://i.pravatar.cc/300?img=5",
        }));
        setState({
          loading: false,
          error: "",
          therapists: therapists.length ? therapists : fallbackTherapists,
        });
      } catch (err) {
        if (cancelled) return;
        setState({ loading: false, error: "", therapists: fallbackTherapists });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <Navbar />

      <main className="main">
        <header className="page-head">
          <div className="container">
            <h1 className="page-head__title">Therapists</h1>
            <p className="page-head__subtitle">
              Start with a specialist that matches your needs. You can always change later.
            </p>
          </div>
        </header>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            {state.error ? <div className="notice notice--error">{state.error}</div> : null}
            <div className="therapist-container">
              {(state.loading ? fallbackTherapists : state.therapists).map((t) => (
                <TherapistCard key={t.id || t.name} therapist={t} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Therapists;
