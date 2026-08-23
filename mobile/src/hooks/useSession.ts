import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

export type SessionRole = 'admin' | 'cliente' | null;

export type Session = {
  token: string;
  role: SessionRole;
  nombre: string;
  clienteId?: number;
};

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutos

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleLogout(onLogout: () => void) {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(onLogout, INACTIVITY_MS);
}

export function clearInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
}

export function resetInactivity(onLogout: () => void) {
  scheduleLogout(onLogout);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const role = await SecureStore.getItemAsync('role');
        const nombre = await SecureStore.getItemAsync('nombre');
        const clienteId = await SecureStore.getItemAsync('clienteId');
        if (token && role) {
          setSession({
            token,
            role: role as SessionRole,
            nombre: nombre ?? '',
            clienteId: clienteId ? Number(clienteId) : undefined,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (s: Session) => {
    await SecureStore.setItemAsync('token', s.token);
    await SecureStore.setItemAsync('role', s.role ?? '');
    await SecureStore.setItemAsync('nombre', s.nombre);
    if (s.clienteId) await SecureStore.setItemAsync('clienteId', String(s.clienteId));
    setSession(s);
  }, []);

  const signOut = useCallback(async () => {
    clearInactivityTimer();
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('role');
    await SecureStore.deleteItemAsync('nombre');
    await SecureStore.deleteItemAsync('clienteId');
    setSession(null);
  }, []);

  return { session, loading, signIn, signOut };
}
