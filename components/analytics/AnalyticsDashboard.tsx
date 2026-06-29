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
} from "react-icons/fi";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Prospect {
  id: string;
  estatus_general: string;
  probabilidad_cierre: number | null;
  monto_total: number | null;
  apartado_realizado: boolean;
  user_id: string;
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
    plugins: { legend: { labels: { color: "#D1D5DB" } } },
    scales: {
      x: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(124,58,237,0.1)" } },
      y: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(124,58,237,0.1)" } },
    },
  };

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
            { label: "Monto total pipeline", value: `$${kpis.totalMonto.toLocaleString()}`, icon: <FiDollarSign />, color: "text-pitahaya-yellow" },
            { label: "Apartados realizados", value: kpis.totalApartados, icon: <FiCheckCircle />, color: "text-pitahaya-coral" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-5 rounded-xl shadow-neumorph flex items-center gap-4"
            >
              <div className={`text-3xl ${kpi.color}`}>{kpi.icon}</div>
              <div>
                <p className="text-pitahaya-gray-300 text-sm">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-xl shadow-neumorph">
            <h3 className="text-lg font-semibold text-white mb-4">Distribución por estatus</h3>
            {prospects.length > 0 ? (
              <Doughnut data={statusData} options={{ plugins: { legend: { labels: { color: "#D1D5DB" } } }}} />
            ) : (
              <p className="text-pitahaya-gray-500 text-center py-10">Sin datos para mostrar</p>
            )}
          </div>
          <div className="glass p-6 rounded-xl shadow-neumorph">
            <h3 className="text-lg font-semibold text-white mb-4">Prospectos por asesor</h3>
            {asesorCountData ? (
              <Bar data={asesorCountData} options={chartOptions} />
            ) : (
              <p className="text-pitahaya-gray-500 text-center py-10">No hay asesores registrados</p>
            )}
          </div>
        </div>

        <div className="glass p-6 rounded-xl shadow-neumorph">
          <h3 className="text-lg font-semibold text-white mb-4">Probabilidad de cierre promedio por asesor</h3>
          {asesorProbData ? (
            <Bar data={asesorProbData} options={{ ...chartOptions, indexAxis: "y" as const }} />
          ) : (
            <p className="text-pitahaya-gray-500 text-center py-10">No hay asesores registrados</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}