import type { Metadata } from "next";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = { title: "Admin" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
