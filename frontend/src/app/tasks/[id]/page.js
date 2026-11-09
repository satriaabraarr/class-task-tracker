"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDue, isOverdue } from "@/lib/date";
import { useAuth, homePathFor } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import AppShell from "@/components/AppShell";
import { Alert, ConfirmDialog, Icon, Spinner, StatusBadge } from "@/components/ui";

function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isTeacher = user.role === "teacher";

  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api(`/tasks/${id}`)
      .then(({ data }) => setTask(data))
      .catch((e) => e.status !== 401 && setError(e));
  }, [id]);

  useEffect(load, [load]);

  async function markDone() {
    setMarking(true);
    try {
      const { data } = await api(`/tasks/${id}/completion`, { method: "PUT" });
      setTask((t) => ({ ...t, completed: true, completedAt: data.completedAt }));
      toast.success("Tugas ditandai selesai.");
    } catch (e) {
      if (e.status !== 401) toast.error(e.message);
    } finally {
      setMarking(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      toast.success("Tugas dihapus.");
      router.replace("/dashboard");
    } catch (e) {
      if (e.status !== 401) toast.error(e.message);
      setConfirmOpen(false);
      setDeleting(false);
    }
  }

  const back = homePathFor(user);

  if (error) {
    return (
      <div className="narrow">
        <Alert title={error.status === 404 ? "Tugas tidak ditemukan." : "Gagal memuat tugas."} onRetry={error.status === 404 ? undefined : load}>
          {error.status === 404 ? "Tugas mungkin sudah dihapus atau bukan untuk kelas Anda." : error.message}
        </Alert>
        <Link href={back} className="btn btn-secondary">
          <Icon name="left" size={16} /> Kembali
        </Link>
      </div>
    );
  }
  if (!task) return <Spinner label="Memuat tugas..." />;

  const overdue = !isTeacher && !task.completed && isOverdue(task.dueAt);

  return (
    <article className="card detail narrow">
      <Link href={back} className="back-link">
        <Icon name="left" size={16} /> Kembali ke daftar
      </Link>
      <h1>{task.title}</h1>
      <div className="task-meta">
        <span className="chip">{task.className}</span>
        {isTeacher ? (
          <span className="chip chip-soft">
            {task.completedCount}/{task.studentCount} siswa selesai
          </span>
        ) : (
          <StatusBadge done={task.completed} overdue={overdue} />
        )}
      </div>

      <dl className="detail-grid">
        <dt>Tenggat</dt>
        <dd className={overdue ? "due-late" : ""}>{formatDue(task.dueAt)} WIB</dd>
        <dt>Dibuat oleh</dt>
        <dd>{task.createdByName}</dd>
        {!isTeacher && task.completed && (
          <>
            <dt>Diselesaikan</dt>
            <dd>{formatDue(task.completedAt)} WIB</dd>
          </>
        )}
      </dl>

      <h2 className="detail-sub">Deskripsi</h2>
      <p className="detail-desc">{task.description || <span className="muted">Tidak ada deskripsi.</span>}</p>

      <div className="form-actions">
        {isTeacher ? (
          <>
            <Link href={`/tasks/${task.id}/edit`} className="btn btn-secondary">
              Ubah
            </Link>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              Hapus Tugas
            </button>
          </>
        ) : (
          !task.completed && (
            <button type="button" className="btn btn-primary" disabled={marking} onClick={markDone}>
              {marking ? "Menyimpan..." : "Tandai selesai"}
            </button>
          )
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Tugas?"
        message={`Tugas "${task.title}" akan dihapus permanen dan tidak muncul lagi di daftar siswa.`}
        confirmLabel="Hapus Tugas"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}

export default function TaskDetailPage() {
  return (
    <AppShell>
      <Detail />
    </AppShell>
  );
}
