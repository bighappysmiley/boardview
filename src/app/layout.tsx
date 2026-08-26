import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoardView — The board, at their desk",
  description:
    "BoardView puts the classroom board on a small screen on the student's desk, so students who can't see the board never miss what's written.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
