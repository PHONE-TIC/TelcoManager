import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { technicianStockService } from '../services/api';
import { spacing } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';

interface StockItem {
    id: string; // TechnicianStock ID
    stock: {
        nomMateriel: string;
        reference: string;
        categorie: string;
    };
    quantite: number;
}

import { SlideWrapper } from '../components/SlideWrapper';

export default function StockScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = getStyles(colors);

    const fetchStock = async () => {
        try {
            if (user?.id) {
                const data = await technicianStockService.getTechnicianStock(user.id);
                setStock(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStock();
        }, [user?.id])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStock();
    }, []);

    const renderItem = ({ item }: { item: StockItem }) => (
        <View style={styles.card}>
            <View style={styles.info}>
                <Text style={styles.name}>{item.stock.nomMateriel}</Text>
                <Text style={styles.ref}>{item.stock.reference} • {item.stock.categorie}</Text>
            </View>
            <View style={styles.quantity}>
                <Text style={styles.quantityText}>x{item.quantite}</Text>
            </View>
        </View>
    );

    return (
        <SlideWrapper style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mon Stock Véhicule</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={stock}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                            progressBackgroundColor={colors.card}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ color: colors.textSecondary }}>Aucun matériel dans le véhicule.</Text>
                        </View>
                    }
                />
            )}
        </SlideWrapper>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: spacing.m,
        paddingHorizontal: spacing.l,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    list: {
        padding: spacing.m,
    },
    card: {
        backgroundColor: colors.card,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.s,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    ref: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    quantity: {
        backgroundColor: '#e0f2fe', // Keep or map to primary light?
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    quantityText: {
        color: '#0369a1',
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    }
});
