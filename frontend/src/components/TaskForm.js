"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fromInputValue, toInputValue } from "@/lib/date";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { Alert, Field } from "@/components/ui";

export default function TaskForm({ task }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(task);

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    dueAt: task ? toInputValue(task.dueAt) : "",
    classId: task?.classId || (user.classes.length === 1 ? user.classes[0].id : ""),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Judul wajib diisi";
    else if (form.title.trim().length > 150) e.title = "Judul maksimal 150 karakter";
    if (form.description.length > 2000) e.description = "Deskripsi maksimal 2000 karakter";
    if (!form.dueAt || !fromInputValue(form.dueAt)) e.dueAt = "Tenggat wajib diisi dengan tanggal/waktu valid";
    if (!form.classId) e.classId = "Kelas wajib dipilih";
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (saving) return;
    setFormError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      dueAt: fromInputValue(form.dueAt),
      classId: form.classId,
    };
    try {
      if (editing) {
        await api(`/tasks/${task.id}`, { method: "PATCH", body });
        toast.success("Perubahan tugas disimpan.");
      } else {
        await api("/tasks", { method: "POST", body });
        toast.success("Tugas berhasil ditambahkan.");
      }
      router.push("/dashboard");
    } catch (e) {
      if (e.status === 400 && e.details.length) setErrors(e.fieldErrors());
      else if (e.status !== 401) setFormError(e.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card form">
      <h1>{editing ? "Ubah Tugas" : "Tambah Tugas"}</h1>
      <p className="muted">Kolom bertanda * wajib diisi.</p>

      {formError && <Alert title="Gagal menyimpan.">{formError}</Alert>}

      <Field id="title" label="Judul" required error={errors.title}>
        <input id="title" value={form.title} onChange={set("title")} maxLength={150} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />
      </Field>

      <Field id="description" label="Deskripsi" error={errors.description} hint="Opsional, maksimal 2000 karakter.">
        <textarea id="description" rows={5} value={form.description} onChange={set("description")} maxLength={2000} aria-invalid={Boolean(errors.description)} />
      </Field>

      <div className="grid-2">
        <Field id="dueAt" label="Tenggat (WIB)" required error={errors.dueAt}>
          <input id="dueAt" type="datetime-local" value={form.dueAt} onChange={set("dueAt")} aria-invalid={Boolean(errors.dueAt)} />
        </Field>
        <Field id="classId" label="Kelas" required error={errors.classId}>
          <select id="classId" value={form.classId} onChange={set("classId")} aria-invalid={Boolean(errors.classId)}>
            <option value="">Pilih kelas...</option>
            {user.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="form-actions">
        <Link href="/dashboard" className="btn btn-secondary" aria-disabled={saving}>
          Batal
        </Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
