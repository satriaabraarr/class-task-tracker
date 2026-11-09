"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDue, isOverdue } from "@/lib/date";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { Alert, ConfirmDialog, EmptyState, Icon, Pagination, Spinner, StatusBadge } from "@/components/ui";

const LIMIT = 10;

export default function TaskList() {
  const { user } = useAuth();
  const toast = useToast();
  const isTeacher = user.role === "teacher";

  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [pendingId, setPendingId] = useState(null); // tugas yang sedang ditandai selesai
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const reqId = useRef(0);
  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api("/tasks", {
      query: { q, status: isTeacher ? undefined : status, classId, page, limit: LIMIT },
      signal: ctrl.signal,
    })
      .then(({ data, meta }) => {
        if (id !== reqId.current) return;
        // Jika halaman melewati total (mis. setelah hapus), mundur ke halaman terakhir
        if (data.length === 0 && meta.total > 0 && page > meta.totalPages) {
          setPage(meta.totalPages);
          return;
        }
        setItems(data);
        setMeta(meta);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError" || id !== reqId.current) return;
        setError(e);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [q, status, classId, page, reloadKey, isTeacher]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function markDone(task) {
    setPendingId(task.id);
    try {
      const { data } = await api(`/tasks/${task.id}/completion`, { method: "PUT" });
      // Perbarui UI hanya setelah server mengonfirmasi
      setItems((list) => list.map((t) => (t.id === task.id ? { ...t, completed: true, completedAt: data.completedAt } : t)));
      toast.success("Tugas ditandai selesai.");
      if (status === "pending") reload();
    } catch (e) {
      if (e.status !== 401) toast.error(e.message);
    } finally {
      setPendingId(null);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/tasks/${toDelete.id}`, { method: "DELETE" });
      toast.success(`Tugas "${toDelete.title}" dihapus.`);
      setToDelete(null);
      reload();
    } catch (e) {
      if (e.status !== 401) toast.error(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtering = Boolean(q) || status !== "all" || Boolean(classId);

  return (
    <section aria-labelledby="list-title">
      <div className="page-head">
        <div>
          <h1 id="list-title">{isTeacher ? "Dashboard Guru" : "Tugas Saya"}</h1>
          <p className="muted">
            {isTeacher
              ? `Kelola tugas untuk ${user.classes.map((c) => c.name).join(", ") || "kelas Anda"}.`
              : `Daftar tugas untuk ${user.classes[0]?.name || "kelas Anda"}.`}
          </p>
        </div>
        {isTeacher && (
          <Link href="/tasks/new" className="btn btn-primary">
            <Icon name="plus" size={16} /> Tambah Tugas
          </Link>
        )}
      </div>

      {isTeacher && meta && (
        <div className="summary" aria-label="Ringkasan">
          <div className="summary-card">
            <span className="summary-icon" aria-hidden="true">
              <Icon name="clipboard" size={18} />
            </span>
            <div>
              <span className="summary-num">{meta.total}</span>
              <span className="muted">{filtering ? "tugas sesuai filter" : "total tugas"}</span>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar" role="search">
        <div className="toolbar-field grow">
          <label htmlFor="search">Cari judul</label>
          <div className="search-wrap">
            <Icon name="search" size={18} />
            <input id="search" type="search" placeholder="Ketik judul tugas..." value={input} onChange={(e) => setInput(e.target.value)} maxLength={150} />
          </div>
        </div>
        {isTeacher ? (
          <div className="toolbar-field">
            <label htmlFor="class-filter">Kelas</label>
            <select id="class-filter" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
              <option value="">Semua kelas</option>
              {user.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="toolbar-field">
            <label htmlFor="status-filter">Status</label>
            <select id="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">Semua</option>
              <option value="pending">Belum selesai</option>
              <option value="done">Selesai</option>
            </select>
          </div>
        )}
      </div>

      {error ? (
        <Alert title="Gagal memuat tugas." onRetry={reload}>
          {error.message}
        </Alert>
      ) : loading && items.length === 0 ? (
        <Spinner label="Memuat tugas..." />
      ) : items.length === 0 ? (
        <EmptyState title={filtering ? "Tugas tidak ditemukan" : "Belum ada tugas"}>
          {filtering
            ? "Coba ubah kata kunci pencarian atau filter."
            : isTeacher
              ? "Klik “Tambah Tugas” untuk menerbitkan tugas pertama."
              : "Belum ada tugas untuk kelas Anda."}
        </EmptyState>
      ) : (
        <>
          <ul className={`task-list ${loading ? "is-loading" : ""}`} aria-busy={loading}>
            {items.map((t) => {
              const overdue = !isTeacher && !t.completed && isOverdue(t.dueAt);
              return (
                <li key={t.id} className={`task-card ${!isTeacher && t.completed ? "task-done" : ""}`}>
                  <div className="task-main">
                    <h2 className="task-title">
                      <Link href={`/tasks/${t.id}`}>{t.title}</Link>
                    </h2>
                    {t.description && <p className="task-desc">{t.description}</p>}
                    <div className="task-meta">
                      <span className="chip">{t.className}</span>
                      <span className={overdue ? "due due-late" : "due"}>
                        <Icon name="clock" size={14} /> {formatDue(t.dueAt)} WIB
                      </span>
                      {isTeacher ? (
                        <span className="chip chip-soft">
                          <Icon name="users" size={13} /> {t.completedCount}/{t.studentCount} siswa selesai
                        </span>
                      ) : (
                        <StatusBadge done={t.completed} overdue={overdue} />
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    {isTeacher ? (
                      <>
                        <Link href={`/tasks/${t.id}/edit`} className="btn btn-secondary btn-sm">
                          Ubah
                        </Link>
                        <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => setToDelete(t)}>
                          Hapus
                        </button>
                      </>
                    ) : t.completed ? null : (
                      <button type="button" className="btn btn-primary btn-sm" disabled={pendingId === t.id} onClick={() => markDone(t)}>
                        {pendingId === t.id ? "Menyimpan..." : "Tandai selesai"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination meta={meta} disabled={loading} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Hapus Tugas?"
        message={toDelete ? `Tugas "${toDelete.title}" akan dihapus permanen dan tidak muncul lagi di daftar siswa.` : ""}
        confirmLabel="Hapus Tugas"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
