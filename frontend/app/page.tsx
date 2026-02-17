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
        <button className="btn btn-accent mt-5 w-1/2 max-w-xs">ルームを作成</button>
        <button className="btn btn-accent mt-5 w-1/2 max-w-xs">ルームに入室</button>
      </div>
    </>
  );

}