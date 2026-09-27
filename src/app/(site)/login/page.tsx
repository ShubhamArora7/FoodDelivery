import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to order and track your food">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
