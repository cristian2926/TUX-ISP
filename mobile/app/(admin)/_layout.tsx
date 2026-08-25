import { Stack } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';

export default function AdminLayout() {
  const { signOut } = useSession();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { fontWeight: '800', color: '#F9FAFB' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#111827' },
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
  btn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  btnText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
});
