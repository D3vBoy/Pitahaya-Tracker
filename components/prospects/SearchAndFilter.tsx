"use client";
import { motion } from "framer-motion";
import { FiSearch } from "react-icons/fi";
import Input from "@/components/ui/Input";

interface Asesor {
  id: string;
  full_name: string | null;
}

interface Filters {
  search: string;
  estatus: string;
  probabilidadMin: number | "";
  asesorId: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  showAsesorFilter?: boolean;
  asesores?: Asesor[];
}

export default function SearchAndFilter({
  filters,
  onChange,
  showAsesorFilter = false,
  asesores = [],
}: Props) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    onChange({
      ...filters,
      [name]: name === "probabilidadMin" ? (value === "" ? "" : parseInt(value)) : value,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-4 rounded-xl shadow-neumorph flex flex-wrap gap-4 items-end"
    >
      <div className="flex-1 min-w-50">
        <Input
          label="Buscar cliente"
          name="search"
          icon={<FiSearch />}
          value={filters.search}
          onChange={handleChange}
          placeholder="Nombre del cliente..."
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Estatus</label>
        <select
          name="estatus"
          value={filters.estatus}
          onChange={handleChange}
          className="w-full bg-white dark:bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-pitahaya-light-text dark:text-white focus:outline-none focus:border-pitahaya-accent min-w-35"
        >
          <option value="">Todos</option>
          <option value="Nuevo">Nuevo</option>
          <option value="En seguimiento">En seguimiento</option>
          <option value="Negociación">Negociación</option>
          <option value="Cerrado">Cerrado</option>
          <option value="Perdido">Perdido</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Prob. mínima</label>
        <select
          name="probabilidadMin"
          value={filters.probabilidadMin}
          onChange={handleChange}
          className="w-full bg-white dark:bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-pitahaya-light-text dark:text-white focus:outline-none focus:border-pitahaya-accent min-w-30"
        >
          <option value="">Cualquiera</option>
          <option value="25">≥ 25%</option>
          <option value="50">≥ 50%</option>
          <option value="75">≥ 75%</option>
        </select>
      </div>
      {showAsesorFilter && (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-pitahaya-light-secondary dark:text-pitahaya-gray-300">Asesor</label>
          <select
            name="asesorId"
            value={filters.asesorId}
            onChange={handleChange}
            className="w-full bg-white dark:bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-pitahaya-light-text dark:text-white focus:outline-none focus:border-pitahaya-accent min-w-40"
          >
            <option value="">Todos los asesores</option>
            {asesores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name || "Sin nombre"}
              </option>
            ))}
          </select>
        </div>
      )}
    </motion.div>
  );
}