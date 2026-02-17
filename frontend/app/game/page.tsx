"use client";

import Link from "next/link";

export default function GamePage() {
  return (
    <>
      <div className="navbar bg-base-100 shadow-sm">
        <Link href="/" className="text-4xl font-extrabold font-serif tracking-wide italic drop-shadow-lg">
          Happa
        </Link>
      </div>
      <main className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <div className="chat chat-start">
          <div className="chat-bubble">
            It's over Anakin,
            <br />
            I have the high ground.
          </div>
        </div>
        <div className="chat chat-end">
          <div className="chat-bubble">You underestimate my power!</div>
        </div>
      </main>
    </>
  );
}
