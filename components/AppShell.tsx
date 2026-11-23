"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Company profile" },
  { href: "/clients", label: "Clients" },
  { href: "/quotations", label: "Quotations" },
  { href: "/invoices", label: "Invoices" },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ companyName, children }: { companyName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  const linkClass = (href: string, mobile = false) => {
    const on = active(pathname, href);
    if (mobile) {
      return `shrink-0 rounded-full px-3 py-1.5 text-sm ${on ? "bg-white text-ink" : "text-stone-200"}`;
    }
    return `rounded-lg px-3 py-2 text-sm ${on ? "bg-white/10 text-white shadow-[inset_3px_0_0_#a68456]" : "text-stone-300 hover:bg-white/5 hover:text-white"}`;
  };

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-stone-100 md:flex">
        <div className="px-6 pb-5 pt-7">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Quotations</p>
          <p className="mt-2 font-serif text-[1.7rem] leading-tight text-white">{companyName || "Your company"}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <Link href="/settings" className={`mt-auto mb-2 ${linkClass("/settings")}`}>
            Settings
          </Link>
        </nav>
        <p className="px-6 pb-5 text-xs text-stone-400">Saved on this computer</p>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="no-print flex gap-2 overflow-x-auto border-b border-white/10 bg-sidebar px-3 py-3 md:hidden">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href, true)}>
              {link.label}
            </Link>
          ))}
          <Link href="/settings" className={linkClass("/settings", true)}>
            Settings
          </Link>
        </div>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
