import { AccountShell } from "@/app/account/components/account-shell";
import { AuthCard } from "@/app/account/components/auth-card";

export default function ForgotPasswordPage() {
  return (
    <AccountShell>
      <AuthCard mode="forgot-password" />
    </AccountShell>
  );
}
