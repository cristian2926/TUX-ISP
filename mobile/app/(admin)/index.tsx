import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getClientes, ClienteListItem } from '@/services/api';

const ESTADO_COLOR: Record<string, string> = {
  activo: '#16a34a',
  suspendido: '#dc2626',
  anulado: '#6b7280',
};

export default function AdminClientesScreen() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteListItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p = 1, s = search) => {
    try {
      const data = await getClientes({ page: p, search: s || undefined });
      setClientes(p === 1 ? data.items : (prev) => [...prev, ...data.items]);
      setTotalPages(data.pages);
      setPage(p);
    } catch (e) {
      // mantiene lista actual en error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { load(1); }, []);

  function onSearch(text: string) {
    setSearch(text);
    setLoading(true);
    load(1, text);
  }

  function onRefresh() {
    setRefreshing(true);
    load(1);
  }

  function onEndReached() {
    if (page < totalPages) load(page + 1);
  }

  function renderItem({ item }: { item: ClienteListItem }) {
    const color = ESTADO_COLOR[item.estado] ?? '#6b7280';
    const dias = item.fecha_vencimiento
      ? Math.ceil((new Date(item.fecha_vencimiento).getTime() - Date.now()) / 86400000)
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(admin)/cliente/${item.id}`)}
      >
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.sub}>{item.plan?.nombre ?? '—'} · {item.telefono ?? 'Sin teléfono'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.estado}</Text>
          </View>
        </View>
        {dias !== null && (
          <Text style={[styles.vence, dias < 0 ? styles.vencido : dias <= 5 ? styles.proximo : styles.ok]}>
            {dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o usuario..."
          value={search}
          onChangeText={onSearch}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(admin)/nuevo-cliente')}
        >
          <Text style={styles.newBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {loading && clientes.length === 0
        ? <ActivityIndicator style={{ marginTop: 40 }} color="#1e40af" size="large" />
        : (
          <FlatList
            data={clientes}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <Text style={styles.empty}>No se encontraron clientes</Text>
            }
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff' },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  newBtn: { backgroundColor: '#1e40af', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  nombre: { fontWeight: '700', fontSize: 15, color: '#111827' },
  sub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  vence: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  vencido: { color: '#dc2626' },
  proximo: { color: '#d97706' },
  ok: { color: '#16a34a' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
