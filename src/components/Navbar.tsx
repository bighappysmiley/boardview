"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";
import { Container } from "./layout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/shop", label: "Shop" },
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
    <header className="sticky top-0 z-50 border-b border-black/10 bg-background">
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
            {signedIn ? (
              <ButtonLink href="/account" variant="secondary">
                Classrooms
              </ButtonLink>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[0.95rem] text-muted transition-colors hover:text-foreground sm:block"
                >
                  Log in
                </Link>
                <ButtonLink href="/signup">Get started</ButtonLink>
              </>
            )}
          </div>
        </nav>
      </Container>
    </header>
  );
}
