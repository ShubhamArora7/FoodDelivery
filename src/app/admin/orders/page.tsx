import { Suspense } from "react";
import { OrdersBoard } from "./OrdersBoard";

export const metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersBoard />
    </Suspense>
  );
}
