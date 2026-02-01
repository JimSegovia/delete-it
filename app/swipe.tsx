import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CompletionView from '../components/SwipeDeck/CompletionView';
import { SwipeDeck, SwipeDeckRef } from '../components/SwipeDeck/Deck';
import { ThemeColors } from '../constants/Colors';
import { translations } from '../constants/Translations';
import { useFeedback } from '../hooks/useFeedback';
import { useLanguage } from '../hooks/useLanguage';
import { PhotoAsset, usePhotos } from '../hooks/usePhotos';
import { useStats } from '../hooks/useStats';
import { useThemeColor } from '../hooks/useThemeColor';

export default function SwipeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse params
    const { sourceType, sourceId, selectionMode, startAssetId, endAssetId, title, minDate, maxDate } = params;

    const { logDeletion } = useStats();
    const { triggerHaptic } = useFeedback(); // Removed triggerSelectionHaptic as unused

    const photoParams = React.useMemo(() => ({
        sourceType: sourceType as 'album' | 'folder',
        sourceId: sourceId as string,
        selectionMode: selectionMode as 'default' | 'manual' | 'resume',
        startAssetId: startAssetId as string,
        endAssetId: endAssetId as string,
        minDate: minDate ? Number(minDate) : undefined,
        maxDate: maxDate ? Number(maxDate) : undefined
    }), [sourceType, sourceId, selectionMode, startAssetId, endAssetId, minDate, maxDate]);

    const { photos, loading, error, loadMore, hasNextPage } = usePhotos(photoParams);

    const deckRef = useRef<SwipeDeckRef>(null);
    const [isZoomMode, setIsZoomMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const [actionHistory, setActionHistory] = useState<('keep' | 'delete')[]>([]);

    // Batch Deletion State
    const [itemsToDelete, setItemsToDelete] = useState<PhotoAsset[]>([]);
    const [runDeletionImmediately, setRunDeletionImmediately] = useState(true);
    const [moveToTrash, setMoveToTrash] = useState(true);
    const [isExitModalVisible, setIsExitModalVisible] = useState(false);


    const colors = useThemeColor();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { language, t: allTranslations, isLoaded } = useLanguage();
    const t = allTranslations.swipe;

    // Load Settings and optionally Restore Session Data
    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                // 1. Load Preference
                const immediateMode = await AsyncStorage.getItem('deleteit_immediateDeletion');
                if (immediateMode !== null) {
                    setRunDeletionImmediately(immediateMode === 'true');
                }

                const trashMode = await AsyncStorage.getItem('deleteit_moveToTrash');
                if (trashMode !== null) {
                    setMoveToTrash(trashMode === 'true');
                }

                // 2. Load Pending Deletions if Resuming
                if (selectionMode === 'resume') {
                    const sessionJson = await AsyncStorage.getItem('deleteit_session');
                    if (sessionJson) {
                        const session = JSON.parse(sessionJson);
                        if (session.itemsToDelete && Array.isArray(session.itemsToDelete)) {
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

    // Handle Stale Permissions / Errors (e.g. invalid folder URI on resume)
    React.useEffect(() => {
        if (!loading && error && error.includes("No se puede acceder")) {
            Alert.alert(
                "Error",
                error,
                [
                    {
                        text: "OK",
                        onPress: async () => {
                            try {
                                await AsyncStorage.removeItem('deleteit_session');
                            } catch (e) {
                                console.error("Error clearing session", e);
                            }
                            router.replace('/');
                        }
                    }
                ]
            );
        }
    }, [loading, error, router]);

    // Helper: Immediate Deletion
    const deleteAsset = async (asset: PhotoAsset): Promise<boolean> => {
        try {
            if (sourceType === 'album') {
                if (moveToTrash) {
                    return await MediaLibrary.deleteAssetsAsync([asset.id]);
                } else {
                    // Try permanent delete via FileSystem
                    try {
                        // On Android, MediaLibrary asset URIs (content://) might need FileSystem.deleteAsync
                        // to attempt permanent deletion. If fails (permission), fallback.
                        // However, for Gallery items, FileSystem delete often fails. 
                        // We try anyway as per user request for older devices/specific logic.
                        if (asset.uri) {
                            await FileSystem.deleteAsync(asset.uri, { idempotent: true });
                            return true;
                        }
                        // If no URI, can't FS delete.
                        return await MediaLibrary.deleteAssetsAsync([asset.id]);
                    } catch (fsError) {
                        console.log("FS Perm delete failed, falling back to MediaLibrary", fsError);
                        // Fallback to standard delete if FS fails
                        return await MediaLibrary.deleteAssetsAsync([asset.id]);
                    }
                }
            } else {
                // Folder Source: Always FileSystem.deleteAsync (Permanent) for now
                return new Promise((resolve) => {
                    Alert.alert(
                        t.deletePermanentTitle,
                        t.deletePermanentDesc,
                        [
                            { text: translations[language].main.source.cancel, onPress: () => resolve(false), style: "cancel" },
                            {
                                text: t.delete, onPress: async () => {
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
                t.batchTitle,
                t.batchDesc.replace('{count}', String(itemsToDelete.length)),
                [
                    {
                        text: translations[language].main.source.cancel,
                        style: "cancel",
                        onPress: () => {
                            resolve();
                        }
                    },
                    {
                        text: t.delete,
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
                                Alert.alert("Error", t.batchError);
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
            setIsExitModalVisible(true);
        } else {
            router.back();
        }
    };

    const saveProgress = async (lastSwipedId: string, currentItemsVal: PhotoAsset[]) => {
        // ... (keep existing implementation)
        try {
            const sessionData = {
                sourceType,
                sourceId,
                startAssetId: lastSwipedId,
                timestamp: Date.now(),
                title: title || translations[language].main.source.camera,
                totalCount: photos.length,
                itemsToDelete: currentItemsVal // Use passed value
            };
            await AsyncStorage.setItem('deleteit_session', JSON.stringify(sessionData));
        } catch (e) {
            console.error("Error saving session", e);
        }
    };

    // Only show full screen loading if we have NO photos yet or language isn't ready
    if ((loading && photos.length === 0) || !isLoaded) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t.searching}
                </Text>
            </View>
        );
    }

    // Show error only if we have no photos to show
    if (error && photos.length === 0) {
        return (
            <View style={[styles.content, { backgroundColor: colors.background }]} pointerEvents="box-none">
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    const progress = photos.length > 0 ? (currentIndex / photos.length) * 100 : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="auto" />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleExit} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>{t.cleaning}: {title || translations[language].main.source.camera}</Text>
                    <Text style={styles.subtitle}>
                        {t.progress.replace('{current}', String(Math.min(currentIndex + 1, photos.length))).replace('{total}', String(photos.length))}
                        {loading && photos.length > 0 ? ` (${t.loading})` : ''}
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
                        language={language}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="images-outline" size={64} color="#6b7280" />
                        <Text style={styles.emptyText}>
                            {t.noPhotos}
                        </Text>
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
                    <Ionicons name="arrow-undo" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.zoomButtonWrapper}>
                <TouchableOpacity
                    style={[styles.controlButton, styles.secondaryButton, isZoomMode && styles.zoomButtonActive]}
                    onPress={() => setIsZoomMode(!isZoomMode)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="search" size={24} color={isZoomMode ? colors.accent : colors.text} />
                </TouchableOpacity>
            </View>

            {isFinished && (
                <CompletionView
                    language={language}
                    onFinish={async () => {
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

            {/* Custom Exit/Cleanup Modal */}
            <Modal
                transparent
                visible={isExitModalVisible}
                animationType="fade"
                statusBarTranslucent={true} // Fixes full screen centering on Android
                onRequestClose={() => setIsExitModalVisible(false)}
            >
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View
                        style={[styles.modalContent, { backgroundColor: colors.card }]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.warningIconContainer}>
                                <Ionicons name="trash-outline" size={32} color="#ef4444" />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.exitTitle}</Text>
                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                {t.exitDesc.replace('{count}', String(itemsToDelete.length))}
                            </Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                                onPress={async () => {
                                    setIsExitModalVisible(false);
                                    await processDeletions();
                                    router.back();
                                }}
                            >
                                <Text style={styles.modalBtnTextPrimary}>{t.deleteAndExit}</Text>
                                <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSecondary, { borderColor: colors.cardBorder }]}
                                onPress={async () => {
                                    setIsExitModalVisible(false);
                                    setItemsToDelete([]);
                                    // Save empty list to session immediately so resume won't have them
                                    const currentId = photos[currentIndex]?.id || '';
                                    await saveProgress(currentId, []);
                                    router.back();
                                }}
                            >
                                <Text style={[styles.modalBtnTextSecondary, { color: colors.text }]}>{t.discardAndExit}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalBtnGhost}
                                onPress={() => setIsExitModalVisible(false)}
                            >
                                <Text style={[styles.modalBtnTextGhost, { color: colors.textSecondary }]}>{t.continueSwiping}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: colors.separator,
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 2,
    },
    content: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 10,
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
        color: colors.textSecondary,
        textAlign: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
        zIndex: 10,
    },
    modalOverlay: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    warningIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalButtons: {
        width: '100%',
        gap: 12,
    },
    modalBtn: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalBtnPrimary: {
        elevation: 2,
    },
    modalBtnSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    modalBtnGhost: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
    },
    modalBtnTextPrimary: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalBtnTextSecondary: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalBtnTextGhost: {
        fontSize: 15,
        fontWeight: '500',
    },
    undoButtonWrapper: {
        position: 'absolute',
        bottom: 37,
        right: '50%',
        marginRight: 10,
        zIndex: 5,
    },
    zoomButtonWrapper: {
        position: 'absolute',
        bottom: 37,
        left: '50%',
        marginLeft: 10,
        zIndex: 20,
        elevation: 20,
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    secondaryButton: {
        backgroundColor: colors.card,
    },
    zoomButtonActive: {
        borderColor: colors.accent,
        borderWidth: 2,
        zIndex: 10000,
    },
});
