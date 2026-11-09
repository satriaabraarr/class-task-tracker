"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homePathFor } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? homePathFor(user) : "/login");
  }, [loading, user, router]);

  return <Spinner label="Memuat..." />;
}
