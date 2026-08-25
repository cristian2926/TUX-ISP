import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';

function TuxtellLogo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: '#F59E0B', fontWeight: '900', fontSize: 20, letterSpacing: 0.5 }}>TUX</Text>
      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 20, letterSpacing: 0.5 }}>TELL</Text>
    </View>
  );
}

export default function AdminLayout() {
  const { signOut } = useSession();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E293B' },
        headerTintColor: '#F9FAFB',
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <TuxtellLogo />,
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity onPress={signOut} style={s.salirBtn}>
              <Text style={s.salirText}>Salir</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="atrasados"
        options={{
          headerTitle: () => <TuxtellLogo />,
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity onPress={signOut} style={s.salirBtn}>
              <Text style={s.salirText}>Salir</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="nuevo-cliente" options={{ title: 'Nuevo Cliente', headerTintColor: '#F59E0B' }} />
      <Stack.Screen name="cliente/[id]"  options={{ title: 'Detalle',        headerTintColor: '#F59E0B' }} />
    </Stack>
  );
}

const s = StyleSheet.create({
  salirBtn:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
  salirText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
});
