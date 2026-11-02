
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

type AdminLayoutProps = {
  children: ReactNode;
  user: {
    fullName: string;
    email: string;
    role: "vad_admin" | "vad_technician";
  };
};

export default function AdminLayout({
  children,
  user,
}: Readonly<AdminLayoutProps>) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <Sidebar user={user} />

      <div className="min-h-screen md:pl-[260px]">
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
