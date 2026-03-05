import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

function Home() {
  return (
    <div className="page">
      <Navbar />

      <main className="main">
        <Hero />

        <section className="section">
          <div className="container">
            <h2 className="section__title">Support that feels human</h2>
            <p className="section__lede">
              MindfullCare keeps it simple: a calm interface, clear specialties, and a fast booking
              flow.
            </p>

            <div className="feature-grid">
              <div className="surface feature">
                <h4>Thoughtful matching</h4>
                <p>Choose by specialization and experience, then book in one step.</p>
              </div>
              <div className="surface feature">
                <h4>Simple scheduling</h4>
                <p>Request a date and time in seconds. No complicated calendars.</p>
              </div>
              <div className="surface feature">
                <h4>Secure by default</h4>
                <p>Login to track bookings using a token-based API.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
