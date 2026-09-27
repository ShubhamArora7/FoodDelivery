import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="New password" subtitle="Choose a new password for your account">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
