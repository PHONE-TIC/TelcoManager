import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, FlatList, Platform, Linking } from 'react-native';
import { interventionService, technicianStockService, stockService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../theme/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import HistorySection from '../components/HistorySection';

export default function InterventionDetailScreen({ route, navigation }: any) {
    const { id } = route.params;
    const { colors } = useTheme();
    const { user } = useAuth();
    const [intervention, setIntervention] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Workflow State
    const [currentStep, setCurrentStep] = useState(0);
    // 0: Start, 1: Hours, 2: Material, 3: Comment, 4: Sign Tech, 5: Sign Client, 6: Close, 7: View

    // Step 2: Hours
    const [arrivalDate, setArrivalDate] = useState(new Date());
    const [departureDate, setDepartureDate] = useState(new Date());
    const [arrivalPicker, setArrivalPicker] = useState(false);
    const [departurePicker, setDeparturePicker] = useState(false);

    // Step 3: Material
    const [techStock, setTechStock] = useState<any[]>([]);
    const [catalogStock, setCatalogStock] = useState<any[]>([]); // Global stock for removal lookup
    const [stockModalVisible, setStockModalVisible] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);

    // Removal Workflow State
    const [actionType, setActionType] = useState<'install' | 'retrait'>('install');
    const [removalSource, setRemovalSource] = useState<'catalogue' | 'autre'>('catalogue');
    const [retraitEtat, setRetraitEtat] = useState<'ok' | 'hs'>('ok');

    // Manual Entry State
    const [manualName, setManualName] = useState('');
    const [manualBrand, setManualBrand] = useState('');
    const [manualModel, setManualModel] = useState('');
    const [manualSerial, setManualSerial] = useState('');

    const [quantite, setQuantite] = useState('1');
    const [scannedCode, setScannedCode] = useState<string | null>(null);

    // Step 4: Comment
    const [comment, setComment] = useState('');

    // State for Search
    const [searchTerm, setSearchTerm] = useState('');

    const styles = getStyles(colors);

    useEffect(() => {
        loadIntervention();
        if (user?.id) loadTechStock();
        loadCatalogStock();

        // Lock intervention logic
        const lock = async () => {
            try {
                // Determine if we should lock based on status? 
                // We don't have intervention loaded yet fully, but we have ID.
                // Optimistically lock.
                await interventionService.lock(id);
            } catch (error: any) {
                if (error.response?.status === 409) {
                    Alert.alert(
                        'Attention',
                        `Cette intervention est actuellement verrouillée par : ${error.response.data.lockedBy}. \nVous pouvez consulter mais évitez de modifier simultanément.`
                    );
                }
            }
        };

        lock();

        return () => {
            interventionService.unlock(id).catch(() => { });
        };
    }, [id]);

    const loadIntervention = async () => {
        try {
            const data = await interventionService.getById(id);
            setIntervention(data);
            determineInitialStep(data);
            if (data.commentaireTechnicien) setComment(data.commentaireTechnicien);
            if (data.heureArrivee) setArrivalDate(new Date(data.heureArrivee));
            if (data.heureDepart) setDepartureDate(new Date(data.heureDepart));
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible de charger l\'intervention');
        } finally {
            setLoading(false);
        }
    };

    const loadTechStock = async () => {
        if (!user?.id) return;
        try {
            const stock = await technicianStockService.getTechnicianStock(user.id);
            setTechStock(stock);
        } catch (error) {
            console.error('Stock fetch error', error);
        }
    };

    const loadCatalogStock = async () => {
        try {
            const stock = await stockService.getAll();
            setCatalogStock(stock);
        } catch (error) {
            console.error('Catalog fetch error', error);
        }
    };

    const determineInitialStep = (data: any) => {
        if (!data) return;
        if (data.statut === 'planifiee') {
            setCurrentStep(0);
        } else if (data.statut === 'en_cours') {
            if (!data.heureArrivee) setCurrentStep(1);
            else if (!data.commentaireTechnicien) setCurrentStep(2);
            else if (!data.signatureTechnicien) setCurrentStep(4);
            else if (!data.signature) setCurrentStep(5);
            else setCurrentStep(6);
        } else if (data.statut === 'terminee') {
            setCurrentStep(7); // View only
        }
    };

    // --- Actions ---

    // Generic "Unlock" - allows going back
    const goToStep = (step: number) => {
        // if (intervention.statut === 'terminee') return; // Removed to allow viewing
        setCurrentStep(step);
    };

    const isReadOnly = intervention?.statut === 'terminee';

    const handlePriseEnCharge = async () => {
        try {
            await interventionService.updateStatus(id, {
                statut: 'en_cours',
                datePriseEnCharge: new Date().toISOString()
            });
            await loadIntervention();
            setCurrentStep(1);
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de débuter l\'intervention');
        }
    };

    const handleValidateHours = async () => {
        try {
            await interventionService.validateHours(id, {
                heureArrivee: arrivalDate.toISOString(),
                heureDepart: departureDate.toISOString()
            });
            setCurrentStep(2); // Go to Material
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de valider les horaires');
        }
    };

    const handleScan = () => {
        setStockModalVisible(false); // Close modal before nav
        navigation.navigate('Scanner', {
            onScan: (data: string) => {
                setScannedCode(data);
                // In a real app we would find the item by code here
                Alert.alert("Code Scanné", data);
                // we re-open modal with code? Or just set scannedCode state and reopen
                setTimeout(() => setStockModalVisible(true), 500);
            }
        });
    };

    const handleAddMaterial = async () => {
        // Logic specific to removal source
        let stockId = null;
        let manualData = {};

        if (actionType === 'retrait' && removalSource === 'autre') {
            if (!manualName) {
                Alert.alert('Erreur', 'Le nom du matériel est requis pour un retrait inconnu.');
                return;
            }
            manualData = {
                nom: manualName,
                marque: manualBrand,
                modele: manualModel,
                serialNumber: manualSerial
            };
        } else {
            // Standard selection (Install OR Retrait Catalogue)
            if (!selectedStock && !scannedCode) return;
            stockId = selectedStock?.stockId || selectedStock?.id; // Handle diff structures (techStock vs globalStock)

            if (!stockId && !scannedCode) {
                Alert.alert("Erreur", "Veuillez sélectionner un matériel");
                return;
            }
        }

        try {
            await interventionService.manageEquipment(id, {
                stockId: stockId || undefined,
                action: actionType,
                etat: actionType === 'retrait' ? retraitEtat : undefined,
                quantite: parseInt(quantite),
                notes: 'Ajout mobile',
                ...manualData
            });
            setStockModalVisible(false);
            setQuantite('1');
            setSelectedStock(null);
            setScannedCode(null);

            // Reset manual fields
            setManualName('');
            setManualBrand('');
            setManualModel('');
            setManualSerial('');

            loadIntervention();
        } catch (error) {
            Alert.alert('Erreur', 'Erreur ajout matériel');
        }
    };

    const handleSaveComment = async () => {
        if (!comment.trim()) {
            Alert.alert('Attention', 'Veuillez saisir un commentaire.');
            return;
        }
        try {
            await interventionService.updateStatus(id, {
                statut: 'en_cours',
                commentaireTechnicien: comment
            });
            setCurrentStep(4); // Go to Sign Tech
        } catch (error) {
            Alert.alert('Erreur', 'Sauvegarde commentaire échouée');
        }
    };

    const handleTechSignParams = () => {
        navigation.navigate('Signature', {
            id, type: 'technicien', onReturn: () => {
                loadIntervention();
                // User must manually press Next
            }
        });
    };

    const handleClientSignParams = () => {
        navigation.navigate('Signature', {
            id, type: 'client', onReturn: () => {
                loadIntervention();
                // User must manually press Next
            }
        });
    };

    const handleClose = async () => {
        try {
            await interventionService.updateStatus(id, { statut: 'terminee' });
            navigation.goBack();
        } catch (error) {
            Alert.alert('Erreur', 'Clôture impossible');
        }
    };

    // --- Renders ---

    const renderHeader = () => (
        <View style={styles.headerCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.interventionRef}>#{intervention.numero}</Text>
                <View style={[styles.badge, styles.badgeBlue]}><Text style={styles.badgeText}>{intervention.statut}</Text></View>
            </View>
            <Text style={styles.interventionTitle}>{intervention.titre}</Text>
            <Text style={styles.interventionAddress}>{intervention.client.nom} - {intervention.client.ville}</Text>

            {/* Steps Progress Indicator (Dots) */}
            <View style={styles.progressContainer}>
                {[0, 1, 2, 3, 4, 5, 6].map(s => (
                    <TouchableOpacity key={s} onPress={() => { if (s < currentStep) goToStep(s); }} disabled={s > currentStep && currentStep < 7}>
                        <View style={[
                            styles.progressDot,
                            s === currentStep && styles.progressDotActive,
                            s < currentStep && styles.progressDotCompleted
                        ]} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderWizardContent = () => {
        switch (currentStep) {
            case 0: // Prise en charge
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Étape 1 : Prise en Charge</Text>
                        <Text style={styles.stepDesc}>Confirmez votre arrivée sur le site pour débuter l'intervention.</Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={handlePriseEnCharge}>
                            <Text style={styles.buttonText}>🚀 Débuter l'intervention</Text>
                        </TouchableOpacity>
                        {/* History always visible on start page */}
                        <HistorySection clientId={intervention.clientId} currentInterventionId={intervention.id} colors={colors} />
                    </View>
                );
            case 1: // Horaires
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Étape 2 : Horaires</Text>

                        <Text style={styles.label}>Heure d'arrivée</Text>
                        <TouchableOpacity onPress={() => !isReadOnly && setArrivalPicker(true)} style={[styles.dateInput, isReadOnly && styles.inputDisabled]}>
                            <Text style={styles.dateText}>{dayjs(arrivalDate).format('HH:mm')}</Text>
                        </TouchableOpacity>
                        {arrivalPicker && (
                            <DateTimePicker value={arrivalDate} mode="time" display="default"
                                onChange={(e, d) => { setArrivalPicker(false); if (d) setArrivalDate(d); }} />
                        )}

                        <Text style={styles.label}>Heure de départ (Estimée ou Réelle)</Text>
                        <TouchableOpacity onPress={() => !isReadOnly && setDeparturePicker(true)} style={[styles.dateInput, isReadOnly && styles.inputDisabled]}>
                            <Text style={styles.dateText}>{dayjs(departureDate).format('HH:mm')}</Text>
                        </TouchableOpacity>
                        {departurePicker && (
                            <DateTimePicker value={departureDate} mode="time" display="default"
                                onChange={(e, d) => { setDeparturePicker(false); if (d) setDepartureDate(d); }} />
                        )}

                        <View style={styles.navRow}>
                            {!isReadOnly && (
                                <TouchableOpacity style={styles.primaryButton} onPress={handleValidateHours}>
                                    <Text style={styles.buttonText}>Suivant</Text>
                                </TouchableOpacity>
                            )}
                            {isReadOnly && (
                                <TouchableOpacity style={styles.primaryButton} onPress={() => goToStep(2)}>
                                    <Text style={styles.buttonText}>Suivant (Lecture)</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            case 2: // Matériel
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Étape 3 : Matériel</Text>

                        {intervention.equipements && intervention.equipements.length > 0 ? (
                            intervention.equipements.map((item: any) => (
                                <View key={item.id} style={styles.equipItemCard}>
                                    <View>
                                        <Text style={styles.equipName}>{item.stock.nomMateriel}</Text>
                                        <Text style={styles.equipRef}>{item.action} • Qté: {item.quantite}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Aucun mouvement de stock enregistré.</Text>
                        )}

                        {!isReadOnly && (
                            <TouchableOpacity style={[styles.secondaryButton, { marginBottom: 15 }]} onPress={() => setStockModalVisible(true)}>
                                <Text style={styles.secondaryButtonText}>+ Ajouter Mouvement</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.navButton} onPress={() => goToStep(1)}>
                                <Text style={styles.navButtonText}>Précédent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginVertical: 0 }]} onPress={() => setCurrentStep(3)}>
                                <Text style={styles.buttonText}>Suivant</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 3: // Commentaire
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Étape 4 : Rapport</Text>
                        <Text style={styles.stepDesc}>Rédigez le compte-rendu technique de l'intervention.</Text>

                        <TextInput
                            style={[styles.textArea, { minHeight: 150 }, isReadOnly && styles.inputDisabled]}
                            multiline
                            numberOfLines={10}
                            placeholder="Ex: Remplacement effectué avec succès..."
                            placeholderTextColor={colors.textSecondary}
                            value={comment}
                            onChangeText={setComment}
                            editable={!isReadOnly}
                        />

                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.navButton} onPress={() => goToStep(2)}>
                                <Text style={styles.navButtonText}>Précédent</Text>
                            </TouchableOpacity>
                            {!isReadOnly && (
                                <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginVertical: 0 }]} onPress={handleSaveComment}>
                                    <Text style={styles.buttonText}>Suivant</Text>
                                </TouchableOpacity>
                            )}
                            {isReadOnly && (
                                <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginVertical: 0 }]} onPress={() => goToStep(4)}>
                                    <Text style={styles.buttonText}>Suivant</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            case 4: // Sign Tech
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Étape 5 : Signature Technicien</Text>
                        <View style={styles.signStatus}>
                            <Text style={styles.signLabel}>Statut :</Text>
                            {intervention.signatureTechnicien
                                ? <Text style={styles.textSuccess}>Signé ✓</Text>
                                : <Text style={styles.textError}>Non signé</Text>
                            }
                        </View>

                        {!isReadOnly && (
                            <TouchableOpacity style={styles.actionButton} onPress={handleTechSignParams}>
                                <Text style={styles.actionButtonText}>
                                    {intervention.signatureTechnicien ? 'Modifier Signature' : 'Signer'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.navButton} onPress={() => goToStep(3)}>
                                <Text style={styles.navButtonText}>Précédent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.primaryButton, { flex: 1, marginVertical: 0 }, !intervention.signatureTechnicien && !isReadOnly && styles.disabledButton]}
                                onPress={() => setCurrentStep(5)}
                                disabled={!intervention.signatureTechnicien && !isReadOnly}
                            >
                                <Text style={styles.buttonText}>Suivant</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 5: // Sign Client
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Étape 6 : Signature Client</Text>
                        <View style={styles.signStatus}>
                            <Text style={styles.signLabel}>Statut :</Text>
                            {intervention.signature
                                ? <Text style={styles.textSuccess}>Signé ✓</Text>
                                : <Text style={styles.textError}>Non signé</Text>
                            }
                        </View>

                        {!isReadOnly && (
                            <TouchableOpacity style={styles.actionButton} onPress={handleClientSignParams}>
                                <Text style={styles.actionButtonText}>
                                    {intervention.signature ? 'Modifier Signature' : 'Signer'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.navButton} onPress={() => goToStep(4)}>
                                <Text style={styles.navButtonText}>Précédent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.primaryButton, { flex: 1, marginVertical: 0 }, !intervention.signature && !isReadOnly && styles.disabledButton]}
                                onPress={() => setCurrentStep(6)}
                                disabled={!intervention.signature && !isReadOnly}
                            >
                                <Text style={styles.buttonText}>Suivant</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 6: // Cloture
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Récapitulatif & Clôture</Text>
                        <Text style={styles.stepDesc}>Voici le compte-rendu de l'intervention.</Text>

                        <View style={styles.recapCard}>
                            <Text style={styles.recapLine}>• Heures: {dayjs(arrivalDate).format('HH:mm')} - {dayjs(departureDate).format('HH:mm')}</Text>
                            <Text style={styles.recapLine}>• Matériel: {intervention.equipements.length} mouvement(s)</Text>
                            <Text style={styles.recapLine}>• Signatures: OK</Text>
                            {intervention.commentaireTechnicien && (
                                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                                    <Text style={[styles.recapLine, { fontSize: 14, color: colors.textSecondary }]}>Rapport:</Text>
                                    <Text style={{ color: colors.text, fontStyle: 'italic' }}>"{intervention.commentaireTechnicien}"</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.navButton} onPress={() => goToStep(5)}>
                                <Text style={styles.navButtonText}>Précédent</Text>
                            </TouchableOpacity>
                            {!isReadOnly && (
                                <TouchableOpacity style={[styles.primaryButton, styles.buttonSuccess, { flex: 1 }]} onPress={handleClose}>
                                    <Text style={styles.buttonText}>✅ Clôturer</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            case 7: // Terminee
                return (
                    <View style={styles.stepContainer}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 40 }}>🎉</Text>
                            <Text style={styles.stepTitle}>Intervention Terminée</Text>
                            <Text style={styles.stepDesc}>Bon travail !</Text>
                        </View>
                        <TouchableOpacity style={[styles.primaryButton, { marginBottom: 10 }]} onPress={() => setCurrentStep(6)}>
                            <Text style={styles.buttonText}>Voir le Rapport</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.secondaryButtonText}>Retour au planning</Text>
                        </TouchableOpacity>
                    </View>
                )
            default: return null;
        }
    }


    if (loading || !intervention) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {renderWizardContent()}
            </ScrollView>

            {/* Modal Stock */}
            <Modal visible={stockModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                        <Text style={styles.modalTitle}>Ajouter Matériel</Text>

                        {/* Action Type Toggle */}
                        <View style={styles.tabRow}>
                            <TouchableOpacity onPress={() => setActionType('install')} style={[styles.tab, actionType === 'install' && styles.tabActive]}>
                                <Text style={styles.tabText}>Installation</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActionType('retrait')} style={[styles.tab, actionType === 'retrait' && styles.tabActive]}>
                                <Text style={styles.tabText}>Retrait</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Retrait Source Toggle */}
                        {actionType === 'retrait' && (
                            <View style={[styles.tabRow, { marginBottom: 10 }]}>
                                <TouchableOpacity onPress={() => setRemovalSource('catalogue')} style={[styles.pill, removalSource === 'catalogue' && styles.pillActive]}>
                                    <Text style={[styles.pillText, removalSource === 'catalogue' && styles.pillTextActive]}>Catalogue</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setRemovalSource('autre')} style={[styles.pill, removalSource === 'autre' && styles.pillActive]}>
                                    <Text style={[styles.pillText, removalSource === 'autre' && styles.pillTextActive]}>Autre / Inconnu</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Scan Button (Always useful) */}
                        <View style={styles.scanRow}>
                            <Text style={styles.label}>Matériel / Source</Text>
                            <TouchableOpacity onPress={handleScan} style={styles.scanButton}>
                                <Text style={styles.scanButtonText}>📸 Scanner Code-Barres</Text>
                            </TouchableOpacity>
                        </View>
                        {scannedCode && <Text style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 5 }}>Code scanné: {scannedCode}</Text>}


                        {/* Content based on selection */}
                        {actionType === 'install' ? (
                            <View>
                                <Text style={styles.helperText}>Stock Véhicule ({techStock.length})</Text>
                                <FlatList
                                    data={techStock}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.stockItem, selectedStock?.id === item.id && styles.stockItemSelected]}
                                            onPress={() => setSelectedStock(item)}
                                        >
                                            <Text style={styles.stockText}>{item.stock.nomMateriel} (x{item.quantite})</Text>
                                            <Text style={styles.stockSubText}>{item.stock.reference}</Text>
                                        </TouchableOpacity>
                                    )}
                                    style={{ maxHeight: 200 }}
                                />
                            </View>
                        ) : (
                            // RETRAIT Logic
                            removalSource === 'catalogue' ? (
                                <View>
                                    <TextInput
                                        placeholder="Rechercher (Nom, Réf)..."
                                        style={styles.input}
                                        value={searchTerm}
                                        onChangeText={setSearchTerm}
                                    />
                                    <FlatList
                                        data={catalogStock.filter(item =>
                                            item.nomMateriel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            item.reference?.toLowerCase().includes(searchTerm.toLowerCase())
                                        )}
                                        keyExtractor={item => item.id}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[styles.stockItem, selectedStock?.id === item.id && styles.stockItemSelected]}
                                                onPress={() => setSelectedStock(item)}
                                            >
                                                <Text style={styles.stockText}>{item.nomMateriel}</Text>
                                                <Text style={styles.stockSubText}>{item.reference} - {item.fournisseur}</Text>
                                            </TouchableOpacity>
                                        )}
                                        style={{ maxHeight: 200, marginTop: 5 }}
                                    />
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 250 }}>
                                    <Text style={styles.sectionHeader}>Informations Manuelles</Text>
                                    <TextInput placeholder="Nom du matériel *" value={manualName} onChangeText={setManualName} style={[styles.input, { marginBottom: 8 }]} />
                                    <TextInput placeholder="Marque" value={manualBrand} onChangeText={setManualBrand} style={[styles.input, { marginBottom: 8 }]} />
                                    <TextInput placeholder="Modèle" value={manualModel} onChangeText={setManualModel} style={[styles.input, { marginBottom: 8 }]} />
                                    <TextInput placeholder="Numéro de Série" value={manualSerial} onChangeText={setManualSerial} style={[styles.input, { marginBottom: 8 }]} />
                                </ScrollView>
                            )
                        )}

                        {/* Retrait Status (Only for Retrait) */}
                        {actionType === 'retrait' && (
                            <View style={{ marginTop: 15 }}>
                                <Text style={styles.label}>État du matériel repris</Text>
                                <View style={styles.tabRow}>
                                    <TouchableOpacity onPress={() => setRetraitEtat('ok')} style={[styles.tab, retraitEtat === 'ok' && styles.tabActive]}>
                                        <Text style={styles.tabText}>Bon État (Stock)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setRetraitEtat('hs')} style={[styles.tab, retraitEtat === 'hs' && styles.tabActive]}>
                                        <Text style={styles.tabText}>HS / Rebut</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <Text style={[styles.label, { marginTop: 10 }]}>Quantité</Text>
                        <TextInput
                            value={quantite}
                            onChangeText={setQuantite}
                            keyboardType="numeric"
                            style={styles.input}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setStockModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddMaterial} style={styles.primaryButton}>
                                <Text style={styles.buttonText}>Valider</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20 },
    headerCard: { backgroundColor: colors.card, padding: 15, borderRadius: 10, marginBottom: 20 },
    interventionRef: { fontSize: 14, color: colors.primary, fontWeight: 'bold' },
    interventionTitle: { fontSize: 18, color: colors.text, fontWeight: 'bold', marginVertical: 5 },
    interventionAddress: { fontSize: 14, color: colors.textSecondary },

    // Wizard Steps
    stepContainer: { flex: 1, paddingHorizontal: 10 },
    stepTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
    stepDesc: { fontSize: 16, color: colors.textSecondary, marginBottom: 20 },

    // Progress
    progressContainer: { flexDirection: 'row', marginTop: 15, justifyContent: 'center', gap: 8 },
    progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
    progressDotActive: { backgroundColor: colors.primary, width: 12, height: 12 },
    progressDotCompleted: { backgroundColor: colors.success },

    // Components
    primaryButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    secondaryButton: { borderWidth: 1, borderColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
    secondaryButtonText: { color: colors.primary, fontWeight: '600' },
    navRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    navButton: { flex: 1, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
    navButtonText: { color: colors.text },
    disabledButton: { opacity: 0.5 },

    // Forms
    label: { color: colors.textSecondary, marginBottom: 5, marginTop: 10 },
    dateInput: { backgroundColor: colors.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    dateText: { color: colors.text, fontSize: 16 },
    textArea: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, color: colors.text, textAlignVertical: 'top', fontSize: 16 },

    // Items
    equipItemCard: { backgroundColor: colors.card, padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.primary },
    equipName: { color: colors.text, fontWeight: 'bold' },
    equipRef: { color: colors.textSecondary },
    emptyText: { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },

    // Badge & Status
    badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    badgeBlue: { backgroundColor: '#dbeafe' },
    badgeText: { color: '#1e40af', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    signStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    signLabel: { color: colors.text, fontSize: 16, marginRight: 10 },
    textSuccess: { color: colors.success, fontWeight: 'bold' },
    textError: { color: colors.error, fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.background, padding: 20, borderRadius: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
    tabRow: { flexDirection: 'row', marginBottom: 15 },
    tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.border },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.text },
    stockItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    stockItemSelected: { backgroundColor: colors.card },
    stockText: { color: colors.text },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
    cancelButton: { padding: 12 },
    cancelButtonText: { color: colors.textSecondary },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, color: colors.text },

    // Scanner
    scanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    scanButton: { backgroundColor: colors.text, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
    scanButtonText: { color: colors.background, fontWeight: 'bold' },

    recapCard: { backgroundColor: colors.card, padding: 15, borderRadius: 8, marginVertical: 15 },
    recapLine: { color: colors.text, fontSize: 16, marginBottom: 5 },
    buttonSuccess: { backgroundColor: colors.success },

    actionButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
    actionButtonText: { color: colors.primary, fontWeight: 'bold' },
    buttonCompleted: { backgroundColor: colors.success, borderColor: colors.success, opacity: 0.8 },
    inputDisabled: { opacity: 0.6, backgroundColor: '#f3f4f6' }, // Light gray for disabled

    // New Styles for Removal Workflow
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { color: colors.textSecondary, fontSize: 13 },
    pillTextActive: { color: '#fff', fontWeight: 'bold' },
    helperText: { color: colors.textSecondary, fontSize: 12, marginBottom: 5, fontStyle: 'italic' },
    stockSubText: { color: colors.textSecondary, fontSize: 12 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 10, marginBottom: 5 },
});
