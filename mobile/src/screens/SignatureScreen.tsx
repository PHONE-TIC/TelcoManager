import React, { useRef } from 'react';
import { StyleSheet, View, Button, Alert, Text } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { interventionService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../theme/colors';

interface Props {
    route: any;
    navigation: any;
}

export default function SignScreen({ route, navigation }: Props) {
    const { id, type } = route.params;
    const ref = useRef<any>(null);
    const { colors } = useTheme();

    const styles = getStyles(colors);

    const handleSignature = async (signature: string) => {
        try {
            // signature is a base64 string
            await interventionService.sign(id, { type, signature });
            Alert.alert('Succès', 'Signature enregistrée avec succès');
            // Call onReturn if provided to refresh parent
            if (route.params.onReturn) {
                route.params.onReturn();
            }
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de sauvegarder la signature');
        }
    };

    const handleEmpty = () => {
        console.log('Empty');
    };

    const handleClear = () => {
        console.log('clear success!');
    };

    const handleEnd = () => {
        ref.current.readSignature();
    };

    const handleBegin = () => {
        console.log('begin!');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.instruction}>Veuillez signer dans le cadre ci-dessous :</Text>
            <View style={styles.signatureContainer}>
                <SignatureScreen
                    ref={ref}
                    onEnd={handleEnd}
                    onOK={handleSignature}
                    onEmpty={handleEmpty}
                    onClear={handleClear}
                    onBegin={handleBegin}
                    // Customizing the WebView style for dark mode?
                    // The canvas background is usually white. For signatures, white bg with black ink is standard even in dark mode.
                    // But we can try to style the webview background if transparent.
                    webStyle={`
                    .m-signature-pad { 
                        box-shadow: none; 
                        border: none; 
                        background-color: ${colors.card};
                    }
                    .m-signature-pad--body {
                        border: none;
                    }
                    .m-signature-pad--footer {
                        display: none;
                    }
                    body,html { 
                        background-color: ${colors.background}; 
                    }
                `}
                    // In dark mode we might want white ink?
                    penColor={colors.text} // Ink color
                    backgroundColor={colors.card} // Canvas background
                    descriptionText="Signez ici"
                    clearText="Effacer"
                    confirmText="Valider"
                />
            </View>
            <View style={styles.buttons}>
                <Button title="Effacer" onPress={() => ref.current.clearSignature()} color={colors.danger} />
                <Button title="Valider" onPress={() => ref.current.readSignature()} color={colors.primary} />
            </View>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.m,
        backgroundColor: colors.background,
    },
    instruction: {
        fontSize: 16,
        marginBottom: spacing.m,
        color: colors.text,
    },
    signatureContainer: {
        width: '100%',
        height: 300,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing.m,
    },
    buttons: {
        flexDirection: 'row',
        gap: spacing.m,
    }
});
