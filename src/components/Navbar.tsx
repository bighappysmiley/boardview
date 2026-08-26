"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";
import { Container } from "./layout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#multi-camera", label: "Multiple cameras" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSignedIn(Boolean(session))
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 pt-4">
      <Container>
        <nav
          aria-label="Primary"
          className="glass-panel flex items-center justify-between gap-4 rounded-2xl py-2.5 pl-5 pr-2.5"
        >
          <Link href="/" className="shrink-0 rounded-lg py-1">
            <Logo />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[0.95rem] font-medium text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {signedIn ? (
              <ButtonLink href="/account" variant="secondary">
                My classrooms
              </ButtonLink>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-2 text-[0.95rem] font-medium text-muted transition-colors hover:text-foreground sm:block"
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
