import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#samples", label: "Demo" },
  { href: "/#docs", label: "Docs" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>TrueFrame</span>
        </Link>
        <nav className="flex items-center gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/demo"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "shadow-sm"
            )}
          >
            Upload
          </Link>
        </nav>
      </div>
    </header>
  );
}
