"use client";

import Link from "next/link";

export default function WaitingPage() {
  return (
    <>
      <div className="navbar bg-base-100 shadow-sm">
        <Link href="/" className="text-4xl font-extrabold font-serif tracking-wide italic drop-shadow-lg">
          Happa
        </Link>
      </div>
      <main className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <h1 className="text-2xl font-bold mb-4">待機中</h1>
        <p className="text-base-content/70 mb-8">他のプレイヤーを待っています...</p>
        <div className="flex flex-col gap-2 w-full max-w-xs items-center justify-center">
          <div className="badge badge-lg badge-accent">null 人が参加中...</div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button className="btn btn-outline mt-5 w-1/2 max-w-xs">退出</button>
          <button className="btn btn-accent mt-5 w-1/2 max-w-xs">開始</button>
        </div>
      </main>
    </>
  );
}
