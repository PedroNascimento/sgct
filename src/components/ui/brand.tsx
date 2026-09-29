import Link from "next/link";
import { BusIcon } from "./icons";

interface BrandProps {
  href?: string;
  context?: string;
  compact?: boolean;
}

export function Brand({ href = "/", context, compact = false }: BrandProps) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-12 items-center gap-3 rounded-md text-left no-underline"
      aria-label={context ? `SGCT — ${context}` : "SGCT — Caravanas ao Templo"}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition group-hover:bg-brand-700">
        <BusIcon className="h-6 w-6" />
      </span>
      <span className={compact ? "hidden sm:block" : "block"}>
        <span className="block text-lg font-bold leading-none tracking-[-0.02em] text-[#212225]">
          SGCT
        </span>
        <span className="mt-1 block text-xs font-semibold leading-none text-[#53575b]">
          {context ?? "Caravanas ao Templo"}
        </span>
      </span>
    </Link>
  );
}
