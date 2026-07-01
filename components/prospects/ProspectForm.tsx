"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { PostgrestError } from "@supabase/supabase-js";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { STATUS_OPTIONS, isAllowedStatus } from "@/lib/prospects/status";

export interface ProspectData {
  id?: string;
  user_id?: string;
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

type NullablePartialProspectData = {
  [K in keyof ProspectData]?: ProspectData[K] | null;
};

interface Props {
  prospect?: NullablePartialProspectData | null;
  onClose: () => void;
  onSuccess: () => void;
  isGerenta?: boolean;
}

const createEmptyForm = (prospect?: NullablePartialProspectData | null): ProspectData => ({
  nombre_cliente: prospect?.nombre_cliente ?? "",
  fecha_primer_contacto: prospect?.fecha_primer_contacto ?? "",
  fecha_primer_zoom: prospect?.fecha_primer_zoom ?? "",
  fecha_segundo_zoom: prospect?.fecha_segundo_zoom ?? "",
  metros_cuadrados_tentativos: prospect?.metros_cuadrados_tentativos ?? "",
  monto_total: prospect?.monto_total ?? "",
  plan_financiamiento: prospect?.plan_financiamiento ?? "contado",
  estatus_enganche: prospect?.estatus_enganche ?? "pendiente",
  estatus_general:
    prospect?.estatus_general && isAllowedStatus(prospect.estatus_general)
      ? prospect.estatus_general
      : "",
  proxima_accion: prospect?.proxima_accion ?? "",
  proximo_seguimiento: prospect?.proximo_seguimiento ?? "",
  probabilidad_cierre: prospect?.probabilidad_cierre ?? "",
  apartado_realizado: prospect?.apartado_realizado ?? false,
  fecha_apartado: prospect?.fecha_apartado ?? "",
  monto_apartado: prospect?.monto_apartado ?? "",
  fecha_enganche: prospect?.fecha_enganche ?? "",
  firma_pcv: prospect?.firma_pcv ?? "",
  fecha_cierre: prospect?.fecha_cierre ?? "",
  observaciones: prospect?.observaciones ?? "",
});

const toNullableNumber = (value: number | "") => (value === "" ? null : value);
const toNullableDate = (value: string) => (value.trim() === "" ? null : value);
const toNullableText = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

function normalizeProspectPayload(form: ProspectData, userId: string) {
  return {
    user_id: userId,
    nombre_cliente: form.nombre_cliente.trim(),
    fecha_primer_contacto: form.fecha_primer_contacto,
    fecha_primer_zoom: toNullableDate(form.fecha_primer_zoom),
    fecha_segundo_zoom: toNullableDate(form.fecha_segundo_zoom),
    metros_cuadrados_tentativos: toNullableNumber(form.metros_cuadrados_tentativos),
    monto_total: toNullableNumber(form.monto_total),
    plan_financiamiento: toNullableText(form.plan_financiamiento),
    estatus_enganche: form.estatus_enganche,
    estatus_general: form.estatus_general,
    proxima_accion: toNullableText(form.proxima_accion),
    proximo_seguimiento: toNullableDate(form.proximo_seguimiento),
    probabilidad_cierre: toNullableNumber(form.probabilidad_cierre),
    apartado_realizado: form.apartado_realizado,
    fecha_apartado: toNullableDate(form.fecha_apartado),
    monto_apartado: toNullableNumber(form.monto_apartado),
    fecha_enganche: toNullableDate(form.fecha_enganche),
    firma_pcv: toNullableDate(form.firma_pcv),
    fecha_cierre: toNullableDate(form.fecha_cierre),
    observaciones: toNullableText(form.observaciones),
  };
}

function buildSupabaseErrorMessage(error: PostgrestError) {
  if (error.code === "42501") {
    return "No tienes permisos para crear o editar este prospecto. Revisa las politicas RLS de Supabase para la tabla prospects.";
  }
  return error.message;
}

export default function ProspectForm({ prospect, onClose, onSuccess, isGerenta = false }: Props) {
  const supabase = createClientSupabase();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [asesorId, setAsesorId] = useState<string>(() => (isGerenta ? prospect?.user_id ?? "" : ""));
  const [asesores, setAsesores] = useState<{ id: string; full_name: string | null }[]>([]);
  const [form, setForm] = useState<ProspectData>(() => createEmptyForm(prospect));

  useEffect(() => {
    if (!isGerenta) return;

    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "asesor")
      .then(({ data }) => setAsesores(data || []));
  }, [isGerenta, supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : type === "number"
          ? value === ""
            ? ""
            : parseFloat(value)
          : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");
        userId = user.id;
      }

      const payload = normalizeProspectPayload(form, userId);

      if (!payload.nombre_cliente) {
        throw new Error("El nombre del cliente es obligatorio");
      }

      if (!payload.estatus_general || !isAllowedStatus(payload.estatus_general)) {
        throw new Error("Debes seleccionar un status valido de seguimiento");
      }

      if (prospect?.id) {
        const { error } = await supabase.from("prospects").update(payload).eq("id", prospect.id);
        if (error) throw new Error(buildSupabaseErrorMessage(error));
        toast.success("Prospecto actualizado");
      } else {
        const { error } = await supabase.from("prospects").insert(payload);
        if (error) throw new Error(buildSupabaseErrorMessage(error));
        toast.success("Prospecto creado");
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!prospect?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("prospects").delete().eq("id", prospect.id);
      if (error) throw new Error(buildSupabaseErrorMessage(error));
      toast.success("Prospecto eliminado");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-pitahaya-border bg-pitahaya-surface px-4 py-2.5 text-white placeholder-pitahaya-gray-500 transition-all duration-300 focus:border-pitahaya-cerise focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/20";
  const selectClass = `${inputClass} pitahaya-select`;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Nombre del cliente *" name="nombre_cliente" value={form.nombre_cliente} onChange={handleChange} required />
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Fecha 1er contacto *</label>
            <input type="date" name="fecha_primer_contacto" value={form.fecha_primer_contacto} onChange={handleChange} required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Fecha 1er zoom</label>
            <input type="date" name="fecha_primer_zoom" value={form.fecha_primer_zoom} onChange={handleChange} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Fecha 2do zoom</label>
            <input type="date" name="fecha_segundo_zoom" value={form.fecha_segundo_zoom} onChange={handleChange} className={inputClass} />
          </div>
          <Input label="Metros cuadrados tentativos" type="number" name="metros_cuadrados_tentativos" value={form.metros_cuadrados_tentativos} onChange={handleChange} />
          <Input label="Monto total $" type="number" name="monto_total" value={form.monto_total} onChange={handleChange} />
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Plan de financiamiento</label>
            <select name="plan_financiamiento" value={form.plan_financiamiento} onChange={handleChange} className={selectClass}>
              <option value="contado">Contado</option>
              <option value="12_meses">12 meses</option>
              <option value="24_meses">24 meses</option>
              <option value="36_meses">36 meses</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Estatus enganche</label>
            <select name="estatus_enganche" value={form.estatus_enganche} onChange={handleChange} className={selectClass}>
              <option value="realizado">Realizado</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Status de seguimiento *</label>
            <select
              name="estatus_general"
              value={form.estatus_general}
              onChange={handleChange}
              required
              className={selectClass}
            >
              <option value="">Selecciona un status obligatorio</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <Input label="Próxima acción" name="proxima_accion" value={form.proxima_accion} onChange={handleChange} placeholder="Ejemplo: Llamar el martes o N/A" />
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Próximo seguimiento</label>
            <input type="date" name="proximo_seguimiento" value={form.proximo_seguimiento} onChange={handleChange} className={inputClass} />
          </div>
          <Input label="Probabilidad cierre (%)" type="number" min={0} max={100} name="probabilidad_cierre" value={form.probabilidad_cierre} onChange={handleChange} />
          <div className="flex h-full items-center gap-3 pt-6">
            <input type="checkbox" name="apartado_realizado" checked={form.apartado_realizado} onChange={handleChange} className="h-5 w-5 rounded accent-[#CF3790]" />
            <label className="text-sm font-medium text-pitahaya-gray-300">Apartado realizado</label>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Fecha de apartado</label>
            <input type="date" name="fecha_apartado" value={form.fecha_apartado} onChange={handleChange} className={inputClass} />
          </div>
          <Input label="Monto apartado $" type="number" name="monto_apartado" value={form.monto_apartado} onChange={handleChange} />
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Fecha de enganche</label>
            <input type="date" name="fecha_enganche" value={form.fecha_enganche} onChange={handleChange} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Firma PCV</label>
            <input type="date" name="firma_pcv" value={form.firma_pcv} onChange={handleChange} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Fecha de cierre</label>
            <input type="date" name="fecha_cierre" value={form.fecha_cierre} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Observaciones</label>
          <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} placeholder="Si no aplica, escribe N/A" className={inputClass} />
        </div>

        {isGerenta && (
          <div className="flex flex-col gap-1.5">
            <label className="ml-1 text-sm font-medium text-pitahaya-gray-300">Asesor asignado *</label>
            <select value={asesorId} onChange={(e) => setAsesorId(e.target.value)} required className={selectClass}>
              <option value="">Selecciona un asesor</option>
              {asesores.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name || "Sin nombre"}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-pitahaya-border pt-4">
          {prospect?.id ? (
            <Button variant="danger" type="button" onClick={() => setShowDeleteConfirm(true)} className="text-sm">
              Eliminar prospecto
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : prospect?.id ? "Actualizar" : "Crear prospecto"}</Button>
          </div>
        </div>
      </form>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="premium-panel relative w-full max-w-md rounded-3xl border border-pitahaya-border p-6 shadow-[0_24px_80px_rgba(10,6,18,0.5)]">
            <h3 className="mb-2 text-lg font-bold text-white">Eliminar prospecto</h3>
            <p className="mb-6 text-sm text-pitahaya-gray-500">¿Estás seguro de que deseas eliminar este prospecto? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Eliminando..." : "Eliminar"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}