"use client";
import { useState, useEffect } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface ProspectData {
  id?: string;
  user_id?: string | null;
  nombre_cliente: string;
  fecha_primer_contacto: string;
  fecha_primer_zoom: string;
  fecha_segundo_zoom: string;
  metros_cuadrados_tentativos: number | "";
  monto_total: number | "";
  plan_financiamiento: string;
  estatus_enganche: string;
  estatus_general: string;
  proxima_accion: string;
  proximo_seguimiento: string;
  probabilidad_cierre: number | "";
  apartado_realizado: boolean;
  fecha_apartado: string;
  monto_apartado: number | "";
  fecha_enganche: string;
  firma_pcv: string;
  fecha_cierre: string;
  observaciones: string;
}

type ProspectNullableData = {
  [K in keyof ProspectData]: ProspectData[K] | null;
};

interface Props {
  prospect?: Partial<ProspectNullableData> | null;
  onClose: () => void;
  onSuccess: () => void;
  isGerenta?: boolean;
}

export default function ProspectForm({
  prospect,
  onClose,
  onSuccess,
  isGerenta = false,
}: Props) {
  const supabase = createClientSupabase();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [asesorId, setAsesorId] = useState<string>("");
  const [asesores, setAsesores] = useState<
    { id: string; full_name: string | null }[]
  >([]);

  const [form, setForm] = useState<ProspectData>({
    nombre_cliente: "",
    fecha_primer_contacto: "",
    fecha_primer_zoom: "",
    fecha_segundo_zoom: "",
    metros_cuadrados_tentativos: "",
    monto_total: "",
    plan_financiamiento: "contado",
    estatus_enganche: "pendiente",
    estatus_general: "Nuevo",
    proxima_accion: "",
    proximo_seguimiento: "",
    probabilidad_cierre: "",
    apartado_realizado: false,
    fecha_apartado: "",
    monto_apartado: "",
    fecha_enganche: "",
    firma_pcv: "",
    fecha_cierre: "",
    observaciones: "",
  });

  useEffect(() => {
    if (isGerenta) {
      const fetchAsesores = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "asesor");
        setAsesores(data || []);
      };
      fetchAsesores();
    }
  }, [isGerenta]);

  useEffect(() => {
    if (prospect) {
      setForm((prev) => ({
        ...prev,
        nombre_cliente: prospect.nombre_cliente ?? "",
        fecha_primer_contacto: prospect.fecha_primer_contacto ?? "",
        fecha_primer_zoom: prospect.fecha_primer_zoom ?? "",
        fecha_segundo_zoom: prospect.fecha_segundo_zoom ?? "",
        metros_cuadrados_tentativos:
          prospect.metros_cuadrados_tentativos ?? "",
        monto_total: prospect.monto_total ?? "",
        plan_financiamiento: prospect.plan_financiamiento ?? "contado",
        estatus_enganche: prospect.estatus_enganche ?? "pendiente",
        estatus_general: prospect.estatus_general ?? "Nuevo",
        proxima_accion: prospect.proxima_accion ?? "",
        proximo_seguimiento: prospect.proximo_seguimiento ?? "",
        probabilidad_cierre: prospect.probabilidad_cierre ?? "",
        apartado_realizado: prospect.apartado_realizado ?? false,
        fecha_apartado: prospect.fecha_apartado ?? "",
        monto_apartado: prospect.monto_apartado ?? "",
        fecha_enganche: prospect.fecha_enganche ?? "",
        firma_pcv: prospect.firma_pcv ?? "",
        fecha_cierre: prospect.fecha_cierre ?? "",
        observaciones: prospect.observaciones ?? "",
      }));
      if (isGerenta && prospect.user_id) {
        setAsesorId(prospect.user_id);
      }
    }
  }, [prospect]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseFloat(value)) : newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let userId: string;
      if (isGerenta) {
        if (!asesorId) {
          toast.error("Selecciona un asesor");
          setLoading(false);
          return;
        }
        userId = asesorId;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");
        userId = user.id;
      }

      const payload = {
        ...form,
        user_id: userId,
        fecha_primer_contacto: form.fecha_primer_contacto || null,
        fecha_primer_zoom: form.fecha_primer_zoom || null,
        fecha_segundo_zoom: form.fecha_segundo_zoom || null,
        metros_cuadrados_tentativos:
          form.metros_cuadrados_tentativos === "" ? null : form.metros_cuadrados_tentativos,
        monto_total: form.monto_total === "" ? null : form.monto_total,
        proximo_seguimiento: form.proximo_seguimiento || null,
        probabilidad_cierre:
          form.probabilidad_cierre === "" ? null : form.probabilidad_cierre,
        monto_apartado: form.monto_apartado === "" ? null : form.monto_apartado,
        fecha_apartado: form.fecha_apartado || null,
        fecha_enganche: form.fecha_enganche || null,
        firma_pcv: form.firma_pcv || null,
        fecha_cierre: form.fecha_cierre || null,
      };

      if (prospect?.id) {
        const { error } = await supabase
          .from("prospects")
          .update(payload)
          .eq("id", prospect.id);
        if (error) throw error;
        toast.success("Prospecto actualizado");
      } else {
        const { error } = await supabase.from("prospects").insert(payload);
        if (error) throw error;
        toast.success("Prospecto creado");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!prospect?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", prospect.id);
      if (error) throw error;
      toast.success("Prospecto eliminado");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* --- Todos los campos del formulario (idénticos a los que ya tenías) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre del cliente *"
            name="nombre_cliente"
            value={form.nombre_cliente}
            onChange={handleChange}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Fecha 1er contacto *</label>
            <input
              type="date"
              name="fecha_primer_contacto"
              value={form.fecha_primer_contacto}
              onChange={handleChange}
              required
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Fecha 1er zoom</label>
            <input
              type="date"
              name="fecha_primer_zoom"
              value={form.fecha_primer_zoom}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Fecha 2do zoom</label>
            <input
              type="date"
              name="fecha_segundo_zoom"
              value={form.fecha_segundo_zoom}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <Input
            label="Metros cuadrados tentativos"
            type="number"
            name="metros_cuadrados_tentativos"
            value={form.metros_cuadrados_tentativos}
            onChange={handleChange}
          />
          <Input
            label="Monto total $"
            type="number"
            name="monto_total"
            value={form.monto_total}
            onChange={handleChange}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Plan de financiamiento</label>
            <select
              name="plan_financiamiento"
              value={form.plan_financiamiento}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none"
            >
              <option value="contado">Contado</option>
              <option value="12_meses">12 meses</option>
              <option value="24_meses">24 meses</option>
              <option value="36_meses">36 meses</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Estatus enganche</label>
            <select
              name="estatus_enganche"
              value={form.estatus_enganche}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none"
            >
              <option value="realizado">Realizado</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>
          <Input
            label="Estatus general"
            name="estatus_general"
            value={form.estatus_general}
            onChange={handleChange}
          />
          <Input
            label="Próxima acción"
            name="proxima_accion"
            value={form.proxima_accion}
            onChange={handleChange}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Próximo seguimiento</label>
            <input
              type="date"
              name="proximo_seguimiento"
              value={form.proximo_seguimiento}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <Input
            label="Probabilidad cierre (%)"
            type="number"
            min={0}
            max={100}
            name="probabilidad_cierre"
            value={form.probabilidad_cierre}
            onChange={handleChange}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="apartado_realizado"
              checked={form.apartado_realizado}
              onChange={handleChange}
              className="accent-pitahaya-accent"
            />
            <label className="text-sm text-pitahaya-gray-300">Apartado realizado</label>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Fecha de apartado</label>
            <input
              type="date"
              name="fecha_apartado"
              value={form.fecha_apartado}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <Input
            label="Monto apartado $"
            type="number"
            name="monto_apartado"
            value={form.monto_apartado}
            onChange={handleChange}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Fecha de enganche</label>
            <input
              type="date"
              name="fecha_enganche"
              value={form.fecha_enganche}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Firma PCV</label>
            <input
              type="date"
              name="firma_pcv"
              value={form.firma_pcv}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Fecha de cierre</label>
            <input
              type="date"
              name="fecha_cierre"
              value={form.fecha_cierre}
              onChange={handleChange}
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-pitahaya-gray-300">Observaciones</label>
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            rows={3}
            className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-pitahaya-accent"
          />
        </div>

        {isGerenta && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-pitahaya-gray-300">Asesor asignado *</label>
            <select
              value={asesorId}
              onChange={(e) => setAsesorId(e.target.value)}
              required
              className="w-full bg-pitahaya-dark/60 border border-pitahaya-accent/20 rounded-lg py-2.5 px-4 text-white focus:outline-none"
            >
              <option value="">Selecciona un asesor</option>
              {asesores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || "Asesor sin nombre"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-4">
          {prospect?.id ? (
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-pitahaya-coral hover:text-red-400"
            >
              Eliminar prospecto
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : prospect?.id ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </div>
      </form>

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar prospecto"
        message="¿Estás seguro de que deseas eliminar este prospecto? Esta acción no se puede deshacer."
        loading={deleting}
      />
    </>
  );
}