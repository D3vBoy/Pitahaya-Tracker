interface Props {
  titulo: string;
  valor: string | number;
  glowColor?: string;
  textAccent?: string;
}

export default function KPICard({
  titulo,
  valor,
  glowColor = "",
  textAccent = "text-white",
}: Props) {
  return (
    <div className="relative overflow-hidden bg-[#1E0324]/85 backdrop-blur-md border border-[#39065E] rounded-2xl p-6 shadow-xl flex flex-col justify-center w-full min-h-[132px]">
      {glowColor && (
        <div
          className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl ${glowColor} pointer-events-none`}
        />
      )}
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 z-10">
        {titulo}
      </span>
      <span className={`text-3xl font-black ${textAccent} tracking-tight z-10`}>
        {valor}
      </span>
    </div>
  );
}
