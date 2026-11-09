"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, homePathFor } from "@/components/AuthProvider";
import { Alert, Field, Icon, Spinner } from "@/components/ui";

function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(homePathFor(user));
  }, [loading, user, router]);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const v = {};
    if (!email.trim()) v.email = "Email wajib diisi";
    if (!password) v.password = "Password wajib diisi";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      router.replace(homePathFor(u));
    } catch (err) {
      if (err.status === 400 && err.details.length) setErrors(err.fieldErrors());
      else setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="login-split">
      <section className="login-hero" aria-hidden="true">
        <div className="login-hero-brand">
          <span className="brand-mark brand-mark-light">
            <Icon name="check" size={18} />
          </span>
          Class Task Tracker
        </div>
        <div className="login-hero-body">
          <h2>Tugas kelas jadi rapi, jelas, dan terpantau.</h2>
          <p>
            Guru menerbitkan tugas, siswa memantau tenggat dan menandai yang sudah selesai, semuanya dari satu aplikasi.
          </p>
        </div>
        <div className="login-hero-foot">© 2026 Class Task Tracker</div>
      </section>

      <section className="login-panel">
        <form onSubmit={onSubmit} noValidate className="login-form">
          <div className="login-mobile-brand">
            <img src="/icon.svg" alt="" width={30} height={30} className="brand-logo" />
            Class Task Tracker
          </div>

          <h1>Masuk</h1>
          <p className="muted login-sub">Gunakan akun guru atau siswa Anda.</p>

          {params.get("expired") && <Alert type="info">Sesi Anda berakhir. Silakan masuk kembali.</Alert>}
          {params.get("registered") && <Alert type="success">Registrasi berhasil. Silakan masuk.</Alert>}
          {params.get("loggedout") && <Alert type="info">Anda telah keluar.</Alert>}
          {formError && <Alert title="Gagal masuk.">{formError}</Alert>}

          <Field id="email" label="Email" required error={errors.email}>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
          </Field>

          <Field id="password" label="Password" required error={errors.password}>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </Field>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Memproses..." : "Masuk"}
          </button>
          <p className="auth-foot">
            Belum punya akun? <Link href="/register">Registrasi</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}
