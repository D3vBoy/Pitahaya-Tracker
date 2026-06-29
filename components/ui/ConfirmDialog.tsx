"use client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-pitahaya-gray-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={loading}
          className="bg-pitahaya-coral hover:bg-red-500"
        >
          {loading ? "Eliminando..." : "Eliminar"}
        </Button>
      </div>
    </Modal>
  );
}