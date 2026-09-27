import type { Metadata } from "next";
import { AddressBook } from "@/components/AddressBook";

export const metadata: Metadata = { title: "Addresses" };

export default function AddressesPage() {
  return (
    <div className="card p-6">
      <h2 className="mb-4 font-display text-2xl uppercase">Delivery addresses</h2>
      <AddressBook />
    </div>
  );
}
