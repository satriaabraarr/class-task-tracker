"use client";

import AppShell from "@/components/AppShell";
import TaskForm from "@/components/TaskForm";

export default function NewTaskPage() {
  return (
    <AppShell roles={["teacher"]}>
      <div className="narrow">
        <TaskForm />
      </div>
    </AppShell>
  );
}
