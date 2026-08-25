import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getMisPagos, Pago } from '@/services/api';

const METODO_ICON: Record<string, string> = {
  efectivo: '💵', transferencia: '🏦', deposito: '🏧', tarjeta: '💳',
};
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function fmt(d: string) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function formatMes(mes: string) { const [y, m] = mes.split('-'); return `${MESES[parseInt(m, 10)]} ${y}`; }

function PagoCard({ item }: { item: Pago }) {
  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View style={s.iconCircle}>
          <Text style={{ fontSize: 20 }}>{METODO_ICON[item.metodo_pago] ?? '💰'}</Text>
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={s.mes}>{formatMes(item.mes_pagado)}</Text>
          <Text style={s.fecha}>Pagado {fmt(item.fecha_pago)}</Text>
          <Text style={s.metodo}>{item.metodo_pago.charAt(0).toUpperCase() + item.metodo_pago.slice(1)}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.monto}>Q {item.monto.toFixed(2)}</Text>
        <View style={s.pagadoBadge}>
          <Text style={s.pagadoText}>✓ Pagado</Text>
        </View>
        {item.referencia && <Text style={s.ref}>Ref: {item.referencia}</Text>}
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
      setPagos(p === 1 ? data.items : prev => [...prev, ...data.items]);
      setTotalPages(data.pages);
      setPage(p);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(1); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#111827' }} color="#FFD700" size="large" />;

  return (
    <FlatList
      style={s.container}
      data={pagos}
      keyExtractor={i => String(i.id)}
      renderItem={({ item }) => <PagoCard item={item} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor="#FFD700" />}
      onEndReached={() => { if (page < totalPages && !loadingMore) { setLoadingMore(true); load(page + 1); } }}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        pagos.length > 0
          ? <Text style={s.total}>{pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}</Text>
          : null
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={s.emptyText}>Sin pagos registrados</Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#FFD700" style={{ marginTop: 12 }} /> : null}
    />
  );
}

const BG = '#111827'; const CARD = '#1F2937'; const BORDER = '#374151'; const GOLD = '#FFD700';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  total: { color: '#4B5563', fontSize: 12, marginBottom: 12, letterSpacing: 0.5 },
  card: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  mes: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  fecha: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  metodo: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  monto: { fontSize: 18, fontWeight: '900', color: '#4ade80' },
  pagadoBadge: { backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  pagadoText: { fontSize: 11, color: '#4ade80', fontWeight: '700' },
  ref: { fontSize: 11, color: '#4B5563', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#4B5563', marginTop: 12, fontSize: 15 },
});
