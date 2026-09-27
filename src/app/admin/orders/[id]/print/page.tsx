import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { PrintOnLoad } from "./PrintOnLoad";

export const metadata = { title: "Print ticket" };

// Kitchen / delivery ticket sized for 80mm thermal printers (works on A4 too).
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const when = (order.placedAt ?? order.createdAt).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "short", timeStyle: "short" });

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white text-black">
      <style>{`@page { size: 80mm auto; margin: 4mm; } body { background: #fff !important; }`}</style>
      <PrintOnLoad />
      <div className="mx-auto w-[72mm] py-4 font-mono text-[12px] leading-snug">
        <p className="text-center text-base font-bold">FLAME GRILL &amp; CHILL</p>
        <p className="text-center">01905 330095</p>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center text-2xl font-bold">#{order.number}</p>
        <p className="text-center">DELIVERY · {when}</p>
        <p className="text-center font-bold">{order.paymentStatus === "PAID" ? "PAID" : order.paymentStatus}</p>
        <hr className="my-2 border-dashed border-black" />
        {order.items.map((i) => {
          const opts = Array.isArray(i.options) ? (i.options as Array<{ name: string }>).map((o) => o.name) : [];
          return (
            <div key={i.id} className="mb-1.5">
              <div className="flex justify-between font-bold">
                <span>{i.quantity} x {i.name}</span>
                <span>{formatGBP(i.lineTotal)}</span>
              </div>
              {i.variantName && <p className="pl-3">- {i.variantName}</p>}
              {opts.map((o, idx) => <p key={idx} className="pl-3">- {o}</p>)}
              {i.notes && <p className="pl-3 font-bold">** {i.notes}</p>}
            </div>
          );
        })}
        <hr className="my-2 border-dashed border-black" />
        <div className="flex justify-between"><span>Subtotal</span><span>{formatGBP(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatGBP(order.discount)}</span></div>}
        <div className="flex justify-between"><span>Delivery</span><span>{formatGBP(order.deliveryFee)}</span></div>
        {order.serviceFee > 0 && <div className="flex justify-between"><span>Service</span><span>{formatGBP(order.serviceFee)}</span></div>}
        <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>{formatGBP(order.total)}</span></div>
        <hr className="my-2 border-dashed border-black" />
        <p className="font-bold">{order.customerName}</p>
        <p>{order.customerPhone}</p>
        <p>{order.addressLine1}</p>
        {order.addressLine2 && <p>{order.addressLine2}</p>}
        <p>{order.city} {order.postcode}</p>
        {order.deliveryInstructions && <p className="mt-1 font-bold">{order.deliveryInstructions}</p>}
        {order.notes && <p className="mt-1">NOTE: {order.notes}</p>}
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">Thank you!</p>
      </div>
    </div>
  );
}
