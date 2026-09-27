"use client";

import { useState } from "react";
import { patchJSON, postJSON } from "@/lib/fetcher";
import { FormError } from "@/components/AuthCard";

type User = { name: string; email: string; phone: string; marketingOptIn: boolean; role: string };

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-sm text-emerald-400">Saved</span> : null;
}

export function ProfileForms({ user }: { user: User }) {
  const [pErr, setPErr] = useState<string | null>(null);
  const [pSaved, setPSaved] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy("profile");
    setPErr(null);
    setPSaved(false);
    const res = await patchJSON("/api/account/profile", {
      name: f.get("name"),
      phone: f.get("phone"),
      marketingOptIn: f.get("marketing") === "on",
    });
    setBusy(null);
    if (res.error) setPErr(res.error);
    else setPSaved(true);
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("newPassword") !== f.get("confirm")) {
      setPwErr("New passwords don't match.");
      return;
    }
    setBusy("password");
    setPwErr(null);
    setPwSaved(false);
    const res = await postJSON("/api/account/password", {
      currentPassword: f.get("currentPassword"),
      newPassword: f.get("newPassword"),
    });
    setBusy(null);
    if (res.error) setPwErr(res.error);
    else {
      setPwSaved(true);
      form.reset();
    }
  }

  async function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy("delete");
    setDelErr(null);
    const res = await postJSON("/api/account/delete", { password: f.get("password") });
    setBusy(null);
    if (res.error) setDelErr(res.error);
    else window.location.assign("/");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="card space-y-4 p-6">
        <h2 className="font-display text-2xl uppercase">Your details</h2>
        <FormError message={pErr} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={user.name} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile number</label>
            <input id="phone" name="phone" type="tel" defaultValue={user.phone} className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input value={user.email} className="input opacity-60" disabled readOnly />
          <p className="mt-1 text-xs text-smoke">To change your email address, please contact us.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-smoke">
          <input type="checkbox" name="marketing" defaultChecked={user.marketingOptIn} className="accent-orange-500" />
          Email me deals and offers
        </label>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save details"}</button>
          <Saved show={pSaved} />
        </div>
      </form>

      <form onSubmit={changePassword} className="card space-y-4 p-6">
        <h2 className="font-display text-2xl uppercase">Change password</h2>
        <FormError message={pwErr} />
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="input" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className="input" required minLength={8} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" required minLength={8} />
          </div>
        </div>
        <p className="text-xs text-smoke">Changing your password signs you out on other devices.</p>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={busy === "password"}>{busy === "password" ? "Saving…" : "Update password"}</button>
          <Saved show={pwSaved} />
        </div>
      </form>

      {user.role === "CUSTOMER" && (
        <div className="card border-red-900/60 p-6">
          <h2 className="font-display text-2xl uppercase text-red-300">Delete account</h2>
          <p className="mt-1 text-sm text-smoke">
            This removes your personal details and saved addresses. We keep anonymised order records for our accounts.
          </p>
          {!showDelete ? (
            <button className="btn-ghost mt-4 !border-red-900 !text-red-300" onClick={() => setShowDelete(true)}>Delete my account</button>
          ) : (
            <form onSubmit={deleteAccount} className="mt-4 space-y-3">
              <FormError message={delErr} />
              <label className="label" htmlFor="del-pw">Enter your password to confirm</label>
              <input id="del-pw" name="password" type="password" className="input" required />
              <div className="flex gap-2">
                <button className="btn-danger" disabled={busy === "delete"}>{busy === "delete" ? "Deleting…" : "Permanently delete"}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
