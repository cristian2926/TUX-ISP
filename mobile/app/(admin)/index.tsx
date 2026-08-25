import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getClientes, getDashboardStats, suspenderCliente, activarCliente, ClienteListItem } from '@/services/api';

const AVATAR_COLORS = ['#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#EC4899','#06B6D4'];

function initials(n: string): string {
  const p = n.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
}
function avatarColor(n: string): string {
  return AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length];
}

type Filtro = 'todos' | 'activo' | 'suspendido';

export default function AdminClientesScreen() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteListItem[]>([]);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState({ total: 0, activos: 0, suspendidos: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async (p = 1, s = search, f = filtro) => {
    try {
      const [data, stats] = await Promise.all([
        getClientes({ page: p, search: s || undefined, estado: f === 'todos' ? undefined : f }),
        p === 1 ? getDashboardStats().catch(() => null) : Promise.resolve(null),
      ]);
      setClientes(p === 1 ? data.items : prev => [...prev, ...data.items]);
      setTotalPages(data.pages);
      setPage(p);
      if (stats) setTotal({ total: stats.total_clientes, activos: stats.clientes_activos, suspendidos: stats.clientes_suspendidos });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filtro]);

  useEffect(() => { load(1); }, []);

  function applyFiltro(f: Filtro) {
    setFiltro(f);
    setLoading(true);
    setClientes([]);
    load(1, search, f);
  }

  function onSearch(text: string) {
    setSearch(text);
    setLoading(true);
    setClientes([]);
    load(1, text, filtro);
  }

  async function toggleEstado(item: ClienteListItem) {
    const esSuspendido = item.estado === 'suspendido';
    Alert.alert(
      esSuspendido ? 'Activar servicio' : 'Cortar servicio',
      `¿${esSuspendido ? 'Activar' : 'Suspender'} a ${item.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: esSuspendido ? 'Activar' : 'Cortar',
          style: esSuspendido ? 'default' : 'destructive',
          onPress: async () => {
            setSaving(item.id);
            try {
              if (esSuspendido) await activarCliente(item.id);
              else await suspenderCliente(item.id);
              load(1);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo completar');
            } finally {
              setSaving(null);
            }
          },
        },
      ],
    );
  }

  function renderItem({ item }: { item: ClienteListItem }) {
    const activo = item.estado === 'activo';
    const suspendido = item.estado === 'suspendido';
    const dias = item.fecha_vencimiento
      ? Math.ceil((new Date(item.fecha_vencimiento).getTime() - Date.now()) / 86400000)
      : null;
    const color = avatarColor(item.nombre);
    const isSaving = saving === item.id;

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.avatar, { backgroundColor: color + '22', borderColor: color + '44' }]}>
            <Text style={[s.avatarText, { color }]}>{initials(item.nombre)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.nombre}>{item.nombre}</Text>
            <Text style={s.usuario}>ID: {item.usuario_pppoe}</Text>
          </View>
          <View style={[s.badge, activo ? s.badgeGreen : suspendido ? s.badgeRed : s.badgeGray]}>
            <View style={[s.dot, activo ? s.dotGreen : suspendido ? s.dotRed : s.dotGray]} />
            <Text style={[s.badgeText, activo ? s.textGreen : suspendido ? s.textRed : s.textGray]}>
              {activo ? 'Activo' : suspendido ? 'Cortado' : 'Anulado'}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.cardMid}>
          <View>
            <Text style={s.midLabel}>PLAN</Text>
            <Text style={s.midValue}>{item.plan?.nombre ?? '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.midLabel}>FACTURACIÓN</Text>
            <Text style={[s.midValue,
              dias === null ? s.textMuted
              : dias < 0 ? s.textRed
              : dias <= 5 ? s.textOrange
              : s.textGreen
            ]}>
              {dias === null ? '—' : dias < 0 ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? 'Vence hoy' : `Vence en ${dias}d`}
            </Text>
          </View>
        </View>

        {item.estado !== 'anulado' && (
          <View style={s.cardBtns}>
            <TouchableOpacity
              style={[s.actionBtn, suspendido ? s.activarBtn : s.cortarBtn]}
              onPress={() => toggleEstado(item)}
              disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator size="small" color={suspendido ? '#111827' : '#fff'} />
                : <Text style={[s.actionText, suspendido ? { color: '#111827' } : { color: '#fff' }]}>
                    {suspendido ? '▶ Activar' : '⬛ Cortar'}
                  </Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.manageBtn}
              onPress={() => router.push(`/(admin)/cliente/${item.id}`)}
            >
              <Text style={s.manageBtnText}>⚙ Gestionar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Stats bar */}
      <View style={s.statsBar}>
        {[
          { label: 'Total', value: total.total },
          { label: 'Activos', value: total.activos, color: '#4ade80' },
          { label: 'Cortados', value: total.suspendidos, color: '#f87171' },
        ].map(st => (
          <View key={st.label} style={s.statItem}>
            <Text style={[s.statValue, st.color ? { color: st.color } : {}]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
        <TouchableOpacity style={s.newBtn} onPress={() => router.push('/(admin)/nuevo-cliente')}>
          <Text style={s.newBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por nombre o DNI..."
          placeholderTextColor="#4B5563"
          value={search}
          onChangeText={onSearch}
        />
      </View>

      {/* Filtros */}
      <View style={s.filtroRow}>
        {(['todos', 'activo', 'suspendido'] as Filtro[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filtroChip, filtro === f && s.filtroChipActive]}
            onPress={() => applyFiltro(f)}
          >
            <Text style={[s.filtroText, filtro === f && s.filtroTextActive]}>
              {f === 'todos' ? `Todos (${total.total})` : f === 'activo' ? `Activos (${total.activos})` : `Cortados (${total.suspendidos})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && clientes.length === 0
        ? <ActivityIndicator style={{ marginTop: 60 }} color="#FFD700" size="large" />
        : (
          <FlatList
            data={clientes}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor="#FFD700" />}
            onEndReached={() => { if (page < totalPages) load(page + 1); }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<Text style={s.empty}>No se encontraron clientes</Text>}
          />
        )}
    </View>
  );
}

const BG = '#111827'; const CARD = '#1F2937'; const BORDER = '#374151'; const GOLD = '#FFD700';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  statsBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  statItem: { alignItems: 'center', minWidth: 48 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  statLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 1, letterSpacing: 0.5 },
  newBtn: { marginLeft: 'auto', backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: BG, fontWeight: '800', fontSize: 13 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  searchInput: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#F9FAFB' },
  filtroRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  filtroChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  filtroChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  filtroText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  filtroTextActive: { color: BG },
  card: { backgroundColor: CARD, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  nombre: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  usuario: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGreen: { backgroundColor: 'rgba(74,222,128,0.12)' },
  badgeRed: { backgroundColor: 'rgba(248,113,113,0.12)' },
  badgeGray: { backgroundColor: 'rgba(156,163,175,0.12)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#f87171' },
  dotGray: { backgroundColor: '#9CA3AF' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  textGreen: { color: '#4ade80' },
  textRed: { color: '#f87171' },
  textGray: { color: '#9CA3AF' },
  textOrange: { color: '#fb923c' },
  textMuted: { color: '#6B7280' },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 14 },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  midLabel: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 1 },
  midValue: { fontSize: 13, fontWeight: '600', color: '#F9FAFB', marginTop: 3 },
  cardBtns: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 6 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  cortarBtn: { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: '#f87171' },
  activarBtn: { backgroundColor: GOLD },
  actionText: { fontSize: 13, fontWeight: '700' },
  manageBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  manageBtnText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  empty: { textAlign: 'center', color: '#4B5563', marginTop: 60, fontSize: 15 },
});
