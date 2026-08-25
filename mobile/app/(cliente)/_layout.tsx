import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '@/hooks/useSession';

export default function ClienteLayout() {
  const { session } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { fontWeight: '800', color: '#F9FAFB' },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#374151', borderTopWidth: 1 },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#4B5563',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: session?.nombre ?? 'Mi Cuenta',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
          headerTitle: 'Tuxtell ISP',
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
