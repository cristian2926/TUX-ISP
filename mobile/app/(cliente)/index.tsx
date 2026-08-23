import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { getMiCuenta, MiCuenta } from '@/services/api';

const ESTADO_CONFIG: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  activo:     { emoji: '✅', color: '#16a34a', bg: '#dcfce7', label: 'Activo' },
  suspendido: { emoji: '⛔', color: '#dc2626', bg: '#fee2e2', label: 'Suspendido' },
  anulado:    { emoji: '❌', color: '#6b7280', bg: '#f3f4f6', label: 'Anulado' },
};

export default function MiCuentaScreen() {
  const [cuenta, setCuenta] = useState<MiCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMiCuenta();
      setCuenta(data);
    } catch {
      // mantiene datos anteriores
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1e40af" size="large" />;
  if (!cuenta) return <Text style={styles.error}>No se pudo cargar tu cuenta</Text>;

  const cfg = ESTADO_CONFIG[cuenta.estado] ?? ESTADO_CONFIG.activo;
  const dias = cuenta.fecha_vencimiento
    ? Math.ceil((new Date(cuenta.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Estado del servicio */}
      <View style={[styles.estadoCard, { backgroundColor: cfg.bg }]}>
        <Text style={styles.estadoEmoji}>{cfg.emoji}</Text>
        <Text style={[styles.estadoLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={[styles.estadoSub, { color: cfg.color }]}>Tu servicio está {cfg.label.toLowerCase()}</Text>
      </View>

      {/* Próximo pago */}
      {dias !== null && (
        <View style={[
          styles.venceCard,
          dias < 0 ? styles.venceRojo : dias <= 5 ? styles.venceAmarillo : styles.verdeCard,
        ]}>
          <Text style={styles.venceTitle}>
            {dias < 0
              ? '⚠️ Pago vencido'
              : dias === 0
              ? '⚠️ Vence hoy'
              : '📅 Próximo pago'}
          </Text>
          <Text style={styles.venceDate}>{fmt(cuenta.fecha_vencimiento)}</Text>
          <Text style={styles.venceSub}>
            {dias < 0
              ? `Hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
              : dias === 0
              ? 'Hoy vence tu periodo'
              : `Faltan ${dias} día${dias !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* Datos del plan */}
      {cuenta.plan && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu Plan</Text>
          <Fila label="Nombre" value={cuenta.plan.nombre} />
          <Fila label="Velocidad" value={`↓ ${cuenta.plan.bajada_mbps} Mbps  ↑ ${cuenta.plan.subida_mbps} Mbps`} />
          <Fila label="Tarifa mensual" value={`Q ${cuenta.plan.precio.toFixed(2)}`} highlight />
        </View>
      )}

      {/* Info personal */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mis Datos</Text>
        <Fila label="Nombre" value={cuenta.nombre} />
        <Fila label="Teléfono" value={cuenta.telefono ?? '—'} />
        <Fila label="Dirección" value={cuenta.direccion ?? '—'} />
        <Fila label="Instalación" value={fmt(cuenta.fecha_instalacion)} />
      </View>
    </ScrollView>
  );
}

function Fila({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={[styles.filaValue, highlight && { color: '#1e40af', fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  estadoCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
  estadoEmoji: { fontSize: 40 },
  estadoLabel: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  estadoSub: { fontSize: 14, marginTop: 4 },
  venceCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 12 },
  venceRojo: { backgroundColor: '#fee2e2' },
  venceAmarillo: { backgroundColor: '#fef3c7' },
  verdeCard: { backgroundColor: '#dcfce7' },
  venceTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  venceDate: { fontSize: 28, fontWeight: '900', color: '#111827', marginTop: 6 },
  venceSub: { fontSize: 13, color: '#374151', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardTitle: { fontWeight: '700', fontSize: 15, color: '#1e40af', marginBottom: 8 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filaLabel: { color: '#6b7280', fontSize: 13 },
  filaValue: { color: '#111827', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  error: { textAlign: 'center', marginTop: 60, color: '#6b7280', fontSize: 16 },
});
