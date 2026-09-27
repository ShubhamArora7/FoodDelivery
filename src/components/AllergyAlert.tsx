"use client";

import { useCallback, useState } from "react";
import { ALLERGY_NOTICE } from "@/lib/copy";

const KEY = "fgc-allergy-ack";

function hasAcked(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function saveAck() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
}

export function AllergyDialog({
  onAccept,
  onCancel,
  acceptLabel = "I understand",
}: {
  onAccept: () => void;
  onCancel: () => void;
  acceptLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal aria-labelledby="allergy-title" aria-describedby="allergy-text">
      <div className="absolute inset-0 bg-black/75" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-amber-600/60 bg-coal p-6 shadow-2xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-2xl font-bold text-amber-300" aria-hidden>
          !
        </div>
        <h2 id="allergy-title" className="font-display text-2xl uppercase">Allergies &amp; dietary requirements</h2>
        <p id="allergy-text" className="mt-2 text-cream">{ALLERGY_NOTICE}</p>
        <p className="mt-3 text-sm text-smoke">
          Call us on{" "}
          <a href="tel:01905330095" className="font-semibold text-flame-light underline">01905 330095</a>{" "}
          or add a note to your order.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-primary flex-1 !py-3" onClick={onAccept} autoFocus>{acceptLabel}</button>
          <button className="btn-ghost !py-3" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shows the allergy alert the first time a customer picks an item in a visit.
 * Usage: const { gate, dialog } = useAllergyGate(); gate(() => openItem()); render {dialog}.
 */
export function useAllergyGate() {
  const [pending, setPending] = useState<null | (() => void)>(null);

  const gate = useCallback((fn: () => void) => {
    if (hasAcked()) fn();
    else setPending(() => fn);
  }, []);

  const dialog = pending ? (
    <AllergyDialog
      onAccept={() => {
        saveAck();
        const fn = pending;
        setPending(null);
        fn();
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  return { gate, dialog };
}
