"use client";

type ResultPageProps = {
  resultData: { yes: number; no: number; total: number; percent: number } | null;
  question: string;
};

export default function ResultPage({ resultData, question }: ResultPageProps) {
  return (
    <>
      <main className="flex flex-col items-center w-full max-w-2xl mx-auto pt-16 px-8">
        <div className="chat chat-start w-full">
          <div className="chat-bubble text-2xl px-8 py-6">
            {question || "質問を所得できませんでした。"}
          </div>
        </div>
        <div className="w-full pt-10">
          <div className="skeleton h-32 w-full rounded-xl flex items-center justify-center gap-5">
            <div className="flex-1 flex justify-center">
              <div
                className="radial-progress"
                style={{ "--value": resultData?.percent ?? 0 } as React.CSSProperties}
                aria-valuenow={resultData?.percent ?? 0}
                role="progressbar"
              >
                {resultData?.percent ?? 0}%
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <p className="text-2xl font-bold">YES: {resultData?.yes ?? 0}人</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}