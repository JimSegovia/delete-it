import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import { BackHandler, Dimensions, FlatList, Image, PanResponder, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';


// Helper to determine num columns based on screen width
const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 4;
const ITEM_SIZE = SCREEN_WIDTH / NUM_COLUMNS - 2;

interface MediaSelectModalProps {
    isVisible: boolean;
    onClose: () => void;
    onConfirm: (selection: { startAsset: any | null, endAsset: any | null }) => void;
    sourceType: 'album' | 'folder';
    sourceIdOrFiles: string | any[]; // Album ID or Array of Files
}

export default function MediaSelectModal({
    isVisible,
    onClose,
    onConfirm,
    sourceType,
    sourceIdOrFiles
}: MediaSelectModalProps) {

    const [assets, setAssets] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const isFetching = React.useRef(false); // Ref to block duplicate fetches strictly

    // Selection State
    const [startAsset, setStartAsset] = useState<any | null>(null);
    const [endAsset, setEndAsset] = useState<any | null>(null);

    // Determine selection mode based on what's tapped
    const handleSelect = (asset: any) => {
        if (!startAsset) {
            setStartAsset(asset);
        } else if (!endAsset) {
            // Initial range selection
            setEndAsset(asset);
        } else {
            // Smart Range Adjustment logic is now primarily handled by drag, but tap still works
            const startIndex = assets.findIndex(a => a.id === startAsset.id);
            const endIndex = assets.findIndex(a => a.id === endAsset.id);
            const currentIndex = assets.findIndex(a => a.id === asset.id);

            if (startIndex !== -1 && endIndex !== -1 && currentIndex !== -1) {
                const distToStart = Math.abs(currentIndex - startIndex);
                const distToEnd = Math.abs(currentIndex - endIndex);

                if (distToStart <= distToEnd) {
                    setStartAsset(asset);
                } else {
                    setEndAsset(asset);
                }
            } else {
                setStartAsset(asset);
                setEndAsset(null);
            }
        }
    };

    const isSelected = (asset: any) => {
        return startAsset?.id === asset.id || endAsset?.id === asset.id;
    };

    const isInRange = (asset: any) => {
        // Simplistic visual check - in reality we need index comparison
        if (startAsset && endAsset) {
            const startIndex = assets.findIndex(a => a.id === startAsset.id);
            const endIndex = assets.findIndex(a => a.id === endAsset.id);
            const currentIndex = assets.findIndex(a => a.id === asset.id);

            if (startIndex === -1 || endIndex === -1 || currentIndex === -1) return false;

            const min = Math.min(startIndex, endIndex);
            const max = Math.max(startIndex, endIndex);
            return currentIndex > min && currentIndex < max;
        }
        return false;
    };

    const getSelectionCount = () => {
        if (!startAsset) return 0;
        if (!endAsset) return 1;

        const startIndex = assets.findIndex(a => a.id === startAsset.id);
        const endIndex = assets.findIndex(a => a.id === endAsset.id);

        if (startIndex === -1 || endIndex === -1) return 0;

        return Math.abs(endIndex - startIndex) + 1;
    };

    // Fetch logic
    const fetchAssets = async (reset = false) => {
        if (isFetching.current) return;
        if (!reset && (!hasNextPage || loading)) return;
        // Prevent race condition: On fast initial loads, onEndReached checks stale empty assets
        if (!reset && assets.length === 0) return;

        isFetching.current = true;
        setLoading(true);

        try {
            if (sourceType === 'album') {
                const albumId = sourceIdOrFiles as string;
                const params: MediaLibrary.AssetsOptions = {
                    album: albumId,
                    mediaType: ['photo', 'video'],
                    sortBy: ['modificationTime'],
                    first: 50,
                    after: reset ? undefined : endCursor
                };

                const result = await MediaLibrary.getAssetsAsync(params);

                if (reset) {
                    setAssets(result.assets);
                } else {
                    setAssets(prev => [...prev, ...result.assets]);
                }

                setHasNextPage(result.hasNextPage);
                setEndCursor(result.endCursor);
            } else {
                // Folder mode
                const allFiles = sourceIdOrFiles as any[];

                if (reset) {
                    // Initial load for folder
                    const initialBatch = allFiles.slice(0, 50).map((f) => ({ ...f, id: f.uri }));
                    setAssets(initialBatch);
                    setHasNextPage(50 < allFiles.length);
                } else {
                    const currentCount = assets.length;
                    const nextBatch = allFiles.slice(currentCount, currentCount + 50);

                    if (nextBatch.length > 0) {
                        const mapped = nextBatch.map((f) => ({ ...f, id: f.uri }));
                        setAssets(prev => [...prev, ...mapped]);
                        setHasNextPage(currentCount + 50 < allFiles.length);
                    } else {
                        setHasNextPage(false);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching assets", err);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    // Drag Interaction Logic
    const [scrollOffset, setScrollOffset] = useState(0);

    const getIndexFromTouch = (y: number, x: number) => {
        const headerHeight = 110; // Approx header height
        const effectiveY = y + scrollOffset - headerHeight;

        if (effectiveY < 0) return 0; // Top bounding

        const row = Math.floor(effectiveY / ITEM_SIZE);
        const col = Math.floor(x / ITEM_SIZE);

        // Validation
        if (col >= NUM_COLUMNS) return -1;

        const index = row * NUM_COLUMNS + col;
        return Math.max(0, Math.min(index, assets.length - 1));
    };

    // Helper to create specific responder for a marker
    const createMarkerResponder = (type: 'start' | 'end') => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (evt, gestureState) => {
            const index = getIndexFromTouch(gestureState.moveY, gestureState.moveX);
            if (index !== -1 && assets[index]) {
                if (type === 'start') {
                    setStartAsset(assets[index]);
                } else {
                    setEndAsset(assets[index]);
                }
            }
        },
    });

    const startResponder = React.useRef(createMarkerResponder('start')).current;
    const endResponder = React.useRef(createMarkerResponder('end')).current;



    // ... (existing code)

    useEffect(() => {
        if (isVisible) {
            // Reset state on open
            setAssets([]);
            setHasNextPage(true);
            setEndCursor(undefined);
            setStartAsset(null);
            setEndAsset(null);
            isFetching.current = false; // Reset lock
            fetchAssets(true); // Trigger reset fetch

            // Handle Android Back Button
            const backAction = () => {
                onClose();
                return true; // Prevent default behavior (exit app)
            };

            const backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                backAction
            );

            return () => backHandler.remove();
        }
    }, [isVisible, sourceType, sourceIdOrFiles]);

    if (!isVisible) return null;

    return (
        <Animated.View style={styles.container} entering={FadeIn} exiting={FadeOut}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safeArea}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Seleccionar Rango</Text>
                        <Text style={styles.subtitle}>
                            {startAsset && endAsset ? "Rango seleccionado" :
                                startAsset ? "Toca el final (o confirma)" : "Toca la primera foto"}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>




                {/* Grid */}
                <FlatList
                    data={assets}
                    keyExtractor={(item) => item.id}
                    numColumns={NUM_COLUMNS}
                    onEndReached={() => fetchAssets(false)}
                    onEndReachedThreshold={0.5}
                    onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.y)}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.grid}
                    renderItem={({ item }) => {
                        const selected = isSelected(item);
                        const inRange = isInRange(item);

                        return (
                            <Pressable onPress={() => handleSelect(item)} style={[styles.item, { width: ITEM_SIZE, height: ITEM_SIZE }]}>
                                <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
                                {(selected || inRange) && (
                                    <View style={[styles.overlay, inRange && styles.rangeOverlay]}>
                                        {selected && (
                                            <View
                                                style={styles.checkCircle}
                                                // Attach responder based on if it's start or end
                                                {...(startAsset?.id === item.id ? startResponder.panHandlers : endResponder.panHandlers)}
                                            >
                                                <Ionicons name="checkmark" size={16} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Pressable>
                        );
                    }}
                />

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <View style={styles.selectionInfo}>
                        <Text style={styles.selectionText}>
                            {startAsset ? (endAsset ? `${getSelectionCount()} elementos` : "1 elemento") : "Nada seleccionado"}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.confirmBtn, !startAsset && styles.disabledBtn]}
                        disabled={!startAsset}
                        onPress={() => onConfirm({ startAsset, endAsset })}
                    >
                        <Text style={styles.confirmText}>Confirmar</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5000,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 45, // Added extra top padding for notch
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#9ca3af',
        fontSize: 14,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    grid: {
        padding: 1,
    },
    item: {
        margin: 1,
        backgroundColor: '#333',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(192, 38, 211, 0.4)', // Purple tint
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#c026d3'
    },
    rangeOverlay: {
        backgroundColor: 'rgba(192, 38, 211, 0.2)', // Lighter tint for range
        borderWidth: 0,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#c026d3',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 16,
        backgroundColor: '#1C1C2E',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    selectionInfo: {
        flex: 1,
    },
    selectionText: {
        color: '#fff',
        fontSize: 16,
    },
    confirmBtn: {
        backgroundColor: '#c026d3',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    disabledBtn: {
        backgroundColor: '#4b5563',
        opacity: 0.5,
    },
    confirmText: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
