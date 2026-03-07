import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/app/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=%2Fdashboard");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
