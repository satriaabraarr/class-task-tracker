export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || [];
  }

  /** Ubah details server menjadi { field: pesan } untuk form. */
  fieldErrors() {
    const out = {};
    for (const d of this.details) {
      if (d.field && !out[d.field]) out[d.field] = d.message;
    }
    return out;
  }
}

function buildQuery(query) {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function api(path, { method = "GET", body, query, signal, silent401 = false } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK_ERROR", "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.");
  }

  if (res.status === 204) return { data: null, meta: null };

  let json = null;
  try {
    json = await res.json();
  } catch {
    // body bukan JSON
  }

  if (!res.ok || !json || json.success === false) {
    const err = json?.error;
    if (res.status === 401 && !silent401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new ApiError(
      res.status,
      err?.code || "UNKNOWN_ERROR",
      err?.message || "Terjadi kesalahan pada server. Coba lagi nanti.",
      err?.details
    );
  }

  return { data: json.data, meta: json.meta || null };
}
