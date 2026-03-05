import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import BookingForm from "../components/BookingForm";
import Footer from "../components/Footer";

function BookSession() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const therapist = params.get("therapist") || "";

  return (
    <div className="page">
      <Navbar />

      <main className="main">
        <header className="page-head">
          <div className="container">
            <h1 className="page-head__title">Book a session</h1>
            <p className="page-head__subtitle">
              Choose a therapist, pick a time, and we’ll record your request.
            </p>
          </div>
        </header>

        <div className="container">
          <BookingForm initialTherapistName={therapist} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default BookSession;
