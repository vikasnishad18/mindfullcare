export function getSessionUser() {
  const token = localStorage.getItem("mindfullcare_token");
  if (!token) return null;
  const raw = localStorage.getItem("mindfullcare_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function isAdminUser(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

