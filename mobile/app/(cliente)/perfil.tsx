import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { cambiarPin } from '@/services/api';

export default function PerfilScreen() {
  const { session, signOut } = useSession();
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCambiarPin() {
    if (!pinActual || !pinNuevo || !pinConfirm) { Alert.alert('Campos requeridos', 'Completa todos los campos.'); return; }
    if (pinNuevo.length !== 4 || !/^\d{4}$/.test(pinNuevo)) { Alert.alert('PIN inválido', 'El PIN debe tener exactamente 4 dígitos.'); return; }
    if (pinNuevo !== pinConfirm) { Alert.alert('PIN no coincide', 'El PIN nuevo y la confirmación no son iguales.'); return; }
    setSaving(true);
    try {
      await cambiarPin(pinActual, pinNuevo);
      setPinActual(''); setPinNuevo(''); setPinConfirm('');
      Alert.alert('PIN actualizado', 'Tu PIN fue cambiado correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cambiar el PIN');
    } finally { setSaving(false); }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Info */}
      <View style={s.card}>
        <Text style={s.cardTitle}>MI PERFIL</Text>
        <View style={s.fila}>
          <Text style={s.filaLabel}>Nombre</Text>
          <Text style={s.filaValue}>{session?.nombre ?? '—'}</Text>
        </View>
        <View style={[s.fila, { borderBottomWidth: 0 }]}>
          <Text style={s.filaLabel}>Rol</Text>
          <View style={s.rolBadge}>
            <Text style={s.rolText}>Cliente</Text>
          </View>
        </View>
      </View>

      {/* Cambiar PIN */}
      <View style={s.card}>
        <Text style={s.cardTitle}>CAMBIAR PIN</Text>
        <Text style={s.hint}>
          Tu PIN por defecto es la fecha de instalación (DDMM). Aquí puedes cambiarlo por uno personalizado de 4 dígitos.
        </Text>

        {[
          { label: 'PIN actual', value: pinActual, set: setPinActual, placeholder: '••••' },
          { label: 'PIN nuevo (4 dígitos)', value: pinNuevo, set: setPinNuevo, placeholder: '••••' },
          { label: 'Confirmar PIN nuevo', value: pinConfirm, set: setPinConfirm, placeholder: '••••' },
        ].map(({ label, value, set, placeholder }) => (
          <View key={label}>
            <Text style={s.inputLabel}>{label.toUpperCase()}</Text>
            <TextInput
              style={s.input}
              value={value}
              onChangeText={set}
              placeholder={placeholder}
              placeholderTextColor="#4B5563"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        ))}

        <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleCambiarPin} disabled={saving}>
          {saving ? <ActivityIndicator color="#111827" /> : <Text style={s.btnText}>GUARDAR PIN</Text>}
        </TouchableOpacity>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
        <Text style={s.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const BG = '#111827'; const CARD = '#1F2937'; const BORDER = '#374151'; const GOLD = '#FFD700';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: GOLD, letterSpacing: 1.5, marginBottom: 14 },
  hint: { fontSize: 13, color: '#4B5563', marginBottom: 16, lineHeight: 18 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  filaLabel: { fontSize: 13, color: '#9CA3AF' },
  filaValue: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  rolBadge: { backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  rolText: { fontSize: 12, fontWeight: '700', color: GOLD },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#F9FAFB' },
  btn: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: BG, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  logoutBtn: { borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(248,113,113,0.06)' },
  logoutText: { color: '#f87171', fontWeight: '700', fontSize: 15 },
});
