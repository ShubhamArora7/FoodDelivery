"use client";

import { MinusIcon, PlusIcon, TrashIcon } from "./Icons";

export function QtyStepper({
  value,
  onChange,
  small = false,
  allowZero = false,
  max = 50,
}: {
  value: number;
  onChange: (v: number) => void;
  small?: boolean;
  allowZero?: boolean;
  max?: number;
}) {
  const size = small ? "h-7 w-7" : "h-10 w-10";
  const min = allowZero ? 0 : 1;
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-coal">
      <button
        type="button"
        className={`${size} flex items-center justify-center rounded-l-lg hover:bg-ash disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={allowZero && value === 1 ? "Remove" : "Decrease quantity"}
      >
        {allowZero && value === 1 ? <TrashIcon className="h-4 w-4 text-red-400" /> : <MinusIcon className="h-4 w-4" />}
      </button>
      <span className={`${small ? "w-7 text-sm" : "w-10"} text-center font-semibold tabular-nums`}>{value}</span>
      <button
        type="button"
        className={`${size} flex items-center justify-center rounded-r-lg hover:bg-ash disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
