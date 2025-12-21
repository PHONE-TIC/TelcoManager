import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Animated } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { interventionService } from '../services/api';
import { colors as palette, spacing } from '../theme/colors';
import { Calendar, CalendarList, Agenda, LocaleConfig } from 'react-native-calendars';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// Configure locale for react-native-calendars
LocaleConfig.locales['fr-FR'] = {
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
    today: 'Aujourd\'hui'
};
LocaleConfig.defaultLocale = 'fr-FR';


type ViewMode = 'month' | 'week' | 'day';

import { SlideWrapper } from '../components/SlideWrapper';

export default function PlanningScreen({ navigation }: any) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [interventions, setInterventions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mode, setMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [slideAnim] = useState(new Animated.Value(0));
    const [fadeAnim] = useState(new Animated.Value(1));

    // Memoize styles to avoid recreation on every render
    const styles = useMemo(() => getStyles(colors), [colors]);

    // Fetch interventions
    const loadInterventions = async () => {
        try {
            if (user?.id) {
                const data = await interventionService.getAll({ technicienId: user.id });
                setInterventions(data.interventions || []);
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
    }, [user?.id]);

    // Handle date change with slide animation
    const handleDateChange = useCallback((newDate: dayjs.Dayjs, direction: 'left' | 'right') => {
        const startValue = direction === 'left' ? 300 : -300;

        slideAnim.setValue(startValue);
        fadeAnim.setValue(0.3);

        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();

        setSelectedDate(newDate);
    }, [slideAnim, fadeAnim]);

    // Handle swipe gesture for month view
    const onSwipeGesture = useCallback(({ nativeEvent }: any) => {
        if (nativeEvent.state === State.END) {
            const { translationX } = nativeEvent;

            if (translationX < -50) {
                // Swipe left - go forward
                handleDateChange(selectedDate.add(1, 'day'), 'left');
            } else if (translationX > 50) {
                // Swipe right - go backward
                handleDateChange(selectedDate.subtract(1, 'day'), 'right');
            }
        }
    }, [selectedDate, handleDateChange]);

    // Memoize derived data
    const events = useMemo(() => interventions.map(inv => ({
        title: `${inv?.client?.nom || 'Client'} - ${inv?.titre || 'Sans titre'}`,
        start: new Date(inv?.datePlanifiee),
        end: dayjs(inv?.datePlanifiee).add(2, 'hour').toDate(),
        id: inv?.id,
        summary: inv?.description,
        color: inv?.statut === 'PLANIFIEE' ? colors.info : colors.success
    })).filter(e => e.id), [interventions, colors]);

    const itemsForAgenda = useMemo(() => interventions.reduce((acc: any, inv) => {
        const dateStr = dayjs(inv.datePlanifiee).format('YYYY-MM-DD');
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push({
            name: `${inv.client.nom} - ${inv.titre}`,
            height: 80,
            data: inv
        });
        return acc;
    }, {}), [interventions]);

    // Memoize date for BigCalendar (JS Date object stability)
    const jsDate = useMemo(() => selectedDate.toDate(), [selectedDate]);

    // Memoize theme for Agenda to avoid prop thrashing
    const agendaTheme = useMemo(() => ({
        calendarBackground: colors.card,
        agendaKnobColor: colors.primary,
        backgroundColor: colors.background,
        dayTextColor: colors.text,
        monthTextColor: colors.primary,
        textSectionTitleColor: colors.textSecondary,
        selectedDayBackgroundColor: colors.primary,
        selectedDayTextColor: '#ffffff',
        todayTextColor: colors.primary,
        dotColor: colors.primary,
        selectedDotColor: '#ffffff'
    }), [colors]);

    const renderModeSelector = () => (
        <View style={styles.modeSelector}>
            <TouchableOpacity
                style={[styles.modeButton, mode === 'month' && styles.modeButtonActive]}
                onPress={() => setMode('month')}
            >
                <Text style={[styles.modeText, mode === 'month' && styles.modeTextActive]}>Mois</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.modeButton, mode === 'week' && styles.modeButtonActive]}
                onPress={() => setMode('week')}
            >
                <Text style={[styles.modeText, mode === 'week' && styles.modeTextActive]}>Semaine</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.modeButton, mode === 'day' && styles.modeButtonActive]}
                onPress={() => setMode('day')}
            >
                <Text style={[styles.modeText, mode === 'day' && styles.modeTextActive]}>Jour</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />;
        }

        if (mode === 'month') {
            const selectedDateStr = selectedDate.format('YYYY-MM-DD');
            const dailyItems = itemsForAgenda[selectedDateStr] || [];

            return (
                <ScrollView
                    style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    <Calendar
                        key="fr-FR-calendar"
                        firstDay={1}
                        current={selectedDateStr}
                        onDayPress={(day) => {
                            setSelectedDate(dayjs(day.dateString));
                        }}
                        markedDates={{
                            // Only dots for other dates, selection circle for current
                            ...(Object.keys(itemsForAgenda).reduce((acc: any, date) => {
                                acc[date] = { dots: [{ color: colors.primary }] };
                                return acc;
                            }, {})),
                            [selectedDateStr]: {
                                selected: true,
                                selectedColor: colors.primary,
                                dots: itemsForAgenda[selectedDateStr] ? [{ color: '#fff' }] : []
                            }
                        }}
                        theme={{
                            calendarBackground: colors.card,
                            textSectionTitleColor: colors.textSecondary,
                            selectedDayBackgroundColor: colors.primary,
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: colors.primary,
                            dayTextColor: colors.text,
                            textDisabledColor: colors.border,
                            dotColor: colors.primary,
                            selectedDotColor: '#ffffff',
                            arrowColor: colors.primary,
                            monthTextColor: colors.primary,
                            indicatorColor: colors.primary,
                        }}
                    />
                    <Text style={styles.dateHeader}>
                        {selectedDate.format('D MMMM YYYY')}
                    </Text>
                    <PanGestureHandler
                        onHandlerStateChange={onSwipeGesture}
                        activeOffsetX={[-10, 10]}
                    >
                        <Animated.View style={{
                            transform: [{ translateX: slideAnim }],
                            opacity: fadeAnim,
                            flex: 1,
                        }}>
                            {dailyItems.length > 0 ? (
                                <View style={{ paddingHorizontal: spacing.m, paddingBottom: spacing.l }}>
                                    {dailyItems.map((item: any) => (
                                        <TouchableOpacity
                                            key={item.data.id}
                                            style={styles.card}
                                            onPress={() => navigation.navigate('InterventionDetail', { id: item.data.id })}
                                        >
                                            <View style={styles.cardHeader}>
                                                <Text style={styles.cardTitle}>{item.data.client.nom}</Text>
                                                <Text style={styles.time}>{dayjs(item.data.datePlanifiee).format('HH:mm')}</Text>
                                            </View>
                                            <Text style={styles.summary}>{item.data.titre}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Aucune intervention ce jour.</Text>
                                </View>
                            )}
                        </Animated.View>
                    </PanGestureHandler>
                </ScrollView>
            );
        } else {
            return (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    nestedScrollEnabled={true}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    <BigCalendar
                        events={events}
                        height={600}
                        date={jsDate}
                        mode={mode === 'week' ? 'week' : 'day'}
                        onPressEvent={(event) => navigation.navigate('InterventionDetail', { id: event.id })}
                        swipeEnabled={true}
                        theme={{
                            palette: {
                                primary: {
                                    main: colors.primary,
                                    contrastText: '#ffffff',
                                },
                                gray: {
                                    '100': colors.background,
                                    '200': colors.border,
                                    '300': colors.textSecondary,
                                    '500': colors.text,
                                    '800': colors.text,
                                },
                            },
                        }}
                        headerContainerStyle={{
                            backgroundColor: colors.card,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                        bodyContainerStyle={{ backgroundColor: colors.background }}
                        eventCellStyle={(event) => ({
                            backgroundColor: colors.primary,
                            borderRadius: 6,
                            borderLeftWidth: 4,
                            borderLeftColor: colors.success,
                            padding: 6,
                        })}
                        renderEvent={(event, touchableOpacityProps) => (
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.primary,
                                borderRadius: 6,
                                borderLeftWidth: 4,
                                borderLeftColor: colors.success,
                                padding: 6,
                                justifyContent: 'center',
                            }}>
                                <Text
                                    style={{
                                        color: '#ffffff',
                                        fontSize: 13,
                                        fontWeight: '600',
                                    }}
                                    numberOfLines={2}
                                >
                                    {event.title}
                                </Text>
                            </View>
                        )}
                        locale="fr"
                    />
                </ScrollView>
            );
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SlideWrapper style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Planning</Text>
                </View>
                {renderModeSelector()}
                <View style={{ flex: 1 }}>
                    {renderContent()}
                </View>
            </SlideWrapper>
        </GestureHandlerRootView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: spacing.s,
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
    modeSelector: {
        flexDirection: 'row',
        padding: spacing.s,
        backgroundColor: colors.card,
        justifyContent: 'center',
        gap: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modeButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border
    },
    modeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary
    },
    modeText: {
        color: colors.text,
        fontWeight: '600'
    },
    modeTextActive: {
        color: '#ffffff'
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        margin: spacing.m,
        marginBottom: spacing.s,
    },
    card: {
        backgroundColor: colors.card,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    time: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    summary: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
    }
});
