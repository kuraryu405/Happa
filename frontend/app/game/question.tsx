export default function QuestionPage() {
  return (
    <>
        {/* 質問設定 */}
  <div className="mx-auto w-full h-auto pt-16 p-4 flex flex-col gap-2">
  <textarea className="textarea textarea-accent textarea-lg w-full border border-base-300" />
  <div className="w-full h-auto flex justify-end gap-2">
    <button className="btn btn-accent">AIで生成</button>
    <button className="btn btn-accent">質問する！</button>
  </div>
</div>
    </>
  );
}
