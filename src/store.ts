import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'pos' | 'neg' | 'neutral'
}

interface UIState {
  toasts: Toast[]
  toast: (message: string, tone?: Toast['tone']) => void
  dismiss: (id: number) => void
  txFormOpen: boolean
  setTxFormOpen: (open: boolean) => void
}

let nextId = 1

export const useUI = create<UIState>(set => ({
  toasts: [],
  toast: (message, tone = 'neutral') => {
    const id = nextId++
    set(s => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500)
  },
  dismiss: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  txFormOpen: false,
  setTxFormOpen: open => set({ txFormOpen: open })
}))
