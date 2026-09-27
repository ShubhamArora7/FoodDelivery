// "Also order on…" links to the shop's pages on the delivery apps it uses.
// Names only (no copied logos). Links are set in Admin -> Settings.
export type AppLinks = { uberEatsUrl: string; justEatUrl: string; foodhubUrl: string };

export function appList(l: AppLinks) {
  return [
    { name: "Uber Eats", href: l.uberEatsUrl || "https://www.ubereats.com/gb", className: "bg-black text-[#06c167] border-[#06c167]/60" },
    { name: "Just Eat", href: l.justEatUrl || "https://www.just-eat.co.uk", className: "bg-[#ff8000] text-white border-[#ff8000]" },
    { name: "Foodhub", href: l.foodhubUrl || "https://foodhub.co.uk", className: "bg-[#e3262f] text-white border-[#e3262f]" },
  ];
}

export function DeliveryAppButtons({ links, small = false }: { links: AppLinks; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {appList(links).map((a) => (
        <a
          key={a.name}
          href={a.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center rounded-lg border font-bold transition hover:brightness-110 ${a.className} ${small ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-base"}`}
        >
          {a.name}
        </a>
      ))}
    </div>
  );
}
