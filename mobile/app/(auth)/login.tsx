import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '@/hooks/useSession';
import { loginAdmin, loginCliente } from '@/services/api';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);

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
        await signIn({
          token: res.access_token,
          role: 'cliente',
          nombre: res.nombre,
          clienteId: res.cliente_id,
        });
      }
    } catch (e: any) {
      Alert.alert('Error al ingresar', e.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.logo}>TUXTELL</Text>
        <Text style={styles.subtitle}>Sistema de Gestión ISP</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Iniciar sesión</Text>

        <TextInput
          style={styles.input}
          value={usuario}
          onChangeText={setUsuario}
          placeholder="DNI o correo electrónico"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          value={clave}
          onChangeText={setClave}
          placeholder={esAdmin ? 'Contraseña' : 'PIN (fecha instalación DDMM)'}
          placeholderTextColor="#9ca3af"
          secureTextEntry
          keyboardType={esAdmin ? 'default' : 'numeric'}
          maxLength={esAdmin ? 100 : 4}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#1e40af';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE },
  header: { alignItems: 'center', paddingTop: 100, paddingBottom: 48 },
  logo: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 6 },
  subtitle: { color: '#bfdbfe', marginTop: 8, fontSize: 14, letterSpacing: 1 },
  form: {
    backgroundColor: '#fff', marginHorizontal: 24,
    borderRadius: 20, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  formTitle: {
    fontSize: 18, fontWeight: '700', color: '#111827',
    marginBottom: 20, textAlign: 'center',
  },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: '#111827', backgroundColor: '#f9fafb',
    marginBottom: 14,
  },
  loginBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 6,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
});
