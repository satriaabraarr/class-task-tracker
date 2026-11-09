"use client";

import AppShell from "@/components/AppShell";
import TaskList from "@/components/TaskList";

export default function DashboardPage() {
  return (
    <AppShell roles={["teacher"]}>
      <TaskList />
    </AppShell>
  );
}
