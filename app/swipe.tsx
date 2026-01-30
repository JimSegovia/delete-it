import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck, SwipeDeckRef } from '../components/SwipeDeck/Deck';
import { PhotoAsset, usePhotos } from '../hooks/usePhotos';

import { useLocalSearchParams, useRouter } from 'expo-router';
import CompletionView from '../components/SwipeDeck/CompletionView';
import { useFeedback } from '../hooks/useFeedback';
import { useStats } from '../hooks/useStats';
// ... imports

export default function SwipeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse params
    const { sourceType, sourceId, selectionMode, startAssetId, endAssetId, title } = params;

    const { logDeletion } = useStats();
    const { triggerHaptic } = useFeedback(); // Removed triggerSelectionHaptic as unused

    const { photos, loading, error, loadMore, hasNextPage } = usePhotos({
        sourceType: sourceType as 'album' | 'folder',
        sourceId: sourceId as string,
        selectionMode: selectionMode as 'default' | 'manual' | 'resume',
        startAssetId: startAssetId as string,
        endAssetId: endAssetId as string
    });

    const deckRef = useRef<SwipeDeckRef>(null);
    const [isZoomMode, setIsZoomMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const [actionHistory, setActionHistory] = useState<('keep' | 'delete')[]>([]);

    // Batch Deletion State
    const [itemsToDelete, setItemsToDelete] = useState<PhotoAsset[]>([]);
    const [runDeletionImmediately, setRunDeletionImmediately] = useState(true);

    // Load Settings and optionally Restore Session Data
    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                // 1. Load Preference
                const immediateMode = await AsyncStorage.getItem('deleteit_immediateDeletion');
                if (immediateMode !== null) {
                    setRunDeletionImmediately(immediateMode === 'true');
                }

                // 2. Load Pending Deletions if Resuming
                if (selectionMode === 'resume') {
                    const sessionJson = await AsyncStorage.getItem('deleteit_session');
                    if (sessionJson) {
                        const session = JSON.parse(sessionJson);
                        if (session.itemsToDelete && Array.isArray(session.itemsToDelete)) {
                            console.log("Restoring pending deletions:", session.itemsToDelete.length);
                            setItemsToDelete(session.itemsToDelete);
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading settings/session", e);
            }
        };
        loadSettings();
    }, [selectionMode]);

    // Helper: Immediate Deletion
    const deleteAsset = async (asset: PhotoAsset): Promise<boolean> => {
        try {
            if (sourceType === 'album') {
                return await MediaLibrary.deleteAssetsAsync([asset.id]);
            } else {
                return new Promise((resolve) => {
                    Alert.alert(
                        "Borrar archivo",
                        "¿Estás seguro de eliminar este archivo permanentemente?",
                        [
                            { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
                            {
                                text: "Eliminar", onPress: async () => {
                                    try {
                                        await FileSystem.deleteAsync(asset.uri, { idempotent: true });
                                        resolve(true);
                                    } catch (err) {
                                        console.error("FS Delete error", err);
                                        resolve(false);
                                    }
                                }, style: "destructive"
                            }
                        ]
                    );
                });
            }
        } catch (e) {
            console.error("Deletion error", e);
            return false;
        }
    };

    const handleSwipeLeft = async (asset: PhotoAsset) => {
        // ... (keep existing logging)
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);

        let newItemsToDelete = itemsToDelete;

        if (runDeletionImmediately) {
            // Immediate Delete

            // Get size before delete if possible (for logs)
            // Note: photos[currentIndex] might be stale if we shift, but 'asset' is passed in.
            // If asset.fileSize is missing, try to get it?
            let size = asset.fileSize || 0;

            // Logic copied from Card.tsx for reliable size check
            if (size === 0) {
                // 1. Try MediaLibrary first (Best for Gallery Assets)
                if (sourceType === 'album' || !asset.uri.startsWith('file://')) {
                    try {
                        const info = await MediaLibrary.getAssetInfoAsync(asset.id).catch(() => null);
                        if (info) {
                            // On Android, MediaLibrary.AssetInfo might not have a direct 'fileSize' property.
                            // We use FileSystem.getInfoAsync on localUri (or uri) to get accurate size.
                            const fileUri = info.localUri || info.uri;
                            if (fileUri) {
                                const fsInfo = await FileSystem.getInfoAsync(fileUri).catch(() => null);
                                if (fsInfo?.exists) {
                                    size = fsInfo.size || 0;
                                }
                            }
                        }
                    } catch (e) { console.log("Album size check error", e); }
                }

                // 2. Fallback to FileSystem for direct URI if size is still 0
                // (or if MediaLibrary failed but we have a URI in asset)
                if (size === 0 && asset.uri) {
                    try {
                        const fsInfo = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
                        if (fsInfo?.exists) {
                            size = fsInfo.size || 0;
                        }
                    } catch (e) { console.log("Size check error", e); }
                }
            }

            console.log(`[SwipeLeft] Deleting asset ${asset.id}, Resolved Size: ${size}`);
            const success = await deleteAsset(asset);
            if (success) {
                setActionHistory(prev => [...prev, 'delete']);
                logDeletion(asset.id, size, asset.mediaType === 'video' ? 'video' : 'photo');
            } else {
                deckRef.current?.undo();
                setCurrentIndex(prev => Math.max(0, prev - 1));
            }
        } else {
            // Batch Mode: Add to list
            newItemsToDelete = [...itemsToDelete, asset];
            setItemsToDelete(newItemsToDelete);
            setActionHistory(prev => [...prev, 'delete']);
        }

        saveProgress(asset.id, newItemsToDelete);

        if (hasNextPage && photos.length - nextIndex < 5) {
            loadMore();
        }
    };

    const handleSwipeRight = (asset: PhotoAsset) => {
        // Haptic Feedback for Keep (Light)
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        saveProgress(asset.id, itemsToDelete);

        setActionHistory(prev => [...prev, 'keep']);

        if (hasNextPage && photos.length - nextIndex < 5) {
            loadMore();
        }
    };

    const handleUndo = () => {
        if (actionHistory.length === 0) return;

        const lastAction = actionHistory[actionHistory.length - 1];

        if (lastAction === 'delete') {
            if (runDeletionImmediately) {
                console.log("Cannot undo immediate deletion");
                return;
            } else {
                // Remove from pending list
                setItemsToDelete(prev => prev.slice(0, -1));
            }
        }

        deckRef.current?.undo();
        const prevIndex = Math.max(0, currentIndex - 1);
        setCurrentIndex(prevIndex);

        setActionHistory(prev => prev.slice(0, -1));
    };

    // Process Pending Deletions
    const processDeletions = async () => {
        if (itemsToDelete.length === 0) return;

        return new Promise<void>((resolve) => {
            Alert.alert(
                "Finalizar limpieza",
                `¿Deseas eliminar ${itemsToDelete.length} fotos seleccionadas?`,
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                        onPress: () => {
                            // If cancelled, what happens? They stay in list?
                            // For safety, we keep them? Or do we assume user wants to keep them?
                            // Usually "Cancel" on exit means "Don't exit" or "Don't Delete yet".
                            // Let's assume we just resolve (do nothing).
                            resolve();
                        }
                    },
                    {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: async () => {
                            // Process
                            try {
                                if (sourceType === 'album') {
                                    // 1. Log Sizes First (Fetch info if needed)
                                    await Promise.all(itemsToDelete.map(async (asset) => {
                                        let size = asset.fileSize || 0;
                                        // Robust Size Check (Same as Card.tsx)
                                        if (size === 0) {
                                            try {
                                                const info = await MediaLibrary.getAssetInfoAsync(asset.id).catch(() => null);
                                                if (info) {
                                                    const fileUri = info.localUri || info.uri;
                                                    if (fileUri) {
                                                        const fsInfo = await FileSystem.getInfoAsync(fileUri).catch(() => null);
                                                        if (fsInfo?.exists) {
                                                            size = fsInfo.size || 0;
                                                        }
                                                    }
                                                }
                                            } catch (e) { console.log("Batch album size check error", e); }

                                            if (size === 0 && asset.uri) {
                                                try {
                                                    const fsInfo = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
                                                    if (fsInfo?.exists) size = fsInfo.size || 0;
                                                } catch (e) { console.log("Batch size check error", e); }
                                            }
                                        }
                                        logDeletion(asset.id, size, asset.mediaType === 'video' ? 'video' : 'photo');
                                    }));

                                    // 2. Delete Assets
                                    const ids = itemsToDelete.map(a => a.id);
                                    await MediaLibrary.deleteAssetsAsync(ids);
                                } else {
                                    // Folder - map deleteAsset (concurrent)
                                    await Promise.all(itemsToDelete.map(async (asset) => {
                                        try {
                                            // Log size first
                                            let size = asset.fileSize || 0;
                                            if (!size) {
                                                const info = await FileSystem.getInfoAsync(asset.uri);
                                                if (info.exists) size = info.size || 0;
                                            }

                                            await FileSystem.deleteAsync(asset.uri, { idempotent: true });
                                            logDeletion(asset.id, size, asset.mediaType === 'video' ? 'video' : 'photo');
                                        } catch (e) {
                                            console.error("Batch delete error", asset.uri, e);
                                        }
                                    }));
                                }
                                setItemsToDelete([]); // Clear
                                resolve();
                            } catch (error) {
                                console.error("Error in batch delete", error);
                                Alert.alert("Error", "Ocurrió un error al eliminar algunas fotos.");
                                resolve();
                            }
                        }
                    }
                ]
            );
        });
    };

    // Wrapper for navigation back to ensure processing
    const handleExit = async () => {
        if (!runDeletionImmediately && itemsToDelete.length > 0) {
            await processDeletions();
        }
        router.back();
    };

    const saveProgress = async (lastSwipedId: string, currentItemsVal: PhotoAsset[]) => {
        // ... (keep existing implementation)
        try {
            const sessionData = {
                sourceType,
                sourceId,
                startAssetId: lastSwipedId,
                timestamp: Date.now(),
                title: title || 'Cámara',
                totalCount: photos.length,
                itemsToDelete: currentItemsVal // Use passed value
            };
            await AsyncStorage.setItem('deleteit_session', JSON.stringify(sessionData));
        } catch (e) {
            console.error("Error saving session", e);
        }
    };

    // Only show full screen loading if we have NO photos yet
    if (loading && photos.length === 0) {
        return (
            <View style={[styles.centered, styles.darkBg]}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loadingText}>Buscando fotos de tu carrete...</Text>
            </View>
        );
    }

    // Show error only if we have no photos to show
    if (error && photos.length === 0) {
        return (
            <View style={[styles.content, styles.darkBg]} pointerEvents="box-none">
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    const progress = photos.length > 0 ? (currentIndex / photos.length) * 100 : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleExit} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>Limpiando: {title || 'Cámara'}</Text>
                    <Text style={styles.subtitle}>
                        {Math.min(currentIndex + 1, photos.length)} de {photos.length} fotos
                        {loading && photos.length > 0 ? ' (Cargando...)' : ''}
                    </Text>
                </View>
                <View style={{ width: 28 }} />
            </View>

            {/* Progress Bar Container */}
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>

            {/* Overlay to dim background */}
            {isZoomMode && <View style={styles.overlay} pointerEvents="none" />}

            <View style={[styles.content, isZoomMode && { zIndex: 20 }]} pointerEvents="box-none">
                {photos.length > 0 ? (
                    <SwipeDeck
                        ref={deckRef}
                        assets={photos}
                        onSwipeLeft={handleSwipeLeft}
                        onSwipeRight={handleSwipeRight}
                        onEmpty={() => setIsFinished(true)}
                        isZoomMode={isZoomMode}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="images-outline" size={64} color="#6b7280" />
                        <Text style={styles.emptyText}>No se encontraron fotos en la cámara</Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={() => deckRef.current?.swipeLeft()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={40} color="#fff" />
                </TouchableOpacity>

                <View style={{ width: 60 }} />

                <TouchableOpacity
                    style={[styles.button, styles.keepButton]}
                    onPress={() => deckRef.current?.swipeRight()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="checkmark" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.undoButtonWrapper}>
                <TouchableOpacity
                    style={[styles.controlButton, styles.secondaryButton]}
                    onPress={handleUndo}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-undo" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.zoomButtonWrapper}>
                <TouchableOpacity
                    style={[styles.controlButton, styles.secondaryButton, isZoomMode && styles.zoomButtonActive]}
                    onPress={() => setIsZoomMode(!isZoomMode)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="search" size={24} color={isZoomMode ? "#a855f7" : "#fff"} />
                </TouchableOpacity>
            </View>

            {isFinished && (
                <CompletionView onFinish={async () => {
                    if (!runDeletionImmediately && itemsToDelete.length > 0) {
                        await processDeletions();
                    }
                    try {
                        await AsyncStorage.removeItem('deleteit_session');
                    } catch (e) {
                        console.error("Error clearing session", e);
                    }
                    router.navigate('/');
                }} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#110F18',
    },
    darkBg: {
        backgroundColor: '#110F18',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 18, // Slightly smaller than before to match "Limpiando:..." style usually
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 2,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#2D2D44',
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#a855f7', // Purple accent
        borderRadius: 2,
    },
    content: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 10, // Content (Deck) sits at level 10
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        zIndex: 1,
        paddingBottom: 40,
    },
    button: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#ef4444',
    },
    keepButton: {
        backgroundColor: '#10b981',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9ca3af',
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        color: '#6b7280',
        textAlign: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker dim for dark mode
        zIndex: 10,
    },
    undoButtonWrapper: {
        position: 'absolute',
        bottom: 37,
        right: '50%',
        marginRight: 10,
        zIndex: 5, // Below Content (10)
    },
    zoomButtonWrapper: {
        position: 'absolute',
        bottom: 37,
        left: '50%',
        marginLeft: 10,
        zIndex: 20, // Above Content (10)
        elevation: 20, // Ensure clickability
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    secondaryButton: {
        backgroundColor: '#1C1C2E', // Dark button background
    },
    zoomButtonActive: {
        borderColor: '#a855f7',
        borderWidth: 2,
        backgroundColor: '#2e1065', // Darker purple bg when active
        zIndex: 10000,
    },
});
