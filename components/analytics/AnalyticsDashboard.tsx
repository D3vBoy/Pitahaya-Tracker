"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPieChart,
  FiCheckCircle,
  FiTarget,
  FiAlertTriangle,
  FiCalendar,
  FiActivity,
} from "react-icons/fi";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const TODAY = new Date();
const TODAY_FLOOR = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
const NEXT_WEEK = new Date(TODAY_FLOOR);
NEXT_WEEK.setDate(TODAY_FLOOR.getDate() + 7);

interface Prospect {
  id?: string;
  nombre_cliente?: string | null;
  estatus_general: string;
  probabilidad_cierre: number | null;
  monto_total: number | null;
  apartado_realizado?: boolean;
  proximo_seguimiento?: string | null;
  fecha_cierre?: string | null;
  user_id?: string;
  profiles?: { full_name: string | null } | null;
}

interface Props {
  prospects: Prospect[];
  asesores?: { id: string; full_name: string | null }[];
}

export default function AnalyticsDashboard({ prospects, asesores = [] }: Props) {
  const kpis = useMemo(() => {
    const total = prospects.length;
    const avgProb =
      total > 0
        ? prospects.reduce((acc, p) => acc + (p.probabilidad_cierre || 0), 0) / total
        : 0;
    const totalMonto = prospects.reduce((acc, p) => acc + (p.monto_total || 0), 0);
    const totalApartados = prospects.filter((p) => p.apartado_realizado).length;
    return { total, avgProb, totalMonto, totalApartados };
  }, [prospects]);

  const executive = useMemo(() => {
    const total = prospects.length;
    const cerrados = prospects.filter((p) => p.estatus_general === "Cerrado").length;
    const perdidos = prospects.filter((p) => p.estatus_general === "Perdido").length;
    const activos = prospects.filter((p) => p.estatus_general !== "Cerrado" && p.estatus_general !== "Perdido");

    const apartadosActivos = activos.filter((p) => p.apartado_realizado).length;

    const seguimientosVencidos = activos.filter((p) => {
      if (!p.proximo_seguimiento) return false;
      const fecha = new Date(p.proximo_seguimiento);
      if (Number.isNaN(fecha.getTime())) return false;
      return fecha < TODAY_FLOOR;
    }).length;

    const seguimientosSemana = activos
      .filter((p) => {
        if (!p.proximo_seguimiento) return false;
        const fecha = new Date(p.proximo_seguimiento);
        if (Number.isNaN(fecha.getTime())) return false;
        return fecha >= TODAY_FLOOR && fecha <= NEXT_WEEK;
      })
      .sort((a, b) => {
        const fechaA = new Date(a.proximo_seguimiento || "").getTime();
        const fechaB = new Date(b.proximo_seguimiento || "").getTime();
        return fechaA - fechaB;
      })
      .slice(0, 6);

    const montoPonderado = prospects.reduce((acc, p) => {
      const monto = p.monto_total || 0;
      const prob = (p.probabilidad_cierre || 0) / 100;
      return acc + monto * prob;
    }, 0);

    const montoCerrado = prospects
      .filter((p) => p.estatus_general === "Cerrado")
      .reduce((acc, p) => acc + (p.monto_total || 0), 0);

    const ticketPromedio = total > 0 ? kpis.totalMonto / total : 0;

    const byAsesor: Record<string, { name: string; total: number; weighted: number }> = {};
    prospects.forEach((p) => {
      if (!p.user_id) return;
      const name = p.profiles?.full_name || "Sin nombre";
      if (!byAsesor[p.user_id]) {
        byAsesor[p.user_id] = { name, total: 0, weighted: 0 };
      }
      byAsesor[p.user_id].total += 1;
      byAsesor[p.user_id].weighted += (p.monto_total || 0) * ((p.probabilidad_cierre || 0) / 100);
    });

    const topAsesor = Object.values(byAsesor).sort((a, b) => b.weighted - a.weighted)[0] || null;

    return {
      total,
      cerrados,
      perdidos,
      activos: activos.length,
      apartadosActivos,
      seguimientosVencidos,
      seguimientosSemana,
      montoPonderado,
      montoCerrado,
      ticketPromedio,
      tasaCierre: total > 0 ? (cerrados / total) * 100 : 0,
      tasaPerdida: total > 0 ? (perdidos / total) * 100 : 0,
      topAsesor,
    };
  }, [prospects, kpis.totalMonto]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    prospects.forEach((p) => {
      const status = p.estatus_general || "Sin definir";
      counts[status] = (counts[status] || 0) + 1;
    });
    return {
      labels: Object.keys(counts),
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: ["#FF2D78", "#00E5A0", "#FFB830", "#B828E8", "#1A1030"],
          borderColor: "#0A0E1A",
          borderWidth: 3,
        },
      ],
    };
  }, [prospects]);

  const asesorCountData = useMemo(() => {
    if (!asesores.length) return null;
    const counts: Record<string, number> = {};
    prospects.forEach((p) => {
      if (!p.user_id) return;
      counts[p.user_id] = (counts[p.user_id] || 0) + 1;
    });
    return {
      labels: asesores.map((a) => a.full_name || "Sin nombre"),
      datasets: [
        {
          label: "Prospectos asignados",
          data: asesores.map((a) => counts[a.id] || 0),
          backgroundColor: "#FF2D78",
          borderRadius: 8,
        },
      ],
    };
  }, [prospects, asesores]);

  const asesorProbData = useMemo(() => {
    if (!asesores.length) return null;
    const probs: Record<string, { total: number; count: number }> = {};
    prospects.forEach((p) => {
      if (!p.user_id) return;
      if (!probs[p.user_id]) probs[p.user_id] = { total: 0, count: 0 };
      probs[p.user_id].total += p.probabilidad_cierre || 0;
      probs[p.user_id].count++;
    });
    return {
      labels: asesores.map((a) => a.full_name || "Sin nombre"),
      datasets: [
        {
          label: "Probabilidad promedio (%)",
          data: asesores.map((a) =>
            probs[a.id]?.count ? probs[a.id].total / probs[a.id].count : 0
          ),
          backgroundColor: "#00E5A0",
          borderRadius: 8,
        },
      ],
    };
  }, [prospects, asesores]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#D1D5DB" } } },
    scales: {
      x: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(124,58,237,0.1)" } },
      y: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(124,58,237,0.1)" } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { color: "#D1D5DB" } } },
  };

  const formatMoney = (value: number) =>
    value.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

  return (
    <div id="analytics-export-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total prospectos", value: kpis.total, icon: <FiPieChart />, color: "text-pitahaya-accent-light" },
            { label: "Prob. cierre prom.", value: `${kpis.avgProb.toFixed(1)}%`, icon: <FiTrendingUp />, color: "text-pitahaya-green" },
            { label: "Monto total pipeline", value: formatMoney(kpis.totalMonto), icon: <FiDollarSign />, color: "text-pitahaya-yellow" },
            { label: "Apartados realizados", value: kpis.totalApartados, icon: <FiCheckCircle />, color: "text-pitahaya-coral" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="premium-panel flex min-h-33 items-center gap-4 rounded-3xl p-5 shadow-glass"
            >
              <div className={`text-3xl ${kpi.color}`}>{kpi.icon}</div>
              <div>
                <p className="text-pitahaya-gray-300 text-sm">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Tasa de cierre",
              value: `${executive.tasaCierre.toFixed(1)}%`,
              helper: `${executive.cerrados} de ${executive.total} prospectos`,
              icon: <FiTarget />,
              tone: "text-emerald-300",
            },
            {
              label: "Pipeline ponderado",
              value: formatMoney(executive.montoPonderado),
              helper: "Monto ajustado por probabilidad",
              icon: <FiActivity />,
              tone: "text-cyan-300",
            },
            {
              label: "Apartados activos",
              value: executive.apartadosActivos,
              helper: "Apartados pendientes de cierre",
              icon: <FiCheckCircle />,
              tone: "text-amber-300",
            },
            {
              label: "Seguimientos vencidos",
              value: executive.seguimientosVencidos,
              helper: "Clientes activos sin seguimiento al dia",
              icon: <FiAlertTriangle />,
              tone: "text-rose-300",
            },
          ].map((metric) => (
            <div key={metric.label} className="premium-panel flex min-h-31 flex-col justify-between rounded-3xl p-5 shadow-glass">
              <div className={`text-xl ${metric.tone}`}>{metric.icon}</div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-pitahaya-gray-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{metric.value}</p>
                <p className="mt-1 text-xs text-pitahaya-gray-500">{metric.helper}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="premium-panel rounded-3xl p-6 shadow-glass">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">Resumen ejecutivo de seguimiento</h3>
            {executive.topAsesor && (
              <p className="rounded-full border border-pitahaya-border px-3 py-1 text-xs text-pitahaya-gray-300">
                Top asesor por pipeline ponderado: <span className="font-semibold text-white">{executive.topAsesor.name}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-pitahaya-border bg-pitahaya-surface/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-pitahaya-gray-500">Monto cerrado</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatMoney(executive.montoCerrado)}</p>
              <p className="mt-1 text-xs text-pitahaya-gray-500">Volumen total en estatus cerrado</p>
            </div>
            <div className="rounded-xl border border-pitahaya-border bg-pitahaya-surface/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-pitahaya-gray-500">Ticket promedio</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatMoney(executive.ticketPromedio)}</p>
              <p className="mt-1 text-xs text-pitahaya-gray-500">Valor promedio por oportunidad</p>
            </div>
            <div className="rounded-xl border border-pitahaya-border bg-pitahaya-surface/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-pitahaya-gray-500">Tasa de perdida</p>
              <p className="mt-2 text-2xl font-bold text-white">{executive.tasaPerdida.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-pitahaya-gray-500">Prospectos en estatus perdido</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-pitahaya-border bg-pitahaya-surface/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-pitahaya-gray-300">
              <FiCalendar />
              <p className="text-sm font-semibold">Proximos seguimientos (7 dias)</p>
            </div>
            {executive.seguimientosSemana.length === 0 ? (
              <p className="text-sm text-pitahaya-gray-500">No hay seguimientos programados para la proxima semana.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {executive.seguimientosSemana.map((p) => (
                  <div key={p.id} className="rounded-lg border border-pitahaya-border/70 bg-black/20 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-white">{p.nombre_cliente || "Cliente sin nombre"}</p>
                    <p className="mt-0.5 text-xs text-pitahaya-gray-500">{p.proximo_seguimiento ? new Date(p.proximo_seguimiento).toLocaleDateString("es-MX") : "Sin fecha"}</p>
                    <p className="mt-1 text-xs text-pitahaya-gray-300">Probabilidad: {p.probabilidad_cierre ?? 0}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-panel h-105 rounded-3xl p-6 shadow-glass">
            <h3 className="text-lg font-semibold text-white mb-4">Distribución por estatus</h3>
            {prospects.length > 0 ? (
              <div className="h-80">
                <Doughnut data={statusData} options={doughnutOptions} />
              </div>
            ) : (
              <p className="text-pitahaya-gray-500 text-center py-10">Sin datos para mostrar</p>
            )}
          </div>
          <div className="premium-panel h-105 rounded-3xl p-6 shadow-glass">
            <h3 className="text-lg font-semibold text-white mb-4">Prospectos por asesor</h3>
            {asesorCountData ? (
              <div className="h-80">
                <Bar data={asesorCountData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-pitahaya-gray-500 text-center py-10">No hay asesores registrados</p>
            )}
          </div>
        </div>

        <div className="premium-panel h-108 rounded-3xl p-6 shadow-glass">
          <h3 className="text-lg font-semibold text-white mb-4">Probabilidad de cierre promedio por asesor</h3>
          {asesorProbData ? (
            <div className="h-82">
              <Bar data={asesorProbData} options={{ ...chartOptions, indexAxis: "y" as const }} />
            </div>
          ) : (
            <p className="text-pitahaya-gray-500 text-center py-10">No hay asesores registrados</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}