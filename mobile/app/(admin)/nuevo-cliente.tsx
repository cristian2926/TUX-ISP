import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { crearCliente, getZonas, getPlanes } from '@/services/api';

type Opcion = { id: number; nombre: string; precio?: number };

function Campo({ label, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, maxLength }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; secureTextEntry?: boolean; maxLength?: number;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoCapitalize="none"
      />
    </View>
  );
}

function Selector({ label, opciones, selected, onSelect, showPrecio = false }: {
  label: string; opciones: Opcion[]; selected: number | null; onSelect: (id: number) => void; showPrecio?: boolean;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {opciones.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[s.chip, selected === o.id && s.chipSelected]}
            onPress={() => onSelect(o.id)}
          >
            <Text style={[s.chipText, selected === o.id && s.chipTextSelected]}>
              {o.nombre}{showPrecio && o.precio !== undefined ? `\nQ ${o.precio.toFixed(0)}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function NuevoClienteScreen() {
  const router = useRouter();
  const [zonas, setZonas] = useState<Opcion[]>([]);
  const [planes, setPlanes] = useState<Opcion[]>([]);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [usuarioPppoe, setUsuarioPppoe] = useState('');
  const [passwordPppoe, setPasswordPppoe] = useState('');
  const [zonaId, setZonaId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [tieneTV, setTieneTV] = useState(false);

  useEffect(() => {
    getZonas().then(setZonas).catch(() => {});
    getPlanes().then(setPlanes).catch(() => {});
  }, []);

  async function guardar() {
    if (!nombre.trim() || !usuarioPppoe.trim() || !passwordPppoe.trim() || !zonaId || !planId) {
      Alert.alert('Campos requeridos', 'Completa nombre, usuario PPPoE, contraseña, zona y plan.');
      return;
    }
    setSaving(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      await crearCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        usuario_pppoe: usuarioPppoe.trim(),
        password_pppoe: passwordPppoe,
        zona_id: zonaId,
        plan_id: planId,
        fecha_instalacion: hoy,
        tiene_tv: tieneTV,
        tipo_conexion: 'inalambrico',
        estado_equipo: 'sin_equipo',
      });
      const ddmm = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' }).replace('/', '');
      Alert.alert('✓ Cliente creado', `${nombre} fue registrado.\n\nPIN de acceso a la app: ${ddmm} (hoy en DDMM)`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

      <Text style={s.sectionTitle}>DATOS PERSONALES</Text>
      <Campo label="Nombre completo *" value={nombre} onChangeText={setNombre} placeholder="Juan Pérez" />
      <Campo label="Teléfono" value={telefono} onChangeText={setTelefono} placeholder="555-1234" keyboardType="phone-pad" />
      <Campo label="Dirección" value={direccion} onChangeText={setDireccion} placeholder="Calle principal #10" />

      <Text style={s.sectionTitle}>CREDENCIALES PPPoE</Text>
      <Campo label="Usuario PPPoE (DNI) *" value={usuarioPppoe} onChangeText={setUsuarioPppoe} placeholder="12345678" />
      <Campo label="Contraseña PPPoE *" value={passwordPppoe} onChangeText={setPasswordPppoe} placeholder="••••••••" secureTextEntry />

      <View style={s.pinHint}>
        <Text style={s.pinHintText}>📌 El PIN de la app se asigna automáticamente: fecha de instalación en formato DDMM</Text>
      </View>

      <Text style={s.sectionTitle}>SERVICIO</Text>
      <Selector label="Zona *" opciones={zonas} selected={zonaId} onSelect={setZonaId} />
      <Selector label="Plan *" opciones={planes} selected={planId} onSelect={setPlanId} showPrecio />

      <View style={s.switchRow}>
        <View>
          <Text style={s.label}>¿Incluye TV?</Text>
          <Text style={s.switchSub}>Servicio de televisión adicional</Text>
        </View>
        <Switch value={tieneTV} onValueChange={setTieneTV} trackColor={{ true: '#FFD700', false: '#374151' }} thumbColor={tieneTV ? '#111827' : '#9CA3AF'} />
      </View>

      <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={guardar} disabled={saving}>
        {saving ? <ActivityIndicator color="#111827" /> : <Text style={s.btnText}>CREAR CLIENTE</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 2, marginTop: 20, marginBottom: 10 },
  campo: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
  chip: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#FFFFFF' },
  chipSelected: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' },
  chipText: { color: '#64748B', fontWeight: '500', fontSize: 13, textAlign: 'center' },
  chipTextSelected: { color: '#D97706', fontWeight: '700' },
  pinHint: { backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 12, marginBottom: 8 },
  pinHintText: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 20, marginTop: 8 },
  switchSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  btn: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});
