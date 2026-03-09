const API_BASE =
  process.env.REACT_APP_API_URL || "https://mindfullcare.onrender.com/api";

export function getAuthToken() {
  return localStorage.getItem("mindfullcare_token");
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const error = (body && body.error) || `http_${res.status}`;
    const err = new Error(error);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}
