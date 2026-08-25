import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { getMiCuenta, MiCuenta } from '@/services/api';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function MiCuentaScreen() {
  const { session } = useSession();
  const [cuenta, setCuenta] = useState<MiCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setCuenta(await getMiCuenta()); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#F8FAFC' }} color="#F59E0B" size="large" />;

  const activo    = cuenta?.estado === 'activo';
  const suspendido = cuenta?.estado === 'suspendido';
  const dias = cuenta?.fecha_vencimiento
    ? Math.ceil((new Date(cuenta.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F59E0B" />}
    >
      {/* ── HERO DE ESTADO ────────────────────────────────── */}
      <View style={[s.hero, activo ? s.heroGreen : s.heroRed]}>
        {/* Círculo superior con inicial */}
        <View style={s.heroBubble}>
          <Text style={s.heroBubbleText}>
            {(session?.nombre ?? cuenta?.nombre ?? 'U')[0].toUpperCase()}
          </Text>
        </View>

        <Text style={s.heroName} numberOfLines={1}>
          {session?.nombre ?? cuenta?.nombre ?? '—'}
        </Text>

        {/* Estado */}
        <View style={s.heroStatusRow}>
          <View style={[s.heroDot, activo ? s.dotWhite : s.dotWhite]} />
          <Text style={s.heroStatus}>
            {activo ? 'SERVICIO ACTIVO' : suspendido ? 'SERVICIO CORTADO' : 'ANULADO'}
          </Text>
        </View>

        {/* Plan */}
        {cuenta?.plan && (
          <View style={s.heroPlanBadge}>
            <Text style={[s.heroPlanText, activo ? { color: '#059669' } : { color: '#DC2626' }]}>
              {cuenta.plan.nombre}
            </Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* ── FACTURACIÓN ─────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>FACTURACIÓN</Text>
          {cuenta?.plan && (
            <View style={s.montoRow}>
              <Text style={s.montoLabel}>Mensualidad</Text>
              <Text style={s.montoValor}>S/ {cuenta.plan.precio.toFixed(2)}</Text>
            </View>
          )}
          {dias !== null && (
            <View style={[s.venceBar,
              dias < 0 ? s.venceRojo : dias <= 7 ? s.venceOrange : s.venceGreen
            ]}>
              <Text style={[s.venceText,
                dias < 0 ? { color: '#DC2626' } : dias <= 7 ? { color: '#D97706' } : { color: '#059669' }
              ]}>
                {dias < 0
                  ? `⚠  Vencido hace ${Math.abs(dias)} días — contáctanos`
                  : dias === 0 ? '⚠  Tu servicio vence hoy'
                  : `📅  Próximo pago: ${fmt(cuenta?.fecha_vencimiento)} (en ${dias}d)`}
              </Text>
            </View>
          )}
        </View>

        {/* ── MIS DATOS ───────────────────────────────────── */}
        {cuenta && (
          <View style={s.card}>
            <Text style={s.cardTitle}>MIS DATOS</Text>
            {[
              { l: 'Instalación', v: fmt(cuenta.fecha_instalacion) },
              { l: 'Teléfono',    v: cuenta.telefono ?? '—'        },
              { l: 'Dirección',   v: cuenta.direccion ?? '—'       },
            ].map(({ l, v }) => (
              <View key={l} style={s.fila}>
                <Text style={s.filaLabel}>{l}</Text>
                <Text style={s.filaValue} numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Hero */
  hero: { paddingTop: 32, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', marginBottom: 20 },
  heroGreen: { backgroundColor: '#059669' },
  heroRed:   { backgroundColor: '#DC2626' },
  heroBubble: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heroBubbleText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', opacity: 0.9, marginBottom: 10, textAlign: 'center' },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  heroDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)' },
  dotWhite: {},
  heroStatus: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  heroPlanBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 7,
  },
  heroPlanText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  /* Cards */
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 2, marginBottom: 14 },
  montoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  montoLabel: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  montoValor: { fontSize: 30, fontWeight: '900', color: '#1E293B' },
  venceBar: { borderRadius: 10, padding: 12, borderWidth: 1 },
  venceRojo:   { backgroundColor: 'rgba(220,38,38,0.06)',  borderColor: 'rgba(220,38,38,0.2)'  },
  venceOrange: { backgroundColor: 'rgba(217,119,6,0.06)',  borderColor: 'rgba(217,119,6,0.2)'  },
  venceGreen:  { backgroundColor: 'rgba(5,150,105,0.06)',  borderColor: 'rgba(5,150,105,0.2)'  },
  venceText: { fontSize: 13, fontWeight: '700' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filaLabel: { color: '#94A3B8', fontSize: 13 },
  filaValue: { color: '#1E293B', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
});
