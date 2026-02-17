"use client";

export default function Home() {
  return (
    <>
    {/* <button className="btn btn-primary">Click me</button>
    <button className="btn btn-secondary">Click me</button>
    <button className="btn btn-accent">Click me</button> */}

      <div className="navbar bg-base-100 shadow-sm">
          <a className="text-4xl font-extrabold font-serif tracking-wide italic drop-shadow-lg">Happa</a>
      </div>
      <img src="/Happalogo.png" alt="logo" className="pt-20 p-2" />
      
      <div className="flex flex-col items-center justify-center">
        <button
          className="btn btn-accent mt-5 w-1/2 max-w-xs"
          onClick={() =>
            (document.getElementById("create_room_modal") as HTMLDialogElement)?.showModal()
          }
        >
          ルームを作成
        </button>
        <button className="btn btn-accent mt-5 w-1/2 max-w-xs">ルームに入室</button>

        <dialog id="create_room_modal" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">ルームを作成</h3>
            <p className="py-2">部屋番号を入力してください</p>
            <form method="dialog" className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="部屋番号"
                className="input input-bordered w-full"
              />
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    (document.getElementById("create_room_modal") as HTMLDialogElement)?.close()
                  }
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-accent">
                  作成
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>
    </>
  );

}