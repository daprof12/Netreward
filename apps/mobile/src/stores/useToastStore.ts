import { create } from 'zustand';

export type ToastType = 'success' | 'warning' | 'danger' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3500);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));
