import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../theme/colors';

// @ts-ignore
import logo from '../../assets/logo.png';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { colors, isDark } = useTheme();

    const styles = getStyles(colors);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        setIsLoading(true);
        try {
            await login(username, password);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erreur', error.response?.data?.error || 'Échec de la connexion');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Image source={logo} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.title}>TelcoManager</Text>
                    <Text style={styles.subtitle}>Mobile</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Identifiant</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="admin"
                            placeholderTextColor={colors.textSecondary}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mot de passe</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Votre mot de passe"
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Se connecter</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Identifiants par défaut : admin / admin123</Text>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.l,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl * 1.5,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: spacing.m,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    form: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: spacing.l,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    inputGroup: {
        marginBottom: spacing.m,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.inputBackground || colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.m,
        fontSize: 16,
        color: colors.text,
    },
    button: {
        backgroundColor: colors.primary,
        padding: spacing.m,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: spacing.s,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: spacing.l,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: colors.textSecondary,
    }
});
