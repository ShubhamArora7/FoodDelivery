"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The site only sets strictly necessary cookies (login session, cart, and
// Stripe's fraud-prevention cookies at checkout), which don't need consent under
// PECR, so this is an information notice rather than an opt-in. If you add
// analytics or marketing pixels later, change this to a real consent prompt.
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem("fgc-cookie-notice") !== "1");
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-line bg-ember/95 p-4 text-sm shadow-2xl backdrop-blur md:inset-x-auto md:right-4">
      <p className="text-smoke">
        We only use essential cookies to keep you signed in, remember your cart and take payments securely.{" "}
        <Link href="/legal/cookies" className="text-flame-light underline">Learn more</Link>
      </p>
      <div className="mt-3 flex justify-end">
        <button
          className="btn-primary !py-1.5"
          onClick={() => {
            try {
              localStorage.setItem("fgc-cookie-notice", "1");
            } catch {}
            setShow(false);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
