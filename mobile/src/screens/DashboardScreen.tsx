import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { interventionService } from '../services/api';
import { spacing } from '../theme/colors';

import { SlideWrapper } from '../components/SlideWrapper';

export default function DashboardScreen({ navigation }: any) {
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();
    const [interventions, setInterventions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = getStyles(colors);

    const loadInterventions = async () => {
        try {
            if (user?.id) {
                const data = await interventionService.getAll({ technicienId: user.id });
                const allInterventions = data.interventions || [];

                // Filter to show only today's interventions
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const todayInterventions = allInterventions.filter((intervention: any) => {
                    if (!intervention.datePlanifiee) return false;
                    const planifiedDate = new Date(intervention.datePlanifiee);
                    return planifiedDate >= today && planifiedDate < tomorrow;
                });

                setInterventions(todayInterventions);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadInterventions();
    }, [user?.id]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadInterventions();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        if (!item) return null;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('InterventionDetail', { id: item.id })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.titre}</Text>
                    <View style={[styles.badge, item.statut === 'PLANIFIEE' ? styles.badgeBlue : styles.badgeGray]}>
                        <Text style={[styles.badgeText, item.statut === 'PLANIFIEE' ? styles.textBlue : styles.textGray]}>
                            {item.statut || 'N/A'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.date}>
                    📅 {item.datePlanifiee ? new Date(item.datePlanifiee).toLocaleDateString() : ''}
                </Text>
                <Text style={styles.clientName}>{item.client?.nom || 'Client Inconnu'}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SlideWrapper style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Bonjour, {user?.nom}</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logoutText}>Déconnexion</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={interventions}
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
                            <Text style={{ color: colors.textSecondary }}>Aucune intervention assignée.</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
        paddingTop: 60,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    welcome: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    logoutText: {
        color: colors.danger,
        fontWeight: '600',
    },
    list: {
        padding: spacing.m,
    },
    card: {
        backgroundColor: colors.card,
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.m,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        flex: 1,
    },
    date: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.s,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeBlue: {
        backgroundColor: '#dbeafe',
    },
    badgeGray: {
        backgroundColor: '#f1f5f9',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    textBlue: { color: '#1e40af' },
    textGray: { color: '#64748b' },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    }
});
