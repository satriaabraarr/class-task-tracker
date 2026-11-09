"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, homePathFor } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui";

function initials(name = "") {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Proteksi halaman berdasarkan login dan peran + header/nav umum. */
export default function AppShell({ roles, children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Spinner label="Memeriksa sesi..." />;

  if (roles && !roles.includes(user.role)) {
    return (
      <main className="container narrow">
        <div className="alert alert-error" role="alert">
          <div>
            <strong>Akses ditolak.</strong> Anda tidak memiliki izin untuk membuka halaman ini.
          </div>
          <Link className="btn btn-sm btn-secondary" href={homePathFor(user)}>
            Kembali
          </Link>
        </div>
      </main>
    );
  }

  const home = homePathFor(user);
  const roleLabel = user.role === "teacher" ? "Guru" : "Siswa";

  return (
    <>
      <header className="app-header">
        <div className="container header-inner">
          <Link href={home} className="brand">
            <img src="/icon.svg" alt="" width={30} height={30} className="brand-logo" />
            Class Task Tracker
          </Link>
          <div className="header-spacer" />
          <div className="header-user">
            <span className="avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="role-chip">{roleLabel}</span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="container">
        {children}
      </main>
    </>
  );
}
