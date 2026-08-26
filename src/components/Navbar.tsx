import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <nav
          aria-label="Primary"
          className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6"
        >
          <Link href="/" className="rounded-lg">
            <Logo />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[0.95rem] font-medium text-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-[0.95rem] font-medium text-muted hover:text-foreground sm:block"
            >
              Log in
            </Link>
            <ButtonLink href="/signup" className="!px-5 !py-2 text-[0.95rem]">
              Sign up
            </ButtonLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
