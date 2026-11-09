"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import TaskForm from "@/components/TaskForm";
import { Alert, Spinner } from "@/components/ui";

function EditLoader() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api(`/tasks/${id}`)
      .then(({ data }) => setTask(data))
      .catch((e) => e.status !== 401 && setError(e));
  }, [id]);

  useEffect(load, [load]);

  if (error) {
    return (
      <Alert title={error.status === 404 ? "Tugas tidak ditemukan." : "Gagal memuat tugas."} onRetry={error.status === 404 ? undefined : load}>
        {error.status === 404 ? <Link href="/dashboard">Kembali ke dashboard</Link> : error.message}
      </Alert>
    );
  }
  if (!task) return <Spinner label="Memuat tugas..." />;
  return <TaskForm key={task.id} task={task} />;
}

export default function EditTaskPage() {
  return (
    <AppShell roles={["teacher"]}>
      <div className="narrow">
        <EditLoader />
      </div>
    </AppShell>
  );
}
