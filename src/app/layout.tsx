import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoardView — See the board from anywhere in the room",
  description:
    "BoardView mirrors a classroom whiteboard or poster onto a small screen at a student's desk, so low-vision students never miss what's on the board.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
