import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { getMisPagos, Pago } from '@/services/api';

const METODO_LABEL: Record<string, string> = {
  efectivo: '💵 Efectivo',
  transferencia: '🏦 Transferencia',
  deposito: '🏧 Depósito',
  tarjeta: '💳 Tarjeta',
};

function PagoCard({ item }: { item: Pago }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.mes}>{formatMes(item.mes_pagado)}</Text>
          <Text style={styles.fecha}>Pagado el {fmt(item.fecha_pago)}</Text>
        </View>
        <Text style={styles.monto}>Q {item.monto.toFixed(2)}</Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.metodo}>{METODO_LABEL[item.metodo_pago] ?? item.metodo_pago}</Text>
        {item.referencia && <Text style={styles.ref}>Ref: {item.referencia}</Text>}
      </View>
    </View>
  );
}

export default function MisPagosScreen() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (p = 1) => {
    try {
      const data = await getMisPagos(p);
      setPagos(p === 1 ? data.items : (prev) => [...prev, ...data.items]);
      setTotalPages(data.pages);
      setPage(p);
    } catch {
      // sin cambios
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1); }, []);

  function onRefresh() {
    setRefreshing(true);
    load(1);
  }

  function onEndReached() {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      load(page + 1);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1e40af" size="large" />;

  return (
    <FlatList
      style={styles.container}
      data={pagos}
      keyExtractor={(i) => String(i.id)}
      renderItem={({ item }) => <PagoCard item={item} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>Aún no hay pagos registrados</Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color="#1e40af" style={{ marginTop: 12 }} /> : null
      }
      ListHeaderComponent={
        <Text style={styles.total}>{pagos.length > 0 ? `${pagos.length} pago${pagos.length !== 1 ? 's' : ''} encontrado${pagos.length !== 1 ? 's' : ''}` : ''}</Text>
      }
    />
  );
}

function fmt(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatMes(mes: string): string {
  const [y, m] = mes.split('-');
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[parseInt(m, 10)]} ${y}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  total: { color: '#6b7280', fontSize: 12, marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mes: { fontWeight: '700', fontSize: 16, color: '#111827' },
  fecha: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  monto: { fontWeight: '900', fontSize: 20, color: '#16a34a' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  metodo: { color: '#374151', fontSize: 13 },
  ref: { color: '#9ca3af', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 50 },
  emptyText: { color: '#9ca3af', marginTop: 12, fontSize: 15 },
});
