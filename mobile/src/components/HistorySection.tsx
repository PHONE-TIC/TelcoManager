import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { interventionService } from '../services/api';
import dayjs from 'dayjs';

interface HistorySectionProps {
    clientId: string;
    currentInterventionId: string;
    colors: any;
}

export default function HistorySection({ clientId, currentInterventionId, colors }: HistorySectionProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (visible && history.length === 0) {
            loadHistory();
        }
    }, [visible]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            // Fetch completed interventions for this client
            const data = await interventionService.getAll({
                clientId,
                statut: 'terminee',
                limit: 5 // Last 5
            });
            // Filter out current if it happens to be there (unlikely if strictly completed)
            const filtered = data.interventions.filter((i: any) => i.id !== currentInterventionId);
            setHistory(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            marginTop: 20,
            backgroundColor: colors.card,
            borderRadius: 10,
            padding: 15,
            borderWidth: 1,
            borderColor: colors.border
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.text
        },
        toggleText: {
            color: colors.primary,
            fontWeight: '600'
        },
        list: {
            marginTop: 10
        },
        item: {
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
        },
        date: {
            fontSize: 14,
            fontWeight: 'bold',
            color: colors.text
        },
        tech: {
            fontSize: 13,
            color: colors.textSecondary,
            fontStyle: 'italic'
        },
        comment: {
            fontSize: 14,
            color: colors.text,
            marginTop: 5
        },
        emptyText: {
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 10
        }
    });

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => setVisible(!visible)} style={styles.header}>
                <Text style={styles.title}>📜 Historique Interventions</Text>
                <Text style={styles.toggleText}>{visible ? 'Masquer' : 'Voir'}</Text>
            </TouchableOpacity>

            {visible && (
                loading ? (
                    <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />
                ) : (
                    <View style={styles.list}>
                        {history.length === 0 ? (
                            <Text style={styles.emptyText}>Aucun historique récent.</Text>
                        ) : (
                            history.map((item) => (
                                <View key={item.id} style={styles.item}>
                                    <Text style={styles.date}>{dayjs(item.dateRealisee || item.datePlanifiee).format('DD/MM/YYYY HH:mm')}</Text>
                                    <Text style={styles.tech}>Intervenant: {item.technicien?.nom || 'Inconnu'}</Text>
                                    {item.commentaireTechnicien && (
                                        <Text style={styles.comment}>📝 {item.commentaireTechnicien}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )
            )}
        </View>
    );
}
