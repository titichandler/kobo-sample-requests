"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={submitting}
      onClick={() => void handleSignOut()}
    >
      {submitting ? "Signing out..." : "Sign out"}
    </button>
  );
}
