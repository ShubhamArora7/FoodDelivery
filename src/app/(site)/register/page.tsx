import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" subtitle="Save your addresses and track your orders">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
