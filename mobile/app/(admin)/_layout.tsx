import { Stack } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';

export default function AdminLayout() {
  const { signOut } = useSession();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e40af' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Clientes' }} />
      <Stack.Screen name="nuevo-cliente" options={{ title: 'Nuevo Cliente' }} />
      <Stack.Screen name="cliente/[id]" options={{ title: 'Detalle Cliente' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logoutBtn: { marginRight: 4, paddingHorizontal: 8, paddingVertical: 4 },
  logoutText: { color: '#bfdbfe', fontWeight: '600' },
});
