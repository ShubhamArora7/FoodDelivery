import Image from "next/image";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="embers flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-7 shadow-2xl">
        <Image src="/images/logo.png" alt="Flame Grill & Chill" width={140} height={136} className="mx-auto mb-3 h-28 w-auto" />
        <h1 className="text-center font-display text-3xl font-bold uppercase">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-smoke">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{message}</p>;
}
