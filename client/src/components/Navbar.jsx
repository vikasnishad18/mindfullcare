import { Link, useNavigate } from "react-router-dom";
import { getSessionUser, isAdminUser } from "../lib/session";
import { getSupabaseClient } from "../lib/supabase";

function Navbar() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const token = Boolean(user);

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        <h2 className="logo">
          <Link to="/">MindfullCare</Link>
        </h2>

        <div className="nav-links">
          <Link to="/therapists">Therapists</Link>
          <Link to="/book">Book Session</Link>
          {token ? <Link to={isAdminUser(user) ? "/admin" : "/dashboard"}>Dashboard</Link> : null}

          {token ? (
            <div className="nav-user">
              <span className="nav-user__name">{user?.name ? `Hi, ${user.name}` : "Signed in"}</span>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  localStorage.removeItem("mindfullcare_token");
                  localStorage.removeItem("mindfullcare_user");
                  const supabase = getSupabaseClient();
                  if (supabase) supabase.auth.signOut().catch(() => {});
                  navigate("/");
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link className="btn btn--primary" to="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
