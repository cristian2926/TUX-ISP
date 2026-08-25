import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { getMiCuenta, MiCuenta } from '@/services/api';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function diasDesde(d: string | null | undefined): string {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return diff === 0 ? 'Hoy' : `Hace ${diff} días`;
}

export default function MiCuentaScreen() {
  const { session } = useSession();
  const [cuenta, setCuenta] = useState<MiCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCuenta(await getMiCuenta());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#111827' }} color="#FFD700" size="large" />;

  const activo = cuenta?.estado === 'activo';
  const suspendido = cuenta?.estado === 'suspendido';
  const dias = cuenta?.fecha_vencimiento
    ? Math.ceil((new Date(cuenta.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFD700" />}
    >
      {/* Saludo */}
      <View style={s.welcome}>
        <Text style={s.welcomeSub}>Bienvenido de vuelta,</Text>
        <Text style={s.welcomeName}>{session?.nombre ?? cuenta?.nombre ?? '—'}</Text>
        <Text style={s.welcomeHint}>Aquí tienes el resumen de tu servicio Tuxtell ISP</Text>
      </View>

      {/* Estado de conexión */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Estado de conexión</Text>
          <View style={[s.estadoBadge, activo ? s.badgeGreen : s.badgeRed]}>
            <View style={[s.dot, activo ? s.dotGreen : s.dotRed]} />
            <Text style={[s.estadoText, activo ? s.textGreen : s.textRed]}>
              {activo ? 'Activo' : suspendido ? 'Cortado' : 'Anulado'}
            </Text>
          </View>
        </View>

        {cuenta?.plan && (
          <Text style={s.planNombre}>{cuenta.plan.nombre}</Text>
        )}

        <View style={s.infoRow}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>FECHA INSTALACIÓN</Text>
            <Text style={s.infoValue}>{fmt(cuenta?.fecha_instalacion)}</Text>
          </View>
          {cuenta?.plan && (
            <View style={[s.infoCol, { alignItems: 'flex-end' }]}>
              <Text style={s.infoLabel}>VELOCIDAD</Text>
              <Text style={s.infoValue}>↓{cuenta.plan.bajada_mbps} / ↑{cuenta.plan.subida_mbps} Mbps</Text>
            </View>
          )}
        </View>
      </View>

      {/* Facturación */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Facturación actual</Text>

        {cuenta?.plan && (
          <>
            <Text style={s.montoLabel}>MONTO MENSUAL</Text>
            <Text style={s.montoValue}>Q {cuenta.plan.precio.toFixed(2)}</Text>
          </>
        )}

        {dias !== null && (
          <View style={[s.venceBar, dias < 0 ? s.venceRojo : dias <= 5 ? s.venceOrange : s.venceGreen]}>
            <Text style={[s.venceText, dias < 0 ? s.textRed : dias <= 5 ? s.textOrange : s.textGreen]}>
              {dias < 0
                ? `⚠ Vencido hace ${Math.abs(dias)} días`
                : dias === 0 ? '⚠ Vence hoy'
                : `📅 Próximo pago: ${fmt(cuenta?.fecha_vencimiento)} (en ${dias}d)`}
            </Text>
          </View>
        )}
      </View>

      {/* Datos personales */}
      {cuenta && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Mis datos</Text>
          {[
            { l: 'Teléfono', v: cuenta.telefono ?? '—' },
            { l: 'Dirección', v: cuenta.direccion ?? '—' },
            { l: 'Zona', v: (cuenta as any).zona?.nombre ?? '—' },
          ].map(({ l, v }) => (
            <View key={l} style={s.fila}>
              <Text style={s.filaLabel}>{l}</Text>
              <Text style={s.filaValue}>{v}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const BG = '#111827'; const CARD = '#1F2937'; const BORDER = '#374151'; const GOLD = '#FFD700';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  welcome: { marginBottom: 20, paddingTop: 4 },
  welcomeSub: { fontSize: 14, color: '#9CA3AF' },
  welcomeName: { fontSize: 26, fontWeight: '900', color: '#F9FAFB', marginTop: 2 },
  welcomeHint: { fontSize: 13, color: '#4B5563', marginTop: 4 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: GOLD, letterSpacing: 1.5 },
  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGreen: { backgroundColor: 'rgba(74,222,128,0.12)' },
  badgeRed: { backgroundColor: 'rgba(248,113,113,0.12)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#f87171' },
  estadoText: { fontSize: 12, fontWeight: '700' },
  textGreen: { color: '#4ade80' },
  textRed: { color: '#f87171' },
  textOrange: { color: '#fb923c' },
  planNombre: { fontSize: 17, fontWeight: '700', color: '#F9FAFB', marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#F9FAFB', marginTop: 4 },
  montoLabel: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 1 },
  montoValue: { fontSize: 36, fontWeight: '900', color: '#F9FAFB', marginTop: 4, marginBottom: 14 },
  venceBar: { borderRadius: 8, padding: 10, borderWidth: 1 },
  venceRojo: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.2)' },
  venceOrange: { backgroundColor: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.2)' },
  venceGreen: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)' },
  venceText: { fontSize: 13, fontWeight: '600' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
  filaLabel: { color: '#9CA3AF', fontSize: 13 },
  filaValue: { color: '#F9FAFB', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
