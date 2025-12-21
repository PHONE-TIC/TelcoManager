import React from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

export default function HomeScreen() {
    const { user, logout } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.welcome}>Bienvenue, {user?.nom} !</Text>
            <Text style={styles.role}>Rôle : {user?.role}</Text>
            <Button title="Se déconnecter" onPress={logout} color={colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcome: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    role: {
        fontSize: 16,
        color: 'gray',
        marginBottom: 20,
    }
});
