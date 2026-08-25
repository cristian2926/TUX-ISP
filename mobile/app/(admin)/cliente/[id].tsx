import { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { getCliente, suspenderCliente, activarCliente, ClienteDetalle } from '@/services/api';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function Fila({ label, value, mono = false, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.filaLabel}>{label}</Text>
      <Text style={[s.filaValue, mono && s.mono, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function ClienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await getCliente(Number(id));
      setCliente(data);
      navigation.setOptions({ title: data.nombre });
    } catch {
      Alert.alert('Error', 'No se pudo cargar el cliente');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function toggleEstado() {
    if (!cliente) return;
    const esSuspendido = cliente.estado === 'suspendido';
    Alert.alert(
      esSuspendido ? 'Activar servicio' : 'Cortar servicio',
      `¿${esSuspendido ? 'Activar' : 'Suspender'} el servicio de ${cliente.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: esSuspendido ? 'Activar' : 'Cortar',
          style: esSuspendido ? 'default' : 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              if (esSuspendido) await activarCliente(cliente.id);
              else await suspenderCliente(cliente.id);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo completar');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#111827' }} color="#FFD700" size="large" />;
  if (!cliente) return <View style={s.container}><Text style={s.empty}>Cliente no encontrado</Text></View>;

  const activo = cliente.estado === 'activo';
  const suspendido = cliente.estado === 'suspendido';
  const dias = cliente.fecha_vencimiento
    ? Math.ceil((new Date(cliente.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Estado badge */}
      <View style={[s.estadoBadge, activo ? s.badgeGreen : suspendido ? s.badgeRed : s.badgeGray]}>
        <View style={[s.dot, activo ? s.dotGreen : suspendido ? s.dotRed : s.dotGray]} />
        <Text style={[s.estadoText, activo ? s.textGreen : suspendido ? s.textRed : s.textGray]}>
          {activo ? 'Servicio Activo' : suspendido ? 'Servicio Cortado' : 'Anulado'}
        </Text>
      </View>

      {/* Vencimiento */}
      {dias !== null && (
        <View style={[s.diasCard, dias < 0 ? s.diasRojo : dias <= 5 ? s.diasOrange : s.diasGreen]}>
          <Text style={[s.diasText, dias < 0 ? s.textRed : dias <= 5 ? s.textOrange : s.textGreen]}>
            {dias < 0 ? `⚠ Vencido hace ${Math.abs(dias)} días` : dias === 0 ? '⚠ Vence hoy' : `📅 Vence en ${dias} días`}
          </Text>
        </View>
      )}

      {/* Info personal */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Información personal</Text>
        <Fila label="Nombre" value={cliente.nombre} />
        <Fila label="Teléfono" value={cliente.telefono ?? '—'} />
        <Fila label="Dirección" value={cliente.direccion ?? '—'} />
      </View>

      {/* Servicio */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Servicio</Text>
        <Fila label="Plan" value={cliente.plan?.nombre ?? '—'} />
        <Fila label="Zona" value={cliente.zona?.nombre ?? '—'} />
        <Fila label="Usuario PPPoE" value={cliente.usuario_pppoe} mono />
        <Fila label="Instalación" value={fmt(cliente.fecha_instalacion)} />
        <Fila
          label="Vencimiento"
          value={fmt(cliente.fecha_vencimiento)}
          color={dias !== null && dias < 0 ? '#f87171' : dias !== null && dias <= 5 ? '#fb923c' : undefined}
        />
      </View>

      {/* Acción */}
      {cliente.estado !== 'anulado' && (
        <TouchableOpacity
          style={[s.actionBtn, suspendido ? s.activarBtn : s.cortarBtn]}
          onPress={toggleEstado}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={suspendido ? '#111827' : '#fff'} />
            : <Text style={[s.actionText, suspendido ? { color: '#111827' } : {}]}>
                {suspendido ? '▶  Activar servicio' : '⬛  Cortar servicio'}
              </Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const BG = '#111827'; const CARD = '#1F2937'; const BORDER = '#374151'; const GOLD = '#FFD700';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 60, fontSize: 15 },
  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  badgeGreen: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)' },
  badgeRed: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.2)' },
  badgeGray: { backgroundColor: 'rgba(156,163,175,0.08)', borderColor: 'rgba(156,163,175,0.2)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#f87171' },
  dotGray: { backgroundColor: '#9CA3AF' },
  estadoText: { fontSize: 14, fontWeight: '700' },
  textGreen: { color: '#4ade80' },
  textRed: { color: '#f87171' },
  textGray: { color: '#9CA3AF' },
  textOrange: { color: '#fb923c' },
  diasCard: { borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1 },
  diasRojo: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.2)' },
  diasOrange: { backgroundColor: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.2)' },
  diasGreen: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)' },
  diasText: { fontWeight: '600', fontSize: 13 },
  card: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: GOLD, letterSpacing: 1.5, marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
  filaLabel: { color: '#9CA3AF', fontSize: 13 },
  filaValue: { color: '#F9FAFB', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12, color: '#FFD700' },
  actionBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  cortarBtn: { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: '#f87171' },
  activarBtn: { backgroundColor: GOLD },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
