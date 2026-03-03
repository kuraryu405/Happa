"use client";


export default function AnswerPage() {
  return (
    <>
      {/* <div className="navbar bg-base-100 shadow-sm">
        <Link href="/" className="text-4xl font-extrabold font-serif tracking-wide italic drop-shadow-lg">
          Happa
        </Link>
      </div> */}
      <main className="flex flex-col items-center w-auto h-auto pt-16 p-8">
        <div className="chat chat-start">
          <div className="chat-bubble text-2xl px-8 py-6">
            claudeはくらうで、codexはこでこでと呼ぶべきである。
          </div>
        </div>
        <div className="flex items-center gap-8 pt-20">
          <button className="btn btn-outline text-2xl px-10 py-5 min-w-[120px]">NO</button>
          <button className="btn btn-accent text-2xl px-10 py-5 min-w-[120px]">YES</button>
        </div>
      </main>
    </>
  );
}
