"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { X } from "lucide-react";

interface Modal {
  id: string;
  component: ReactNode;
}

interface ModalContextType {
  modals: Modal[];
  openModal: (id: string, component: ReactNode) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);

  const openModal = useCallback((id: string, component: ReactNode) => {
    setModals((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      return [...filtered, { id, component }];
    });
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, closeAllModals }}>
      {children}
      <ModalContainer modals={modals} onClose={closeModal} />
    </ModalContext.Provider>
  );
}

function ModalContainer({
  modals,
  onClose,
}: {
  modals: Modal[];
  onClose: (id: string) => void;
}) {
  if (modals.length === 0) return null;

  return (
    <>
      {modals.map((modal) => (
        <ModalWrapper key={modal.id} onClose={() => onClose(modal.id)}>
          {modal.component}
        </ModalWrapper>
      ))}
    </>
  );
}

function ModalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-[90vh] overflow-auto animate-in zoom-in-95 fade-in duration-200">
        {children}
      </div>
    </div>
  );
}

interface ModalProps {
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  showClose?: boolean;
}

export function Modal({
  title,
  children,
  onClose,
  size = "md",
  showClose = true,
}: ModalProps) {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className={`w-full ${sizes[size]}`}>
      {(title || showClose) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          {title && (
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          )}
          {showClose && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmStyles =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <Modal onClose={onClose} showClose={!loading} size="sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${confirmStyles}`}
          >
            {loading ? "Loading..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
