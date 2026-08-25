import { Stack } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';

export default function AdminLayout() {
  const { signOut } = useSession();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E293B' },
        headerTintColor: '#F59E0B',
        headerTitleStyle: { fontWeight: '800', color: '#F9FAFB' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={s.btn}>
            <Text style={s.btnText}>Salir</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Gestión de Clientes' }} />
      <Stack.Screen name="nuevo-cliente" options={{ title: 'Nuevo Cliente' }} />
      <Stack.Screen name="cliente/[id]" options={{ title: 'Detalle' }} />
    </Stack>
  );
}

const s = StyleSheet.create({
  btn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  btnText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
});
