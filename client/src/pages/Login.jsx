import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../lib/api";
import { getSessionUser, isAdminUser } from "../lib/session";
import { supabase } from "../lib/supabase";

function Login({ variant = "user" }) {
  const navigate = useNavigate();
  const isAdminVariant = variant === "admin";
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    const user = getSessionUser();
    if (!user) return;
    navigate(isAdminUser(user) ? "/admin" : "/dashboard", { replace: true });
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
        throw new Error("missing_supabase_env");
      }

      const email = String(form.email || "").trim().toLowerCase();
      const password = String(form.password || "");

      const authResult =
        !isAdminVariant && mode === "register"
          ? await supabase.auth.signUp({
              email,
              password,
              options: { data: { name: String(form.name || "").trim() } },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (authResult.error) throw authResult.error;

      const session = authResult.data?.session || null;
      if (!session?.access_token) {
        setStatus({
          loading: false,
          error: "",
          success: "Account created. Please check your email to confirm, then login.",
        });
        return;
      }

      localStorage.setItem("mindfullcare_token", session.access_token);

      const me = await apiFetch("/auth/me");
      localStorage.setItem("mindfullcare_user", JSON.stringify(me.user));

      if (isAdminVariant && !isAdminUser(me.user)) {
        localStorage.removeItem("mindfullcare_token");
        localStorage.removeItem("mindfullcare_user");
        await supabase.auth.signOut();
        setStatus({ loading: false, error: "admin_only", success: "" });
        return;
      }

      setStatus({ loading: false, error: "", success: "Signed in." });
      navigate(isAdminUser(me.user) ? "/admin" : "/dashboard");
    } catch (err) {
      const msg =
        err?.message === "missing_supabase_env"
          ? "Missing REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY."
          : err?.message || "Login failed.";
      setStatus({ loading: false, error: msg, success: "" });
    }
  };

  return (
    <div className="page">
      <Navbar />

      <main className="main">
        <header className="page-head">
          <div className="container">
            <h1 className="page-head__title">
              {isAdminVariant ? "Admin login" : mode === "register" ? "Create account" : "Login"}
            </h1>
            <p className="page-head__subtitle">
              {isAdminVariant
                ? "Sign in to manage experts."
                : "Sign in to track bookings. Registration takes less than a minute."}
            </p>
          </div>
        </header>

        <div className="container">
          <form className="surface form-card fade-up" onSubmit={onSubmit}>
            <h2 className="form-title">
              {isAdminVariant ? "Welcome back" : mode === "register" ? "Welcome" : "Welcome back"}
            </h2>
            <p className="form-subtitle">
              {!isAdminVariant && mode === "register"
                ? "Create your account to view your booking history."
                : isAdminVariant
                  ? "Login to access the admin dashboard."
                  : "Login to view your booking history."}
            </p>

            {!isAdminVariant && mode === "register" && (
              <div className="field">
                <div className="label">Name</div>
                <input
                  className="control"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="field">
              <div className="label">Email</div>
              <input
                className="control"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <div className="label">Password</div>
              <input
                className="control"
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-actions">
              <button className="btn btn--primary" disabled={status.loading}>
                {status.loading
                  ? "Please wait..."
                  : isAdminVariant
                    ? "Login"
                    : mode === "register"
                      ? "Register"
                      : "Login"}
              </button>
              {!isAdminVariant ? (
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
                >
                  {mode === "register" ? "Use login" : "Create account"}
                </button>
              ) : null}
            </div>

            {status.error && <div className="notice notice--error">{status.error}</div>}
            {status.success && <div className="notice notice--success">{status.success}</div>}

            {!isAdminVariant ? (
              <div className="switch">
                {mode === "register" ? "Already have an account? " : "New here? "}
                <button
                  type="button"
                  className="linklike"
                  onClick={() => {
                    setStatus({ loading: false, error: "", success: "" });
                    setMode((m) => (m === "login" ? "register" : "login"));
                  }}
                >
                  {mode === "register" ? "Login" : "Create one"}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Login;
