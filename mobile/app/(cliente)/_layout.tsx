import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '@/hooks/useSession';

export default function ClienteLayout() {
  const { session } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e40af' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#1e40af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Cuenta',
          tabBarLabel: 'Cuenta',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
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
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
