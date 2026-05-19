"use client";

import { useMemo, useState, useTransition } from "react";
import { createShareLinkAction, revokeShareLinkAction } from "./share-actions";

export type ShareLinkRow = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  recipientLabel: string | null;
  recipientEmail: string | null;
  viewCount: number;
  lastViewedAt: string | null;
};

export default function ShareLinkManager({
  requestId,
  candidateName,
  existingLinks,
}: {
  requestId: string;
  candidateName: string;
  existingLinks: ShareLinkRow[];
}) {
  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.protocol}//${window.location.host}`;
  }, []);
  const [creating, startCreate] = useTransition();
  const [revoking, startRevoke] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card p-6">
      <h2 className="section-title">Share with hiring manager</h2>
      <p className="text-sm text-slate-600 mb-4">
        Generate a read-only link to share this reference with a third party
        (e.g. a hiring manager). Links expire automatically and can be revoked
        at any time.
      </p>

      <form
        action={(fd) =>
          startCreate(async () => {
            setError(null);
            try {
              await createShareLinkAction(requestId, fd);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to create share link.");
            }
          })
        }
        className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-6"
      >
        <div className="md:col-span-2">
          <label className="label" htmlFor="recipientLabel">Recipient label</label>
          <input className="input" name="recipientLabel" placeholder='e.g. "HR @ ACME Defence"' />
        </div>
        <div>
          <label className="label" htmlFor="daysValid">Expires in</label>
          <select className="input" name="daysValid" defaultValue="30">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="recipientEmail">Recipient email (optional)</label>
          <input className="input" name="recipientEmail" type="email" placeholder="manager@example.com" />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="sendEmail" defaultChecked /> Email the link to the recipient
          </label>
        </div>
        <div className="md:col-span-4">
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? "Creating…" : "Create share link"}
          </button>
          {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
        </div>
      </form>

      {existingLinks.length === 0 ? (
        <p className="text-sm text-slate-500">No share links yet.</p>
      ) : (
        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Link</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Views</th>
                <th className="px-3 py-2">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {existingLinks.map((l) => {
                const url = `${baseUrl}/share/${l.token}`;
                const status =
                  l.revokedAt ? "Revoked" :
                  new Date(l.expiresAt) < new Date() ? "Expired" :
                  "Active";
                const statusClass =
                  status === "Active" ? "text-green-700" :
                  status === "Revoked" ? "text-red-700" :
                  "text-slate-500";
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div>{l.recipientLabel ?? "—"}</div>
                      <div className="text-xs text-slate-500">{l.recipientEmail ?? ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 truncate max-w-[180px]" title={url}>{url}</code>
                        <button
                          type="button"
                          className="text-xs text-brand underline"
                          onClick={() => navigator.clipboard.writeText(url)}
                        >Copy</button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{new Date(l.expiresAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-slate-600">{l.viewCount}{l.lastViewedAt ? ` (last ${new Date(l.lastViewedAt).toLocaleDateString()})` : ""}</td>
                    <td className={`px-3 py-2 font-medium ${statusClass}`}>{status}</td>
                    <td className="px-3 py-2 text-right">
                      {!l.revokedAt && new Date(l.expiresAt) >= new Date() && (
                        <button
                          type="button"
                          disabled={revoking}
                          className="text-xs text-red-700 underline"
                          onClick={() => {
                            if (!confirm(`Revoke this share link?`)) return;
                            startRevoke(async () => {
                              try {
                                await revokeShareLinkAction(l.id, requestId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : "Failed to revoke link.");
                              }
                            });
                          }}
                        >Revoke</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">
        Shared link will display the full reference for <strong>{candidateName}</strong> in
        read-only form. Recipients do not need an account.
      </p>
    </div>
  );
}
