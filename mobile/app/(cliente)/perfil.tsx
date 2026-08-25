import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSession } from '@/hooks/useSession';
import { cambiarPin } from '@/services/api';

export default function PerfilScreen() {
  const { session, signOut } = useSession();
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCambiarPin() {
    if (!pinActual || !pinNuevo || !pinConfirm) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.');
      return;
    }
    if (pinNuevo.length !== 4 || !/^\d{4}$/.test(pinNuevo)) {
      Alert.alert('PIN inválido', 'El PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    if (pinNuevo !== pinConfirm) {
      Alert.alert('PIN no coincide', 'El PIN nuevo y la confirmación no son iguales.');
      return;
    }
    setSaving(true);
    try {
      await cambiarPin(pinActual, pinNuevo);
      setPinActual('');
      setPinNuevo('');
      setPinConfirm('');
      Alert.alert('PIN actualizado', 'Tu PIN fue cambiado correctamente. Úsalo la próxima vez que ingreses.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cambiar el PIN');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Info del cliente */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mi perfil</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Nombre</Text>
          <Text style={styles.rowValue}>{session?.nombre ?? '—'}</Text>
        </View>
      </View>

      {/* Cambiar PIN */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cambiar PIN</Text>
        <Text style={styles.hint}>
          Por defecto tu PIN es la fecha de instalación en formato DDMM (ej. 2508).
          Aquí puedes cambiarlo por uno personalizado de 4 dígitos.
        </Text>

        <Text style={styles.label}>PIN actual</Text>
        <TextInput
          style={styles.input}
          value={pinActual}
          onChangeText={setPinActual}
          placeholder="PIN actual"
          secureTextEntry
          keyboardType="numeric"
          maxLength={4}
        />

        <Text style={styles.label}>PIN nuevo (4 dígitos)</Text>
        <TextInput
          style={styles.input}
          value={pinNuevo}
          onChangeText={setPinNuevo}
          placeholder="Nuevo PIN"
          secureTextEntry
          keyboardType="numeric"
          maxLength={4}
        />

        <Text style={styles.label}>Confirmar PIN nuevo</Text>
        <TextInput
          style={styles.input}
          value={pinConfirm}
          onChangeText={setPinConfirm}
          placeholder="Repite el PIN"
          secureTextEntry
          keyboardType="numeric"
          maxLength={4}
        />

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleCambiarPin}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Guardar PIN</Text>}
        </TouchableOpacity>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const BLUE = '#1e40af';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    backgroundColor: '#f9fafb', color: '#111827',
  },
  btn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 18,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    borderWidth: 1, borderColor: '#fca5a5', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginBottom: 40,
  },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
});
