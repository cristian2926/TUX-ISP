import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { useSession } from '@/hooks/useSession';
import { loginAdmin, loginCliente } from '@/services/api';

const { width: W } = Dimensions.get('window');

function Pinguino({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
      <Ellipse cx="50" cy="72" rx="30" ry="36" fill="#1a1a2e" />
      <Ellipse cx="50" cy="78" rx="17" ry="24" fill="#F0F0F0" />
      <Ellipse cx="50" cy="34" rx="22" ry="22" fill="#1a1a2e" />
      <Ellipse cx="50" cy="36" rx="13" ry="13" fill="#F0F0F0" />
      <Circle cx="44" cy="31" r="4" fill="#1a1a2e" />
      <Circle cx="45.2" cy="30" r="1.5" fill="white" />
      <Circle cx="56" cy="31" r="4" fill="#1a1a2e" />
      <Circle cx="57.2" cy="30" r="1.5" fill="white" />
      <Ellipse cx="50" cy="40" rx="6" ry="4" fill="#FFD700" />
      <Ellipse cx="22" cy="72" rx="9" ry="22" fill="#1a1a2e" rotation="-10" origin="22, 72" />
      <Ellipse cx="78" cy="72" rx="9" ry="22" fill="#1a1a2e" rotation="10" origin="78, 72" />
      <Ellipse cx="40" cy="108" rx="10" ry="5" fill="#FFD700" rotation="-10" origin="40, 108" />
      <Ellipse cx="60" cy="108" rx="10" ry="5" fill="#FFD700" rotation="10" origin="60, 108" />
      <Circle cx="62" cy="18" r="4" fill="#FFD700" opacity="0.9" />
      <Circle cx="62" cy="18" r="2" fill="white" opacity="0.6" />
    </Svg>
  );
}

export default function LoginScreen() {
  const { signIn } = useSession();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);

  const esAdmin = usuario.includes('@');

  async function handleLogin() {
    if (!usuario.trim() || !clave.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu usuario y contraseña.');
      return;
    }
    setLoading(true);
    try {
      if (esAdmin) {
        const res = await loginAdmin(usuario.trim(), clave);
        await signIn({ token: res.access_token, role: 'admin', nombre: 'Admin' });
      } else {
        const res = await loginCliente(usuario.trim(), clave.trim());
        await signIn({ token: res.access_token, role: 'cliente', nombre: res.nombre, clienteId: res.cliente_id });
      }
    } catch (e: any) {
      Alert.alert('Error al ingresar', e.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      {/* Círculos decorativos */}
      <View style={[s.circle, { width: 260, height: 260, top: '10%', left: -60 }]} />
      <View style={[s.circle, { width: 200, height: 200, bottom: '15%', right: -80 }]} />
      <View style={[s.circleSm, { top: '20%', right: W * 0.1 }]} />
      <View style={[s.circleSm, { bottom: '25%', left: W * 0.15 }]} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Pingüino + título */}
        <View style={s.brand}>
          <View style={s.pingoWrap}>
            <View style={s.pingoGlow} />
            <View style={s.pingoBg}>
              <Pinguino size={72} />
            </View>
          </View>

          <View style={s.titleRow}>
            <Text style={s.tux}>TUX</Text>
            <Text style={s.tell}>TELL</Text>
          </View>

          <View style={s.subtitleRow}>
            <View style={s.line} />
            <Text style={s.subtitleText}>SISTEMA ISP</Text>
            <View style={s.line} />
          </View>
        </View>

        {/* Card */}
        <View style={s.card}>
          {/* Barra dorada superior */}
          <View style={s.goldBar} />

          <View style={s.cardBody}>
            <Text style={s.inputLabel}>USUARIO</Text>
            <TextInput
              style={s.input}
              value={usuario}
              onChangeText={setUsuario}
              placeholder="DNI o correo electrónico"
              placeholderTextColor="#4B5563"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[s.inputLabel, { marginTop: 14 }]}>
              {esAdmin ? 'CONTRASEÑA' : 'PIN'}
            </Text>
            <View style={s.inputWrap}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0, paddingRight: 44 }]}
                value={clave}
                onChangeText={setClave}
                placeholder="••••••••"
                placeholderTextColor="#4B5563"
                secureTextEntry={!mostrarClave}
                keyboardType="default"
                autoComplete="off"
                autoCorrect={false}
                maxLength={esAdmin ? 100 : 4}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setMostrarClave(v => !v)}>
                <Text style={s.eyeIcon}>{mostrarClave ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={s.btnText}>INGRESAR AL SISTEMA</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer card */}
          <View style={s.cardFooter}>
            <Text style={s.footerDomain}>tuxtell.net</Text>
            <View style={s.statusRow}>
              <View style={s.greenDot} />
              <Text style={s.statusText}>Sistema activo</Text>
            </View>
          </View>
        </View>

        <Text style={s.bottomText}>tuxtell.net</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GOLD = '#FFD700';
const BG = '#111827';
const CARD = '#1F2937';
const BORDER = '#374151';

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  // Decoración
  circle: {
    position: 'absolute', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.06)',
  },
  circleSm: {
    position: 'absolute', width: 8, height: 8,
    borderRadius: 4, backgroundColor: 'rgba(255,215,0,0.2)',
  },

  // Brand
  brand: { alignItems: 'center', marginBottom: 28 },
  pingoWrap: { position: 'relative', marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  pingoGlow: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,215,0,0.15)',
    transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }],
  },
  pingoBg: {
    backgroundColor: CARD, borderRadius: 50, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  titleRow: { flexDirection: 'row' },
  tux: { fontSize: 34, fontWeight: '900', color: GOLD, letterSpacing: 2 },
  tell: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  line: { flex: 1, height: 1, backgroundColor: BORDER },
  subtitleText: { color: '#9CA3AF', fontSize: 10, letterSpacing: 4 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  goldBar: { height: 3, backgroundColor: GOLD },
  cardBody: { padding: 22 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 2, marginBottom: 8 },
  input: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#fff',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12,
  },
  eyeBtn: { position: 'absolute', right: 14, padding: 6 },
  eyeIcon: { fontSize: 18 },
  btn: {
    backgroundColor: GOLD, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: BG, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // Footer card
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  footerDomain: { fontSize: 11, color: '#4B5563' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  statusText: { fontSize: 11, color: '#4ade80', fontWeight: '600' },

  bottomText: { textAlign: 'center', fontSize: 11, color: '#4B5563', marginTop: 16 },
});
