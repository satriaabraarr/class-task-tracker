"use client";

import AppShell from "@/components/AppShell";
import TaskList from "@/components/TaskList";

export default function StudentTasksPage() {
  return (
    <AppShell roles={["student"]}>
      <TaskList />
    </AppShell>
  );
}
