import { Tabs } from 'expo-router';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';

export default function ClienteLayout() {
  const { signOut, session } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e40af' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#1e40af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Cuenta',
          tabBarLabel: 'Cuenta',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
          headerTitle: session?.nombre ?? 'Mi Cuenta',
        }}
      />
      <Tabs.Screen
        name="pagos"
        options={{
          title: 'Mis Pagos',
          tabBarLabel: 'Pagos',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💳</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutBtn: { marginRight: 4, paddingHorizontal: 8, paddingVertical: 4 },
  logoutText: { color: '#bfdbfe', fontWeight: '600' },
});
