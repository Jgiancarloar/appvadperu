
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <Sidebar />

      <div className="min-h-screen md:pl-[260px]">
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
