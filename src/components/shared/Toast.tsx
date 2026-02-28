import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ToastData {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

let toastListeners: ((toast: ToastData) => void)[] = [];

export function showToast(type: ToastData["type"], message: string) {
  const id = `toast-${Date.now()}-${Math.random()}`;
  for (const listener of toastListeners) {
    listener({ id, type, message });
  }
}

const typeColors = {
  info: "border-accent-cyan/50 bg-accent-cyan/10",
  success: "border-accent-green/50 bg-accent-green/10",
  warning: "border-accent-amber/50 bg-accent-amber/10",
  error: "border-accent-red/50 bg-accent-red/10",
};

const typeIcons = {
  info: "💡",
  success: "✅",
  warning: "⚠️",
  error: "🔴",
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: ToastData) => {
    setToasts((prev) => [...prev.slice(-4), toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== addToast);
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-24 left-4 z-50 flex flex-col gap-2 max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border backdrop-blur-md ${
              typeColors[toast.type]
            }`}
          >
            <span className="text-sm mt-0.5">{typeIcons[toast.type]}</span>
            <p className="text-sm text-white/90 flex-1 font-mono">
              {toast.message}
            </p>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
