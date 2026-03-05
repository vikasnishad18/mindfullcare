import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./style/main.css";
import Home from "./pages/Home";
import Therapists from "./pages/Therapists";
import BookSession from "./pages/BookSession";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { getSessionUser, isAdminUser } from "./lib/session";

function RequireAuth({ children }) {
  const user = getSessionUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const user = getSessionUser();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/therapists" element={<Therapists />} />
        <Route path="/book" element={<BookSession />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Login variant="admin" />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
