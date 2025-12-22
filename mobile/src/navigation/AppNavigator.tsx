import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import StockScreen from '../screens/StockScreen';
import PlanningScreen from '../screens/PlanningScreen';
import InterventionDetailScreen from '../screens/InterventionDetailScreen';
import SignatureScreen from '../screens/SignatureScreen';
import ScannerScreen from '../screens/ScannerScreen';
import InventoryScreen from '../screens/InventoryScreen';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabTransitionProvider, useTabTransition } from '../contexts/TabTransitionContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { handleTabChange } = useTabTransition();

    return (
        <Tab.Navigator
            screenListeners={({ route }) => ({
                focus: () => {
                    handleTabChange(route.name);
                },
            })}
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#ffffff', // White text/icon active
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarActiveBackgroundColor: colors.primary, // Full background
                tabBarLabelStyle: {
                    fontSize: 12,
                    marginBottom: 5,
                    fontWeight: '600'
                },
                tabBarItemStyle: {
                    flex: 1,
                    marginVertical: 4,
                    marginHorizontal: 10,
                    borderRadius: 10,
                    paddingVertical: 4,
                    justifyContent: 'center'
                },
                tabBarStyle: {
                    height: 70 + (insets.bottom > 0 ? insets.bottom - 10 : 0), // Increased height for floating style
                    paddingBottom: insets.bottom > 0 ? insets.bottom - 10 : 5,
                    paddingTop: 0,
                    backgroundColor: colors.card,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = '❓';
                    if (route.name === 'DashboardTab') iconName = '📋';
                    if (route.name === 'PlanningTab') iconName = '📅';
                    if (route.name === 'StockTab') iconName = '📦';
                    if (route.name === 'InventoryTab') iconName = '🔍';

                    return (
                        <Text style={{
                            fontSize: 24,
                            lineHeight: 28, // Explicit line height prevents vertical clipping
                            color: color,
                            textAlign: 'center',
                            textAlignVertical: 'center' // Android specific
                        }}>
                            {iconName}
                        </Text>
                    );
                }
            })}
        >
            <Tab.Screen
                name="DashboardTab"
                component={DashboardScreen}
                options={{ title: 'Liste' }}
            />
            <Tab.Screen
                name="PlanningTab"
                component={PlanningScreen}
                options={{ title: 'Planning' }}
            />
            <Tab.Screen
                name="InventoryTab"
                component={InventoryScreen}
                options={{ title: 'Inventaire' }}
            />
            <Tab.Screen
                name="StockTab"
                component={StockScreen}
                options={{ title: 'Stock' }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { user, loading } = useAuth();
    const { colors, isDark } = useTheme();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const navigationTheme = {
        dark: isDark,
        colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.card,
            text: colors.text,
            border: colors.border,
            notification: colors.danger,
        },
    };

    const headerOptions = {
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' } as const,
    };

    return (
        <TabTransitionProvider>
            <NavigationContainer theme={navigationTheme}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {user ? (
                        <>
                            <Stack.Screen name="Main" component={MainTabs} />
                            <Stack.Screen
                                name="InterventionDetail"
                                component={InterventionDetailScreen}
                                options={{ ...headerOptions, title: 'Détails Intervention' }}
                            />
                            <Stack.Screen
                                name="Signature"
                                component={SignatureScreen}
                                options={{ ...headerOptions, title: 'Signature Client' }}
                            />
                            <Stack.Screen
                                name="Scanner"
                                component={ScannerScreen}
                                options={{ ...headerOptions, title: 'Scanner Code-barres', headerShown: false }}
                            />
                        </>
                    ) : (
                        <Stack.Screen name="Login" component={LoginScreen} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </TabTransitionProvider>
    );
}
