import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Happa",
  description: "ミンナに質問してYES/NOで盛り上がるパーティーゲーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="caramellatte">
      <body className="antialiased bg-base-100 text-base-content min-h-screen">
        <header className="navbar bg-base-100 shadow-sm fixed top-0 left-0 w-full z-50">
          <Link
            href="/"
            className="text-4xl font-extrabold tracking-wide italic drop-shadow-lg"
          >
            Happa
          </Link>
        </header>
        <div className="pt-16 pb-20">{children}</div>
        <div className="dock z-50">
          <Link href="/">
            <svg
              className="size-[1.2em]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g
                fill="currentColor"
                strokeLinejoin="miter"
                strokeLinecap="butt"
              >
                <polyline
                  points="1 11 12 2 23 11"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                ></polyline>
                <path
                  d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                ></path>
                <line
                  x1="12"
                  y1="22"
                  x2="12"
                  y2="18"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="square"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                ></line>
              </g>
            </svg>
            <span className="dock-label">Home</span>
          </Link>
        </div>
      </body>
    </html>
  );
}
