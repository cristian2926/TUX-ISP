import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { crearCliente, getZonas, getPlanes } from '@/services/api';

/* ── helpers ─────────────────────────────────────────────────────────────── */
type Opcion = { id: number; nombre: string; precio?: number };

function todayISO() { return new Date().toISOString().split('T')[0]; }
function ddmm(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}${m}`;
}

/* ── sub-componentes ──────────────────────────────────────────────────────── */
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={f.label}>
      {text}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
    </Text>
  );
}

function Input({ label, value, onChange, placeholder, keyboard = 'default', secure = false, required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; secure?: boolean; required?: boolean;
}) {
  return (
    <View style={f.campo}>
      <Label text={label} required={required} />
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={f.section}>
      <View style={f.sectionHeader}>
        <Text style={f.sectionIcon}>{icon}</Text>
        <Text style={f.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ToggleGroup({ options, value, onChange }: {
  options: { id: string; label: string; sub?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={f.toggleGroup}>
      {options.map(o => (
        <TouchableOpacity
          key={o.id}
          style={[f.toggleBtn, value === o.id && f.toggleBtnActive]}
          onPress={() => onChange(o.id)}
        >
          <Text style={[f.toggleLabel, value === o.id && f.toggleLabelActive]}>{o.label}</Text>
          {o.sub && <Text style={[f.toggleSub, value === o.id && { color: '#D97706' }]}>{o.sub}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PlanChip({ plan, selected, onSelect }: { plan: Opcion; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity style={[f.planChip, selected && f.planChipActive]} onPress={onSelect}>
      <Text style={[f.planNombre, selected && f.planNombreActive]}>{plan.nombre}</Text>
      {plan.precio !== undefined && (
        <Text style={[f.planPrecio, selected && { color: '#D97706' }]}>S/ {plan.precio.toFixed(0)}/mes</Text>
      )}
    </TouchableOpacity>
  );
}

/* ── pantalla ─────────────────────────────────────────────────────────────── */
export default function NuevoClienteScreen() {
  const router = useRouter();
  const [zonas,  setZonas]  = useState<Opcion[]>([]);
  const [planes, setPlanes] = useState<Opcion[]>([]);
  const [saving, setSaving] = useState(false);

  // Datos personales
  const [nombre,    setNombre]    = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [direccion, setDireccion] = useState('');

  // PPPoE
  const [usuario,   setUsuario]   = useState('');
  const [password,  setPassword]  = useState('');
  const [ipEstatica,setIpEstatica]= useState('');
  const [zonaId,    setZonaId]    = useState<number | null>(null);

  // Plan y fechas
  const [planId,       setPlanId]       = useState<number | null>(null);
  const [estado,       setEstado]       = useState<'activo'|'suspendido'>('activo');
  const [fechaInst,    setFechaInst]    = useState(todayISO());
  const [fechaVenc,    setFechaVenc]    = useState('');

  // Servicio
  const [tipoConexion, setTipoConexion] = useState<'inalambrico'|'fibra'>('inalambrico');
  const [tieneTV,      setTieneTV]      = useState(false);

  // Equipo
  const [estadoEquipo, setEstadoEquipo] = useState<'sin_equipo'|'prestado'|'comprado'>('sin_equipo');

  // Notas
  const [notas, setNotas] = useState('');

  useEffect(() => {
    getZonas().then(setZonas).catch(() => {});
    getPlanes().then(setPlanes).catch(() => {});
  }, []);

  async function guardar() {
    if (!nombre.trim() || !usuario.trim() || !password.trim() || !zonaId || !planId || !fechaInst) {
      Alert.alert('Campos requeridos', 'Completa: Nombre, Usuario PPPoE, Contraseña, Zona, Plan y Fecha de instalación.');
      return;
    }
    setSaving(true);
    try {
      await crearCliente({
        nombre:          nombre.trim(),
        telefono:        telefono.trim() || null,
        direccion:       direccion.trim() || null,
        usuario_pppoe:   usuario.trim(),
        password_pppoe:  password,
        ip_estatica:     ipEstatica.trim() || null,
        zona_id:         zonaId,
        plan_id:         planId,
        estado,
        fecha_instalacion: fechaInst,
        fecha_vencimiento: fechaVenc || null,
        tipo_conexion:   tipoConexion,
        tiene_tv:        tieneTV,
        estado_equipo:   estadoEquipo,
        notas:           notas.trim() || null,
      });
      Alert.alert(
        '✓ Cliente creado',
        `${nombre} fue registrado.\n\nPIN de app: ${ddmm(fechaInst)} (fecha instalación en DDMM)`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={f.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

      {/* ── DATOS PERSONALES ──────────────────────────────── */}
      <Section title="DATOS PERSONALES" icon="👤">
        <Input label="Nombre completo" value={nombre} onChange={setNombre} placeholder="Juan Pérez" required />
        <View style={f.row}>
          <View style={{ flex: 1 }}>
            <Input label="WhatsApp / Teléfono" value={telefono} onChange={setTelefono} placeholder="9XXXXXXXX" keyboard="phone-pad" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Input label="Dirección" value={direccion} onChange={setDireccion} placeholder="Jr. Lima 123" />
          </View>
        </View>
      </Section>

      {/* ── CONFIGURACIÓN PPPOE ───────────────────────────── */}
      <Section title="CONFIGURACIÓN PPPOE" icon="🔌">
        <View style={f.row}>
          <View style={{ flex: 1 }}>
            <Input label="Usuario PPPoE" value={usuario} onChange={setUsuario} placeholder="jquispe" required />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Input label="Contraseña PPPoE" value={password} onChange={setPassword} placeholder="••••••••" secure required />
          </View>
        </View>
        <View style={f.row}>
          <View style={{ flex: 1 }}>
            <Input label="IP Estática" value={ipEstatica} onChange={setIpEstatica} placeholder="192.168.1.100" keyboard="numeric" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Label text="Zona" required />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {zonas.map(z => (
                <TouchableOpacity
                  key={z.id}
                  style={[f.zonaChip, zonaId === z.id && f.zonaChipActive]}
                  onPress={() => setZonaId(z.id)}
                >
                  <Text style={[f.zonaChipText, zonaId === z.id && f.zonaChipTextActive]}>{z.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={f.pinHint}>
          <Text style={f.pinHintText}>📌 El PIN de la app se asigna automáticamente: fecha de instalación en formato DDMM</Text>
        </View>
      </Section>

      {/* ── PLAN Y FECHAS ─────────────────────────────────── */}
      <Section title="PLAN Y FECHAS" icon="📋">
        <Label text="Plan" required />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, marginTop: 6 }}>
          {planes.map(p => (
            <PlanChip key={p.id} plan={p} selected={planId === p.id} onSelect={() => setPlanId(p.id)} />
          ))}
        </ScrollView>

        <Label text="Estado inicial" />
        <ToggleGroup
          options={[
            { id: 'activo',     label: 'Activo'     },
            { id: 'suspendido', label: 'Suspendido' },
          ]}
          value={estado}
          onChange={v => setEstado(v as any)}
        />

        <View style={[f.row, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Label text="Fecha instalación" required />
            <TextInput
              style={f.input}
              value={fechaInst}
              onChangeText={setFechaInst}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#CBD5E1"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Label text="Fecha vencimiento" />
            <TextInput
              style={f.input}
              value={fechaVenc}
              onChangeText={setFechaVenc}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#CBD5E1"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
          </View>
        </View>
      </Section>

      {/* ── TIPO DE SERVICIO ──────────────────────────────── */}
      <Section title="TIPO DE SERVICIO" icon="📡">
        <ToggleGroup
          options={[
            { id: 'inalambrico', label: 'Inalámbrico', sub: 'Antena / AP'   },
            { id: 'fibra',       label: 'Fibra Óptica', sub: 'ONT / Splitter' },
          ]}
          value={tipoConexion}
          onChange={v => setTipoConexion(v as any)}
        />
        <View style={f.switchRow}>
          <View>
            <Text style={f.switchLabel}>📺  Servicio de TV</Text>
            <Text style={f.switchSub}>Incluye televisión</Text>
          </View>
          <Switch
            value={tieneTV}
            onValueChange={setTieneTV}
            trackColor={{ true: '#F59E0B', false: '#E2E8F0' }}
            thumbColor={tieneTV ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
      </Section>

      {/* ── EQUIPO ENTREGADO ──────────────────────────────── */}
      <Section title="EQUIPO ENTREGADO" icon="🔧">
        <ToggleGroup
          options={[
            { id: 'sin_equipo', label: 'Sin equipo' },
            { id: 'prestado',   label: 'Prestado'   },
            { id: 'comprado',   label: 'Comprado'   },
          ]}
          value={estadoEquipo}
          onChange={v => setEstadoEquipo(v as any)}
        />
      </Section>

      {/* ── NOTAS ─────────────────────────────────────────── */}
      <Section title="NOTAS" icon="📝">
        <TextInput
          style={[f.input, f.textArea]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones, referencia de ubicación..."
          placeholderTextColor="#CBD5E1"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </Section>

      {/* ── BOTONES ───────────────────────────────────────── */}
      <View style={f.botonesRow}>
        <TouchableOpacity style={f.cancelBtn} onPress={() => router.back()} disabled={saving}>
          <Text style={f.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[f.guardarBtn, saving && f.guardarDisabled]} onPress={guardar} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={f.guardarText}>💾  Guardar Cliente</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ── estilos ─────────────────────────────────────────────────────────────── */
const f = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  section: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#F59E0B', letterSpacing: 1.5 },

  campo: { marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#1E293B' },
  textArea: { minHeight: 80, paddingTop: 12 },

  toggleGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  toggleBtn: { flex: 1, minWidth: 90, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#F8FAFC' },
  toggleBtnActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  toggleLabelActive: { color: '#D97706' },
  toggleSub: { fontSize: 11, color: '#94A3B8', marginTop: 3 },

  zonaChip: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: '#F8FAFC' },
  zonaChipActive: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.07)' },
  zonaChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  zonaChipTextActive: { color: '#7C3AED', fontWeight: '700' },

  planChip: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, minWidth: 100, backgroundColor: '#F8FAFC', alignItems: 'center' },
  planChipActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' },
  planNombre: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  planNombreActive: { color: '#D97706' },
  planPrecio: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  pinHint: { backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 12, marginTop: 4 },
  pinHintText: { fontSize: 12, color: '#64748B', lineHeight: 18 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, marginTop: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  switchSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  botonesRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  guardarBtn: { flex: 2, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  guardarDisabled: { opacity: 0.7 },
  guardarText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
});
