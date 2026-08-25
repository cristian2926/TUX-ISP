import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { crearCliente, getZonas, getPlanes } from '@/services/api';

type Opcion = { id: number; nombre: string };

function Campo({
  label, value, onChangeText, placeholder, keyboardType = 'default',
  secureTextEntry = false, maxLength,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; secureTextEntry?: boolean; maxLength?: number;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoCapitalize="none"
      />
    </View>
  );
}

function Selector({ label, opciones, selected, onSelect }: {
  label: string; opciones: Opcion[]; selected: number | null; onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {opciones.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[styles.chip, selected === o.id && styles.chipSelected]}
            onPress={() => onSelect(o.id)}
          >
            <Text style={[styles.chipText, selected === o.id && styles.chipTextSelected]}>
              {o.nombre}
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
      Alert.alert('Campos requeridos', 'Completa nombre, PPPoE, zona y plan.');
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
      Alert.alert('Cliente creado', `${nombre} fue registrado correctamente.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Campo label="Nombre completo *" value={nombre} onChangeText={setNombre} placeholder="Juan Pérez" />
      <Campo label="Teléfono" value={telefono} onChangeText={setTelefono} placeholder="555-1234" keyboardType="phone-pad" />
      <Campo label="Dirección" value={direccion} onChangeText={setDireccion} placeholder="Calle principal #10" />
      <Campo label="Usuario PPPoE *" value={usuarioPppoe} onChangeText={setUsuarioPppoe} placeholder="juan.perez" />
      <Campo label="Contraseña PPPoE *" value={passwordPppoe} onChangeText={setPasswordPppoe} placeholder="••••••••" secureTextEntry />

      <Selector label="Zona *" opciones={zonas} selected={zonaId} onSelect={setZonaId} />
      <Selector label="Plan *" opciones={planes} selected={planId} onSelect={setPlanId} />

      <View style={styles.switchRow}>
        <Text style={styles.label}>¿Incluye TV?</Text>
        <Switch value={tieneTV} onValueChange={setTieneTV} trackColor={{ true: '#1e40af' }} />
      </View>

      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={guardar} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Crear Cliente</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  campo: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    backgroundColor: '#fff', color: '#111827',
  },
  chip: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#1e40af', backgroundColor: '#eff6ff' },
  chipText: { color: '#6b7280', fontWeight: '500' },
  chipTextSelected: { color: '#1e40af', fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#1e40af', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
