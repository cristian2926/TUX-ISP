import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { getCliente, suspenderCliente, activarCliente, ClienteDetalle } from '@/services/api';

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  activo:    { bg: '#dcfce7', text: '#16a34a' },
  suspendido:{ bg: '#fee2e2', text: '#dc2626' },
  anulado:   { bg: '#f3f4f6', text: '#6b7280' },
};

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
    const accion = esSuspendido ? 'activar' : 'suspender';
    Alert.alert(
      `¿${esSuspendido ? 'Activar' : 'Suspender'} cliente?`,
      `Se ${accion}á el servicio de ${cliente.nombre}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: esSuspendido ? 'Activar' : 'Suspender',
          style: esSuspendido ? 'default' : 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              if (esSuspendido) await activarCliente(cliente.id);
              else await suspenderCliente(cliente.id);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo completar la acción');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1e40af" size="large" />;
  if (!cliente) return <Text style={styles.error}>Cliente no encontrado</Text>;

  const estadoStyle = ESTADO_COLOR[cliente.estado] ?? { bg: '#f3f4f6', text: '#6b7280' };
  const dias = cliente.fecha_vencimiento
    ? Math.ceil((new Date(cliente.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Estado */}
      <View style={[styles.estadoBox, { backgroundColor: estadoStyle.bg }]}>
        <Text style={[styles.estadoText, { color: estadoStyle.text }]}>
          {cliente.estado.toUpperCase()}
        </Text>
      </View>

      {/* Info principal */}
      <View style={styles.card}>
        <Fila label="Nombre" value={cliente.nombre} />
        <Fila label="Teléfono" value={cliente.telefono ?? '—'} />
        <Fila label="Dirección" value={cliente.direccion ?? '—'} />
        <Fila label="Plan" value={cliente.plan?.nombre ?? '—'} />
        <Fila label="Zona" value={cliente.zona?.nombre ?? '—'} />
        <Fila label="Usuario PPPoE" value={cliente.usuario_pppoe} mono />
        <Fila label="Instalación" value={fmt(cliente.fecha_instalacion)} />
        <Fila
          label="Vencimiento"
          value={fmt(cliente.fecha_vencimiento)}
          highlight={dias !== null && dias <= 5}
        />
        {dias !== null && (
          <Text style={[styles.diasText, dias < 0 ? styles.rojo : dias <= 5 ? styles.amarillo : styles.verde]}>
            {dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`}
          </Text>
        )}
      </View>

      {/* Acción corte / activación */}
      {cliente.estado !== 'anulado' && (
        <TouchableOpacity
          style={[
            styles.actionBtn,
            cliente.estado === 'suspendido' ? styles.activarBtn : styles.suspenderBtn,
          ]}
          onPress={toggleEstado}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.actionBtnText}>
                {cliente.estado === 'suspendido' ? '✓ Activar servicio' : '✕ Suspender servicio'}
              </Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Fila({
  label, value, mono = false, highlight = false,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={[styles.filaValue, mono && styles.mono, highlight && styles.rojo]}>
        {value}
      </Text>
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
  estadoBox: { borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 },
  estadoText: { fontWeight: '900', fontSize: 16, letterSpacing: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filaLabel: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  filaValue: { color: '#111827', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12 },
  diasText: { textAlign: 'center', fontWeight: '600', fontSize: 13, marginTop: 8 },
  rojo: { color: '#dc2626' },
  amarillo: { color: '#d97706' },
  verde: { color: '#16a34a' },
  actionBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  activarBtn: { backgroundColor: '#16a34a' },
  suspenderBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
});

import { Platform } from 'react-native';
