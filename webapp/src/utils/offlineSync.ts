import { apiService } from '../services/api.service';

export interface OfflinePhoto {
    dataUrl: string;
    type: 'before' | 'after' | 'other';
}

export interface OfflineAttachedFile {
    name: string;
    dataUrl: string;
}

export interface OfflineClosure {
    interventionId: string;
    numero: string;
    heureArrivee: string;
    heureDepart: string;
    commentaireTechnicien: string;
    signatureTechnicien?: string; // base64 dataUrl
    signatureClient?: string; // base64 dataUrl
    photos: OfflinePhoto[];
    attachedFiles: OfflineAttachedFile[];
    pdfDataUrl?: string; // base64 dataUrl of generated PDF
}

const QUEUE_KEY = 'offline_closures_queue';

// Convert Blob/File to base64 data URL
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Convert base64 data URL to Blob
export function dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Get the offline closure queue from localStorage
export function getOfflineQueue(): OfflineClosure[] {
    try {
        const data = localStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading offline queue:', e);
        return [];
    }
}

// Add a closure to the offline queue
export function queueOfflineClosure(closure: OfflineClosure): void {
    try {
        const queue = getOfflineQueue();
        // Avoid duplicate queuing for the same intervention
        const filtered = queue.filter(item => item.interventionId !== closure.interventionId);
        filtered.push(closure);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
        console.log(`Queued closure for intervention ${closure.numero} (ID: ${closure.interventionId})`);
    } catch (e) {
        console.error('Error queuing offline closure:', e);
        throw new Error('Impossible d\'enregistrer les données hors-ligne localement.');
    }
}

// Remove a closure from the queue
export function removeOfflineClosure(interventionId: string): void {
    try {
        const queue = getOfflineQueue();
        const filtered = queue.filter(item => item.interventionId !== interventionId);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Error removing from offline queue:', e);
    }
}

// Synchronize all offline closures sequentially
export async function syncOfflineClosures(onProgress?: (msg: string) => void): Promise<{ successCount: number; errorCount: number }> {
    const queue = getOfflineQueue();
    let successCount = 0;
    let errorCount = 0;

    if (queue.length === 0) {
        return { successCount, errorCount };
    }

    onProgress?.(`Début de la synchronisation de ${queue.length} intervention(s) en attente...`);

    for (const closure of queue) {
        try {
            onProgress?.(`Synchronisation de l'intervention ${closure.numero}...`);

            // 1. Validate hours
            await apiService.validateInterventionHours(closure.interventionId, {
                heureArrivee: closure.heureArrivee,
                heureDepart: closure.heureDepart,
            });

            // 2. Save signatures
            if (closure.signatureTechnicien) {
                await apiService.signIntervention(closure.interventionId, {
                    type: 'technicien',
                    signature: closure.signatureTechnicien,
                });
            }
            if (closure.signatureClient) {
                await apiService.signIntervention(closure.interventionId, {
                    type: 'client',
                    signature: closure.signatureClient,
                });
            }

            // 3. Status/Commentary
            await apiService.updateInterventionStatus(closure.interventionId, {
                statut: 'terminee',
                commentaireTechnicien: closure.commentaireTechnicien,
            });

            // 4. Artifacts (Photos, Files, PDF)
            const formData = new FormData();
            let hasArtifacts = false;

            // Add Photos
            closure.photos.forEach((photo, idx) => {
                const blob = dataUrlToBlob(photo.dataUrl);
                const ext = photo.type === 'before' ? 'avant' : photo.type === 'after' ? 'apres' : 'autre';
                formData.append('files', blob, `photo_${ext}_${idx + 1}.jpg`);
                hasArtifacts = true;
            });

            // Add Attached Files
            closure.attachedFiles.forEach((file) => {
                const blob = dataUrlToBlob(file.dataUrl);
                formData.append('files', blob, file.name);
                hasArtifacts = true;
            });

            // Add PDF
            if (closure.pdfDataUrl) {
                const blob = dataUrlToBlob(closure.pdfDataUrl);
                formData.append('files', blob, `Rapport_${closure.numero || 'Intervention'}.pdf`);
                hasArtifacts = true;
            }

            if (hasArtifacts) {
                await apiService.uploadInterventionArtifacts(closure.interventionId, formData);
            }

            // Success, remove from queue
            removeOfflineClosure(closure.interventionId);
            successCount++;
            onProgress?.(`Intervention ${closure.numero} synchronisée avec succès !`);
        } catch (error) {
            console.error(`Failed to sync offline intervention ${closure.numero}:`, error);
            errorCount++;
            onProgress?.(`Échec de synchronisation pour l'intervention ${closure.numero}. Elle reste en attente.`);
        }
    }

    return { successCount, errorCount };
}
