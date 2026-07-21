import { create } from 'zustand'
import type { SessionData } from '../types/auth'
import { clearSessionStorage, getSessionStorage, setSessionStorage } from '../utils/storage'

interface SessionState {
  session: SessionData | null
  setSession: (data: SessionData) => void
  clearSession: () => void
}

const initialSession = getSessionStorage()

export const useSessionStore = create<SessionState>((set) => ({
  session: initialSession,
  setSession: (data) => {
    setSessionStorage(data)
    set({ session: data })
  },
  clearSession: () => {
    clearSessionStorage()
    set({ session: null })
  },
}))
