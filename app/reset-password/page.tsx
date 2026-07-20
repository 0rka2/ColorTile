import { AccountShell } from "@/app/account/components/account-shell";
import { AuthCard } from "@/app/account/components/auth-card";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<ResetPasswordPageProps>) {
  const { token } = await searchParams;

  return (
    <AccountShell>
      <AuthCard mode="reset-password" resetToken={token} />
    </AccountShell>
  );
}
