import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    Alert,
    Modal,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { inventoryService } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

type FilterType = 'all' | 'uncounted' | 'discrepancy' | 'ok';

interface InventoryItem {
    id: string;
    stockId: string;
    expectedQuantity: number;
    countedQuantity: number | null;
    notes: string | null;
    stock: {
        nomMateriel: string;
        reference: string;
        codeBarre: string | null;
    };
}

interface InventorySession {
    id: string;
    date: string;
    status: string;
    notes: string | null;
    items: InventoryItem[];
    _count?: { items: number };
}

export default function InventoryScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [sessions, setSessions] = useState<InventorySession[]>([]);
    const [currentSession, setCurrentSession] = useState<InventorySession | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [newSessionNotes, setNewSessionNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Load sessions on focus
    useFocusEffect(
        useCallback(() => {
            loadSessions();
        }, [])
    );

    const loadSessions = async () => {
        try {
            setLoading(true);
            const data = await inventoryService.getSessions();
            setSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
            Alert.alert('Erreur', 'Impossible de charger les sessions d\'inventaire');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadSessionDetails = async (id: string) => {
        try {
            setLoading(true);
            const data = await inventoryService.getSession(id);
            setCurrentSession(data);
        } catch (error) {
            console.error('Error loading session details:', error);
            Alert.alert('Erreur', 'Impossible de charger les détails');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async () => {
        try {
            const session = await inventoryService.createSession(newSessionNotes || undefined);
            setShowNewSessionModal(false);
            setNewSessionNotes('');
            loadSessions();
            loadSessionDetails(session.id);
        } catch (error) {
            console.error('Error creating session:', error);
            Alert.alert('Erreur', 'Impossible de créer la session');
        }
    };

    const handleUpdateQuantity = (itemId: string, qty: string) => {
        if (!currentSession) return;
        const quantity = qty === '' ? null : parseInt(qty);
        const updatedItems = currentSession.items.map((item) =>
            item.id === itemId ? { ...item, countedQuantity: quantity } : item
        );
        setCurrentSession({ ...currentSession, items: updatedItems });
    };

    const handleSave = async () => {
        if (!currentSession) return;
        try {
            setSaving(true);
            await inventoryService.updateItems(currentSession.id, currentSession.items);
            Alert.alert('Succès', 'Progression sauvegardée !');
            loadSessionDetails(currentSession.id);
        } catch (error) {
            console.error('Error saving:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder');
        } finally {
            setSaving(false);
        }
    };

    const handleFinalize = async () => {
        if (!currentSession) return;
        Alert.alert(
            'Finaliser l\'inventaire',
            'Cette action va mettre à jour les quantités du stock réel. Continuer ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Finaliser',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await inventoryService.updateItems(currentSession.id, currentSession.items);
                            await inventoryService.finalizeSession(currentSession.id);
                            Alert.alert('Succès', 'Inventaire finalisé !');
                            loadSessions();
                            loadSessionDetails(currentSession.id);
                        } catch (error) {
                            console.error('Error finalizing:', error);
                            Alert.alert('Erreur', 'Impossible de finaliser');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleScan = () => {
        navigation.navigate('Scanner', {
            onScan: (barcode: string) => {
                if (currentSession) {
                    const item = currentSession.items.find(
                        (i) => i.stock.codeBarre === barcode || i.stock.reference === barcode
                    );
                    if (item) {
                        setSearch(barcode);
                        setFilter('all');
                        // Scroll to item or highlight it
                        Alert.alert('Article trouvé', `${item.stock.nomMateriel}\nRéférence: ${item.stock.reference}`);
                    } else {
                        Alert.alert('Non trouvé', `Aucun article avec le code-barres ${barcode}`);
                    }
                }
            }
        });
    };

    // Stats
    const getStats = () => {
        if (!currentSession) return { counted: 0, total: 0, discrepancies: 0, ok: 0 };
        const items = currentSession.items || [];
        const counted = items.filter((i) => i.countedQuantity !== null).length;
        const discrepancies = items.filter(
            (i) => i.countedQuantity !== null && i.countedQuantity !== i.expectedQuantity
        ).length;
        const ok = items.filter(
            (i) => i.countedQuantity !== null && i.countedQuantity === i.expectedQuantity
        ).length;
        return { counted, total: items.length, discrepancies, ok };
    };

    // Filter items
    const getFilteredItems = () => {
        if (!currentSession) return [];
        let items = currentSession.items.filter(
            (item) =>
                item.stock.nomMateriel.toLowerCase().includes(search.toLowerCase()) ||
                item.stock.reference.toLowerCase().includes(search.toLowerCase()) ||
                (item.stock.codeBarre && item.stock.codeBarre.includes(search))
        );

        switch (filter) {
            case 'uncounted':
                return items.filter((i) => i.countedQuantity === null);
            case 'discrepancy':
                return items.filter((i) => i.countedQuantity !== null && i.countedQuantity !== i.expectedQuantity);
            case 'ok':
                return items.filter((i) => i.countedQuantity !== null && i.countedQuantity === i.expectedQuantity);
            default:
                return items;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const stats = getStats();
    const filteredItems = getFilteredItems();
    const progressPercent = stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0;

    // Session Detail View
    if (currentSession) {
        const isCompleted = currentSession.status === 'completed';

        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                        onPress={() => setCurrentSession(null)}
                        style={styles.backButton}
                    >
                        <Text style={[styles.backButtonText, { color: colors.primary }]}>← Retour</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            📋 Inventaire
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            {formatDate(currentSession.date)}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isCompleted ? '#10b981' : '#f59e0b' }
                    ]}>
                        <Text style={styles.statusText}>
                            {isCompleted ? '✓ Finalisé' : '📝 Brouillon'}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.progressHeader}>
                        <Text style={[styles.progressLabel, { color: colors.text }]}>Progression</Text>
                        <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
                            {stats.counted} / {stats.total}
                        </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progressPercent}%`,
                                    backgroundColor: progressPercent === 100 ? '#10b981' : colors.primary
                                }
                            ]}
                        />
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={[styles.statDot, { backgroundColor: '#10b981' }]} />
                            <Text style={{ color: colors.text }}>{stats.ok} conformes</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statDot, { backgroundColor: '#ef4444' }]} />
                            <Text style={{ color: colors.text }}>{stats.discrepancies} écarts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statDot, { backgroundColor: colors.textSecondary, opacity: 0.5 }]} />
                            <Text style={{ color: colors.text }}>{stats.total - stats.counted} restants</Text>
                        </View>
                    </View>
                </View>

                {/* Search + Scan + Filters */}
                <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.searchRow}>
                        <TextInput
                            style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Rechercher..."
                            placeholderTextColor={colors.textSecondary}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {!isCompleted && (
                            <TouchableOpacity
                                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                                onPress={handleScan}
                            >
                                <Text style={styles.scanButtonText}>📷 Scanner</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                        {[
                            { key: 'all', label: '📦 Tous', count: stats.total },
                            { key: 'uncounted', label: '⏳ Non comptés', count: stats.total - stats.counted },
                            { key: 'discrepancy', label: '⚠️ Écarts', count: stats.discrepancies },
                            { key: 'ok', label: '✅ OK', count: stats.ok }
                        ].map((f) => (
                            <TouchableOpacity
                                key={f.key}
                                style={[
                                    styles.filterButton,
                                    {
                                        backgroundColor: filter === f.key ? colors.primary : colors.background,
                                        borderColor: colors.border
                                    }
                                ]}
                                onPress={() => setFilter(f.key as FilterType)}
                            >
                                <Text style={{ color: filter === f.key ? '#fff' : colors.text, fontSize: 12 }}>
                                    {f.label} ({f.count})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Items List */}
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const counted = item.countedQuantity;
                        const expected = item.expectedQuantity;
                        const diff = counted !== null ? counted - expected : 0;
                        const hasDiff = counted !== null && diff !== 0;

                        return (
                            <View style={[
                                styles.itemCard,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: hasDiff ? '#ef4444' : colors.border
                                }
                            ]}>
                                <View style={styles.itemHeader}>
                                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                                        {item.stock.nomMateriel}
                                    </Text>
                                    {hasDiff && (
                                        <View style={[styles.diffBadge, { backgroundColor: diff > 0 ? '#10b981' : '#ef4444' }]}>
                                            <Text style={styles.diffText}>{diff > 0 ? `+${diff}` : diff}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.itemRef, { color: colors.textSecondary }]}>
                                    Réf: {item.stock.reference}
                                </Text>
                                {item.stock.codeBarre && (
                                    <Text style={[styles.itemBarcode, { color: colors.textSecondary }]}>
                                        Code: {item.stock.codeBarre}
                                    </Text>
                                )}
                                <View style={styles.quantityRow}>
                                    <View style={styles.quantityBox}>
                                        <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>Attendu</Text>
                                        <Text style={[styles.quantityValue, { color: colors.primary }]}>{expected}</Text>
                                    </View>
                                    <View style={styles.quantityBox}>
                                        <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>Compté</Text>
                                        {isCompleted ? (
                                            <Text style={[
                                                styles.quantityValue,
                                                { color: hasDiff ? '#ef4444' : '#10b981' }
                                            ]}>
                                                {counted !== null ? counted : '-'}
                                            </Text>
                                        ) : (
                                            <TextInput
                                                style={[styles.quantityInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                                value={counted !== null ? String(counted) : ''}
                                                onChangeText={(v) => handleUpdateQuantity(item.id, v)}
                                                keyboardType="numeric"
                                                placeholder="-"
                                                placeholderTextColor={colors.textSecondary}
                                            />
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Aucun article trouvé
                            </Text>
                        </View>
                    }
                />

                {/* Action Buttons */}
                {!isCompleted && (
                    <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.actionButtonText}>💾 Sauvegarder</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                            onPress={handleFinalize}
                            disabled={saving}
                        >
                            <Text style={styles.actionButtonText}>✅ Finaliser</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    // Sessions List View
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>📋 Inventaire</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Sessions d'inventaire
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.newButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowNewSessionModal(true)}
                >
                    <Text style={styles.newButtonText}>+ Nouveau</Text>
                </TouchableOpacity>
            </View>

            {/* Sessions List */}
            {loading && sessions.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSessions(); }} />
                    }
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: session }) => (
                        <TouchableOpacity
                            style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => loadSessionDetails(session.id)}
                        >
                            <View style={styles.sessionHeader}>
                                <Text style={[styles.sessionDate, { color: colors.text }]}>
                                    {formatDate(session.date)}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: session.status === 'completed' ? '#10b981' : '#f59e0b' }
                                ]}>
                                    <Text style={styles.statusText}>
                                        {session.status === 'completed' ? '✓ Finalisé' : '📝 Brouillon'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.sessionItems, { color: colors.textSecondary }]}>
                                {session._count?.items || 0} articles
                            </Text>
                            {session.notes && (
                                <Text style={[styles.sessionNotes, { color: colors.textSecondary }]} numberOfLines={1}>
                                    📝 {session.notes}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Aucune session d'inventaire
                            </Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                                Créez un nouvel inventaire pour commencer
                            </Text>
                        </View>
                    }
                />
            )}

            {/* New Session Modal */}
            <Modal
                visible={showNewSessionModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNewSessionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>📋 Nouvel Inventaire</Text>
                        <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                            Cela va créer une copie de l'état actuel du stock pour inventaire.
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Notes (optionnel)..."
                            placeholderTextColor={colors.textSecondary}
                            value={newSessionNotes}
                            onChangeText={setNewSessionNotes}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                                onPress={() => setShowNewSessionModal(false)}
                            >
                                <Text style={{ color: colors.text }}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleCreateSession}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Créer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 50,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    newButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    newButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    progressContainer: {
        margin: 12,
        padding: 16,
        borderRadius: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontWeight: '600',
    },
    progressCount: {
        fontSize: 12,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    searchContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    scanButton: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 8,
    },
    scanButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    filterScroll: {
        flexDirection: 'row',
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
    },
    listContent: {
        padding: 12,
        paddingBottom: 100,
    },
    itemCard: {
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    diffBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    diffText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    itemRef: {
        fontSize: 12,
        marginTop: 4,
    },
    itemBarcode: {
        fontSize: 11,
        fontFamily: 'monospace',
    },
    quantityRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 16,
    },
    quantityBox: {
        flex: 1,
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 11,
        marginBottom: 4,
    },
    quantityValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    quantityInput: {
        width: 80,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 12,
        gap: 12,
        borderTopWidth: 1,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    sessionCard: {
        padding: 16,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionDate: {
        fontSize: 15,
        fontWeight: '600',
    },
    sessionItems: {
        fontSize: 13,
        marginTop: 6,
    },
    sessionNotes: {
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    modalInput: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
});
