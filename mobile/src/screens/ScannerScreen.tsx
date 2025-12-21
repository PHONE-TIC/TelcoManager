import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Button } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default function ScannerScreen({ navigation, route }: any) {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Nous avons besoin de votre permission pour utiliser la caméra</Text>
                <Button onPress={requestPermission} title="Accorder la permission" />
            </View>
        );
    }

    const handleBarCodeScanned = ({ type, data }: any) => {
        setScanned(true);
        // Call the callback provided in params
        if (route.params?.onScan) {
            route.params.onScan(data);
            navigation.goBack();
        } else {
            alert(`Bar code with type ${type} and data ${data} has been scanned!`);
            setScanned(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
                }}
            >
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                        <Text style={styles.text}>Annuler</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.overlayText}>Scannez le code-barres du matériel</Text>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 2,
    },
    button: {
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'transparent',
    },
    overlayText: {
        color: '#fff',
        marginTop: 20,
        fontSize: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        borderRadius: 5,
    }
});
