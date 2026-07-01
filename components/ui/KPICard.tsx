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
    <div className="theme-kpi-shell relative flex min-h-[132px] w-full flex-col justify-center overflow-hidden rounded-2xl p-6 backdrop-blur-md">
      {glowColor && (
        <div
          className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl ${glowColor} pointer-events-none`}
        />
      )}
      <span className="theme-text-secondary z-10 mb-2 text-[11px] font-bold uppercase tracking-widest">
        {titulo}
      </span>
      <span className={`theme-text-primary z-10 text-3xl font-black tracking-tight ${textAccent}`}>
        {valor}
      </span>
    </div>
  );
}
