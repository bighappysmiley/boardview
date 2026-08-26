import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "./layout";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Hardware" },
  { href: "/screen/demo", label: "Screen preview" },
];

export function Footer() {
  return (
    <footer className="mt-8 border-t border-black/10">
      <Container>
        <div className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <Logo />
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-muted"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="mailto:hello@boardview.org"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </a>
          </nav>
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} BoardView
          </p>
        </div>
      </Container>
    </footer>
  );
}
