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

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: BG }} color={GOLD} size="large" />;

  const activo = cuenta?.estado === 'activo';
  const cortado = cuenta?.estado === 'suspendido';
  const dias = cuenta?.fecha_vencimiento
    ? Math.ceil((new Date(cuenta.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} />}
    >
      {/* Saludo */}
      <View style={s.welcome}>
        <Text style={s.welcomeSub}>Bienvenido,</Text>
        <Text style={s.welcomeName}>{session?.nombre ?? cuenta?.nombre ?? '—'}</Text>
      </View>

      {/* TARJETA ESTADO GRANDE */}
      <View style={[s.statusHero, activo ? s.heroGreen : s.heroRed]}>
        <View style={s.statusIconWrap}>
          <Text style={s.statusIcon}>{activo ? '✓' : '✕'}</Text>
        </View>
        <Text style={[s.statusTitle, activo ? s.textGreen : s.textRed]}>
          {activo ? 'SERVICIO ACTIVO' : cortado ? 'SERVICIO CORTADO' : 'SERVICIO ANULADO'}
        </Text>
        {cuenta?.plan && (
          <Text style={s.statusPlan}>{cuenta.plan.nombre}</Text>
        )}
        {cuenta?.plan && (
          <Text style={s.statusVelocidad}>↓{cuenta.plan.bajada_mbps} Mbps / ↑{cuenta.plan.subida_mbps} Mbps</Text>
        )}
      </View>

      {/* Facturación */}
      <View style={s.card}>
        <Text style={s.cardTitle}>FACTURACIÓN</Text>
        {cuenta?.plan && (
          <View style={s.montoRow}>
            <Text style={s.montoLabel}>Mensualidad</Text>
            <Text style={s.montoValue}>Q {cuenta.plan.precio.toFixed(2)}</Text>
          </View>
        )}
        {dias !== null && (
          <View style={[s.venceBar, dias < 0 ? s.venceRojo : dias <= 5 ? s.venceOrange : s.venceGreen]}>
            <Text style={[s.venceText, dias < 0 ? s.textRed : dias <= 5 ? s.textOrange : s.textGreenDark]}>
              {dias < 0
                ? `⚠ Vencido hace ${Math.abs(dias)} días — contáctanos`
                : dias === 0 ? '⚠ Tu servicio vence hoy'
                : `📅 Próximo pago: ${fmt(cuenta?.fecha_vencimiento)} (en ${dias}d)`}
            </Text>
          </View>
        )}
      </View>

      {/* Datos */}
      {cuenta && (
        <View style={s.card}>
          <Text style={s.cardTitle}>MIS DATOS</Text>
          {[
            { l: 'Instalación', v: fmt(cuenta.fecha_instalacion) },
            { l: 'Teléfono', v: cuenta.telefono ?? '—' },
            { l: 'Dirección', v: cuenta.direccion ?? '—' },
          ].map(({ l, v }) => (
            <View key={l} style={s.fila}>
              <Text style={s.filaLabel}>{l}</Text>
              <Text style={s.filaValue} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const BG = '#F8FAFC'; const GOLD = '#F59E0B';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  welcome: { marginBottom: 16, paddingTop: 4 },
  welcomeSub: { fontSize: 13, color: '#94A3B8' },
  welcomeName: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginTop: 2 },

  statusHero: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1 },
  heroGreen: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' },
  heroRed: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' },
  statusIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  statusIcon: { fontSize: 34, fontWeight: '900' },
  statusTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  statusPlan: { fontSize: 16, color: '#475569', marginTop: 6, fontWeight: '600' },
  statusVelocidad: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  textGreen: { color: '#059669' },
  textRed: { color: '#DC2626' },
  textOrange: { color: '#D97706' },
  textGreenDark: { color: '#059669' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 2, marginBottom: 14 },
  montoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  montoLabel: { fontSize: 14, color: '#64748B' },
  montoValue: { fontSize: 28, fontWeight: '900', color: '#1E293B' },
  venceBar: { borderRadius: 10, padding: 12, borderWidth: 1 },
  venceRojo: { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' },
  venceOrange: { backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' },
  venceGreen: { backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' },
  venceText: { fontSize: 13, fontWeight: '600' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filaLabel: { color: '#94A3B8', fontSize: 13 },
  filaValue: { color: '#1E293B', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
});
