import Link from "next/link";

export default function NotFound() {
  return (
    <div className="embers flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-bold text-flame">404</p>
      <h1 className="mt-2 font-display text-3xl uppercase">Page not found</h1>
      <p className="mt-2 text-smoke">That page has gone up in smoke.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-ghost">Home</Link>
        <Link href="/menu" className="btn-primary">See the menu</Link>
      </div>
    </div>
  );
}
