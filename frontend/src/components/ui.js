"use client";

import { useEffect, useRef } from "react";

const ICONS = {
  check: <path d="M5 13l4 4L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.4 3 5.2" />
    </>
  ),
};

export function Icon({ name, size = 16, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

export function Spinner({ label = "Memuat..." }) {
  return (
    <div className="center-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Alert({ type = "error", title, children, onRetry }) {
  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <div>
        {title && <strong>{title} </strong>}
        {children}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-secondary" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        <Icon name="clipboard" size={28} />
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function StatusBadge({ done, overdue }) {
  if (done) return <span className="badge badge-done">
        <Icon name="check" size={13} /> Selesai
      </span>;
  if (overdue) return <span className="badge badge-late">
        <Icon name="alert" size={13} /> Terlambat
      </span>;
  return <span className="badge badge-pending">
      <Icon name="dot" size={13} /> Belum selesai
    </span>;
}

export function Pagination({ meta, onChange, disabled }) {
  if (!meta) return null;
  const { page, totalPages, total, limit } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav className="pagination" aria-label="Paginasi">
      <span className="pagination-info">
        Menampilkan {from}–{to} dari {total} tugas
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          <Icon name="left" size={14} /> Sebelumnya
        </button>
        <span aria-current="page">
          Hal. {page} / {totalPages}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
          Berikutnya <Icon name="right" size={14} />
        </button>
      </div>
    </nav>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => !busy && onCancel()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-desc">{message}</p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Batal
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ id, label, required, error, hint, children }) {
  return (
    <div className={`field ${error ? "field-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error-text" id={`${id}-error`} role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}
