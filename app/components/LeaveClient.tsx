"use client";
import { apiPath } from "sanapp-common-ui";

import { useState } from "react";

export type LeaveItem = {
  id: string;
  applicant: string;
  reason: string;
  days: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  // Pre-formatted on the server to avoid client/server hydration mismatch.
  createdAtLabel: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "accent",
  APPROVED: "",
  REJECTED: "danger",
};

export function LeaveClient({
  canSubmit,
  canApprove,
  canDelete,
  initialLeaves,
}: {
  canSubmit: boolean;
  canApprove: boolean;
  canDelete: boolean;
  initialLeaves: LeaveItem[];
}) {
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(apiPath(path), {
      headers: { "content-type": "application/json" },
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { leave } = await api("/api/leaves", {
        method: "POST",
        body: JSON.stringify({ reason, days: Number(days) }),
      });
      setLeaves((prev) => [leave, ...prev]);
      setReason("");
      setDays("5");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit leave request");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    try {
      const { leave } = await api("/api/leaves", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      setLeaves((prev) => prev.map((l) => (l.id === id ? leave : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update leave request");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this leave request?")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/leaves?id=${id}`, { method: "DELETE" });
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete leave request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="iipe-alert danger">{error}</div>}

      {canSubmit && (
        <form onSubmit={submit} className="iipe-card">
          <h3>Submit a leave request</h3>
          <div className="iipe-field">
            <label className="iipe-label" htmlFor="leave-reason">Reason</label>
            <input
              id="leave-reason"
              className="iipe-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <div className="iipe-field">
            <label className="iipe-label" htmlFor="leave-days">Days</label>
            <input
              id="leave-days"
              className="iipe-input"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
            />
          </div>
          <button className="iipe-btn" type="submit" disabled={busy || !reason.trim()}>
            {busy ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}

      {leaves.length === 0 && <div className="iipe-alert">No leave requests yet.</div>}

      {leaves.map((l) => (
        <div className="iipe-card" key={l.id}>
          <div className="iipe-row">
            <h3 style={{ margin: 0 }}>{l.applicant}</h3>
            <span className="iipe-badge accent">{l.days} day{l.days === 1 ? "" : "s"}</span>
            <span className={`iipe-badge ${STATUS_BADGE[l.status]}`}>{l.status}</span>
            <span className="iipe-spacer" />
            <span className="iipe-muted">{l.createdAtLabel}</span>
          </div>
          <p style={{ marginBottom: 0 }}>{l.reason}</p>
          {(canApprove || canDelete) && (
            <div className="iipe-form-actions">
              {canApprove && l.status === "PENDING" && (
                <>
                  <button className="iipe-btn" type="button" disabled={busy} onClick={() => setStatus(l.id, "APPROVED")}>
                    Approve
                  </button>
                  <button className="iipe-btn danger" type="button" disabled={busy} onClick={() => setStatus(l.id, "REJECTED")}>
                    Reject
                  </button>
                </>
              )}
              {canDelete && (
                <button className="iipe-btn ghost" type="button" disabled={busy} onClick={() => remove(l.id)}>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
