"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";
import { Container } from "./layout";
import { useSession } from "@/lib/useSession";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/request", label: "Request" },
];

export function Navbar() {
  const { user, isAdmin, isStaff } = useSession();
  const signedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white/80 backdrop-blur-md">
      <Container>
        <nav aria-label="Primary" className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="shrink-0 rounded-md py-1">
            <Logo />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[0.95rem] text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {isSupabaseConfigured && signedIn ? (
              <>
                {(isAdmin || isStaff) && (
                  <Link
                    href="/admin"
                    className="hidden text-[0.95rem] text-muted hover:text-foreground sm:block"
                  >
                    {isAdmin ? "Admin" : "Inbox"}
                  </Link>
                )}
                <ButtonLink href="/account" variant="secondary">
                  Classrooms
                </ButtonLink>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[0.95rem] text-muted transition-colors hover:text-foreground sm:block"
                >
                  Log in
                </Link>
                <ButtonLink href="/signup">Sign up</ButtonLink>
              </>
            )}
          </div>
        </nav>
      </Container>
    </header>
  );
}
