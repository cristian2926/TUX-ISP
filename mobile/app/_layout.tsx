import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession, resetInactivity, clearInactivityTimer } from '@/hooks/useSession';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutos sin actividad → logout

export default function RootLayout() {
  const { session, loading, signOut } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const lastActivityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);

  // ── Redirección según estado de sesión ────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Siempre redirigir a la sección correcta según el rol
    const seccionCorrecta = session.role === 'admin' ? '(admin)' : '(cliente)';
    if (segments[0] !== seccionCorrecta) {
      router.replace(session.role === 'admin' ? '/(admin)' : '/(cliente)');
    }
  }, [session, loading, segments]);

  // ── Auto-logout por inactividad ───────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const doLogout = () => {
      clearInactivityTimer();
      signOut();
    };

    resetInactivity(doLogout);

    // Cuando la app vuelve al primer plano, verificar tiempo transcurrido
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && appStateRef.current !== 'active') {
        if (Date.now() - lastActivityRef.current > INACTIVITY_MS) {
          doLogout();
        } else {
          resetInactivity(doLogout);
        }
      }
      if (state !== 'active') {
        lastActivityRef.current = Date.now();
      }
      appStateRef.current = state;
    });

    return () => {
      sub.remove();
      clearInactivityTimer();
    };
  }, [session]);

  if (loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
