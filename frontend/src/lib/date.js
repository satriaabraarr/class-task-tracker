// Seluruh tenggat ditampilkan dan diinput dalam zona waktu aplikasi (WIB).
export const APP_TZ = "Asia/Jakarta";
const APP_OFFSET = "+07:00";

export function formatDue(iso) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** ISO -> nilai untuk <input type="datetime-local"> dalam WIB. */
export function toInputValue(iso) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  // "2026-11-10 23:59" -> "2026-11-10T23:59"
  return parts.replace(" ", "T");
}

/** Nilai datetime-local (dianggap WIB) -> ISO string. */
export function fromInputValue(value) {
  if (!value) return "";
  const d = new Date(`${value}:00${APP_OFFSET}`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function isOverdue(iso) {
  return new Date(iso).getTime() < Date.now();
}
