"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteJSON, getJSON, patchJSON, postJSON } from "@/lib/fetcher";
import { FormError } from "./AuthCard";
import { CheckIcon, PinIcon, PlusIcon } from "./Icons";

export type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  instructions: string | null;
  isDefault: boolean;
};

function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Address;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    const f = new FormData(e.currentTarget);
    const body = {
      label: f.get("label") || "Home",
      line1: f.get("line1"),
      line2: f.get("line2") || null,
      city: f.get("city"),
      postcode: f.get("postcode"),
      instructions: f.get("instructions") || null,
      isDefault: f.get("isDefault") === "on",
    };
    setSaving(true);
    setError(null);
    const res = initial
      ? await patchJSON<Address>(`/api/account/addresses/${initial.id}`, body)
      : await postJSON<Address>("/api/account/addresses", body);
    setSaving(false);
    if (res.error || !res.data) setError(res.error || "Could not save address");
    else onSaved(res.data);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-coal p-4">
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="a-postcode">Postcode</label>
          <input id="a-postcode" name="postcode" defaultValue={initial?.postcode} className="input uppercase" placeholder="WR1 1SB" autoComplete="postal-code" required />
        </div>
        <div>
          <label className="label" htmlFor="a-label">Label</label>
          <input id="a-label" name="label" defaultValue={initial?.label ?? "Home"} className="input" placeholder="Home, Work…" maxLength={40} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="a-line1">Address line 1</label>
        <input id="a-line1" name="line1" defaultValue={initial?.line1} className="input" placeholder="House number and street" autoComplete="address-line1" required />
      </div>
      <div>
        <label className="label" htmlFor="a-line2">Address line 2 <span className="normal-case">(optional)</span></label>
        <input id="a-line2" name="line2" defaultValue={initial?.line2 ?? ""} className="input" placeholder="Flat, building" autoComplete="address-line2" />
      </div>
      <div>
        <label className="label" htmlFor="a-city">Town / city</label>
        <input id="a-city" name="city" defaultValue={initial?.city ?? "Worcester"} className="input" autoComplete="address-level2" required />
      </div>
      <div>
        <label className="label" htmlFor="a-inst">Delivery instructions <span className="normal-case">(optional)</span></label>
        <input id="a-inst" name="instructions" defaultValue={initial?.instructions ?? ""} className="input" placeholder="e.g. ring the side door" maxLength={300} />
      </div>
      <label className="flex items-center gap-2 text-sm text-smoke">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault} className="accent-orange-500" /> Make this my default address
      </label>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save address"}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export const MAX_ADDRESSES = 10;

export function AddressBook({
  selectable = false,
  selectedId,
  onSelect,
}: {
  /** Checkout mode: pick one saved address; editing lives in the account page. */
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (a: Address | null) => void;
}) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getJSON<Address[]>("/api/account/addresses");
    if (res.error) setError(res.error);
    const list = res.data ?? [];
    setAddresses(list);
    if (list.length === 0) setEditing("new");
    return list;
  }, []);

  useEffect(() => {
    load().then((list) => {
      if (selectable && onSelect && !selectedId && list.length) onSelect(list.find((a) => a.isDefault) ?? list[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(a: Address) {
    if (!window.confirm(`Delete ${a.label} address?`)) return;
    const res = await deleteJSON(`/api/account/addresses/${a.id}`);
    if (res.error) return setError(res.error);
    const list = await load();
    if (selectable && selectedId === a.id) onSelect?.(list[0] ?? null);
  }

  if (!addresses) return <p className="text-sm text-smoke">Loading addresses…</p>;

  return (
    <div className="space-y-3">
      <FormError message={error} />
      {addresses.map((a) =>
        editing === a.id ? (
          <AddressForm
            key={a.id}
            initial={a}
            onCancel={() => setEditing(null)}
            onSaved={async (saved) => {
              setEditing(null);
              await load();
              if (selectable) onSelect?.(saved);
            }}
          />
        ) : (
          <div
            key={a.id}
            role={selectable ? "radio" : undefined}
            aria-checked={selectable ? selectedId === a.id : undefined}
            tabIndex={selectable ? 0 : undefined}
            onClick={() => selectable && onSelect?.(a)}
            onKeyDown={(e) => selectable && (e.key === "Enter" || e.key === " ") && onSelect?.(a)}
            className={`flex gap-3 rounded-xl border p-4 transition ${
              selectable ? "cursor-pointer" : ""
            } ${selectable && selectedId === a.id ? "border-flame bg-flame/10" : "border-line bg-coal"}`}
          >
            {selectable ? (
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selectedId === a.id ? "border-flame bg-flame" : "border-smoke/60"}`}>
                {selectedId === a.id && <CheckIcon className="h-3 w-3 text-white" />}
              </span>
            ) : (
              <PinIcon className="mt-0.5 h-5 w-5 shrink-0 text-flame" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                {a.label} {a.isDefault && <span className="ml-1 rounded bg-ash px-1.5 py-0.5 text-[10px] uppercase text-smoke">Default</span>}
              </p>
              <p className="text-smoke">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postcode}
              </p>
              {a.instructions && <p className="text-xs italic text-smoke">{a.instructions}</p>}
            </div>
            {!selectable && (
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <button type="button" className="text-flame-light hover:underline" onClick={(e) => { e.stopPropagation(); setEditing(a.id); }}>Edit</button>
                <button type="button" className="text-smoke hover:text-red-400" onClick={(e) => { e.stopPropagation(); remove(a); }}>Delete</button>
              </div>
            )}
          </div>
        ),
      )}

      {editing === "new" ? (
        <AddressForm
          onCancel={addresses.length ? () => setEditing(null) : undefined}
          onSaved={async (saved) => {
            setEditing(null);
            await load();
            if (selectable) onSelect?.(saved);
          }}
        />
      ) : addresses.length < MAX_ADDRESSES ? (
        <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setEditing("new")}>
          <PlusIcon className="h-4 w-4" /> {addresses.length ? "Add another address" : "Add a new address"}
        </button>
      ) : (
        <p className="text-center text-xs text-smoke">You&apos;ve saved the maximum of {MAX_ADDRESSES} addresses. Delete one to add another.</p>
      )}
      {!selectable && addresses.length > 0 && (
        <p className="text-xs text-smoke">Save up to {MAX_ADDRESSES} addresses (home, work, family…) and pick one at checkout.</p>
      )}
    </div>
  );
}
