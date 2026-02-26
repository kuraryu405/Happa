"use client";



export default function GamePage() {

  return (
    <>
      <main className="flex flex-col items-center w-full max-w-2xl mx-auto pt-16 px-8">
        <div className="chat chat-start w-full">
          <div className="chat-bubble text-2xl px-8 py-6">
            claudeはくらうで、codexはこでこでと呼ぶべきである。
          </div>
        </div>
        <div className="w-full pt-10">
          <div className="skeleton h-32 w-full rounded-xl flex items-center justify-center gap-5">
            <div className="flex-1 flex justify-center">
              <div
                className="radial-progress"
                style={{ "--value": 70 } as React.CSSProperties}
                aria-valuenow={70}
                role="progressbar"
              >
                70%
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <p className="text-2xl font-bold">YES: null人</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
