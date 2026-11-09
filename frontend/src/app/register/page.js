"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth, homePathFor } from "@/components/AuthProvider";
import { Alert, Field } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", classCode: "", classCodes: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(homePathFor(user));
  }, [loading, user, router]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isTeacher = form.role === "teacher";

  // Ganti peran -> kosongkan seluruh isian dan pesan error
  function changeRole(e) {
    const role = e.target.value;
    if (role === form.role) return;
    setForm({ name: "", email: "", password: "", role, classCode: "", classCodes: "" });
    setErrors({});
    setFormError(null);
  }

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Nama minimal 2 karakter";
    if (!form.email.trim()) e.email = "Email wajib diisi";
    else if (!EMAIL_RE.test(form.email.trim())) e.email = "Format email tidak valid";
    if (form.password.length < 8) e.password = "Password minimal 8 karakter";
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = "Password harus mengandung huruf dan angka";
    if (isTeacher) {
      if (!form.classCodes.split(",").some((c) => c.trim())) e.classCodes = "Minimal satu kode kelas yang diajar wajib diisi";
    } else if (!form.classCode.trim()) e.classCode = "Kode kelas wajib diisi";
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submitting) return;
    setFormError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      ...(isTeacher
        ? { classCodes: form.classCodes.split(",").map((c) => c.trim()).filter(Boolean) }
        : { classCode: form.classCode.trim() }),
    };
    try {
      await api("/auth/register", { method: "POST", body, silent401: true });
      router.replace("/login?registered=1");
    } catch (err) {
      if ((err.status === 400 || err.status === 409) && err.details.length) setErrors(err.fieldErrors());
      else setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form onSubmit={onSubmit} noValidate className="card auth-card">
        <div className="auth-brand">
          <img src="/icon.svg" alt="" width={30} height={30} className="brand-logo" />
          Class Task Tracker
        </div>
        <h1>Registrasi</h1>
        <p className="muted">Kolom bertanda * wajib diisi.</p>

        {formError && <Alert title="Registrasi gagal.">{formError}</Alert>}

        <fieldset className="role-group">
          <legend>Daftar sebagai *</legend>
          <label className={`role-option ${!isTeacher ? "selected" : ""}`}>
            <input type="radio" name="role" value="student" checked={!isTeacher} onChange={changeRole} /> Siswa
          </label>
          <label className={`role-option ${isTeacher ? "selected" : ""}`}>
            <input type="radio" name="role" value="teacher" checked={isTeacher} onChange={changeRole} /> Guru
          </label>
        </fieldset>

        <Field id="name" label="Nama lengkap" required error={errors.name}>
          <input id="name" autoComplete="name" value={form.name} onChange={set("name")} maxLength={100} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field id="password" label="Password" required error={errors.password} hint="Minimal 8 karakter, kombinasi huruf dan angka.">
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} />
        </Field>

        {isTeacher ? (
          <Field id="classCodes" label="Kode kelas yang diajar" required error={errors.classCodes} hint="Pisahkan dengan koma jika lebih dari satu, mis. KELAS-7A, KELAS-7B.">
            <input id="classCodes" value={form.classCodes} onChange={set("classCodes")} aria-invalid={Boolean(errors.classCodes)} />
          </Field>
        ) : (
          <Field id="classCode" label="Kode kelas" required error={errors.classCode} hint="Kode kelas diberikan oleh pihak sekolah.">
            <input id="classCode" value={form.classCode} onChange={set("classCode")} aria-invalid={Boolean(errors.classCode)} />
          </Field>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Memproses..." : "Daftar"}
        </button>
        <p className="auth-foot">
          Sudah punya akun? <Link href="/login">Masuk</Link>
        </p>
      </form>
    </main>
  );
}
