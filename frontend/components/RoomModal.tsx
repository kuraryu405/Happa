"use client";

type RoomModalProps = {
  id: string;
  title: string;
  submitLabel: string;
  placeholder?: string;
  triggerLabel: string;
  triggerClassName?: string;
};

export default function RoomModal({
  id,
  title,
  submitLabel,
  placeholder = "合言葉",
  triggerLabel,
  triggerClassName = "btn btn-accent mt-5 w-1/2 max-w-xs",
}: RoomModalProps) {
  const openModal = () =>
    (document.getElementById(id) as HTMLDialogElement)?.showModal();
  const closeModal = () =>
    (document.getElementById(id) as HTMLDialogElement)?.close();

  return (
    <>
      <button className={triggerClassName} onClick={openModal}>
        {triggerLabel}
      </button>
      <dialog id={id} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="py-2">ニックネームと合言葉を入力してください</p>
          <form method="dialog" className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="ニックネーム"
              className="input input-bordered w-full"
            />
            <input
              type="text"
              placeholder={placeholder}
              className="input input-bordered w-full"
            />
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                キャンセル
              </button>
              <button type="submit" className="btn btn-accent">
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
