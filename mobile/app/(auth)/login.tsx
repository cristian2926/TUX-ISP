import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '@/hooks/useSession';
import { loginAdmin, loginCliente } from '@/services/api';

type Rol = 'admin' | 'cliente';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [rol, setRol] = useState<Rol>('cliente');
  const [campo1, setCampo1] = useState(''); // email (admin) | teléfono (cliente)
  const [campo2, setCampo2] = useState(''); // password (admin) | pin (cliente)
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!campo1.trim() || !campo2.trim()) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      if (rol === 'admin') {
        const res = await loginAdmin(campo1.trim(), campo2);
        await signIn({ token: res.access_token, role: 'admin', nombre: 'Admin' });
      } else {
        const res = await loginCliente(campo1.trim(), campo2.trim());
        await signIn({
          token: res.access_token,
          role: 'cliente',
          nombre: res.nombre,
          clienteId: res.cliente_id,
        });
      }
    } catch (e: any) {
      console.error('LOGIN ERROR:', e?.message, e?.name, JSON.stringify(e));
      Alert.alert('Error', e.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  async function testNetwork() {
    try {
      const r = await fetch('https://tuxtell.duckdns.org/api/health');
      const text = await r.text();
      Alert.alert('VPS OK', text);
    } catch (e: any) {
      Alert.alert('VPS FALLA', e.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>TUXTELL</Text>
        <Text style={styles.subtitle}>Sistema de Gestión ISP</Text>
      </View>

      {/* Selector de rol */}
      <View style={styles.rolContainer}>
        {(['cliente', 'admin'] as Rol[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rolBtn, rol === r && styles.rolBtnActive]}
            onPress={() => { setRol(r); setCampo1(''); setCampo2(''); }}
          >
            <Text style={[styles.rolText, rol === r && styles.rolTextActive]}>
              {r === 'cliente' ? 'Cliente' : 'Administrador'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Formulario */}
      <View style={styles.form}>
        <Text style={styles.label}>
          {rol === 'admin' ? 'Correo electrónico' : 'Teléfono'}
        </Text>
        <TextInput
          style={styles.input}
          value={campo1}
          onChangeText={setCampo1}
          placeholder={rol === 'admin' ? 'admin@tuxtell.com' : '555-1234'}
          keyboardType={rol === 'cliente' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>
          {rol === 'admin' ? 'Contraseña' : 'PIN (4 dígitos)'}
        </Text>
        <TextInput
          style={styles.input}
          value={campo2}
          onChangeText={setCampo2}
          placeholder={rol === 'admin' ? '••••••••' : '••••'}
          secureTextEntry
          keyboardType={rol === 'cliente' ? 'numeric' : 'default'}
          maxLength={rol === 'cliente' ? 4 : 100}
        />

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.loginBtnText}>Ingresar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={testNetwork} style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>Probar red</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#1e40af';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  logo: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  subtitle: { color: '#bfdbfe', marginTop: 6, fontSize: 14 },
  rolContainer: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 24,
    borderRadius: 12, backgroundColor: '#1d3a8a', overflow: 'hidden',
  },
  rolBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  rolBtnActive: { backgroundColor: '#fff' },
  rolText: { color: '#93c5fd', fontWeight: '600' },
  rolTextActive: { color: BLUE },
  form: {
    backgroundColor: '#fff', marginHorizontal: 24,
    borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#111827', backgroundColor: '#f9fafb',
  },
  loginBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
