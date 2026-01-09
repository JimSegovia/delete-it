import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck, SwipeDeckRef } from '../components/SwipeDeck/Deck';
import { PhotoAsset, usePhotos } from '../hooks/usePhotos';

export default function SwipeScreen() {
    const router = useRouter();
    const { photos, loading, error } = usePhotos();
    const deckRef = useRef<SwipeDeckRef>(null);
    const [isZoomMode, setIsZoomMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleSwipeLeft = (asset: PhotoAsset) => {
        console.log('Delete photo:', asset.id);
        setCurrentIndex(prev => prev + 1);
    };

    const handleSwipeRight = (asset: PhotoAsset) => {
        console.log('Keep photo:', asset.id);
        setCurrentIndex(prev => prev + 1);
    };

    const handleUndo = () => {
        deckRef.current?.undo();
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    if (loading) {
        return (
            <View style={[styles.centered, styles.darkBg]}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loadingText}>Buscando fotos de tu carrete...</Text>
            </View>
        );
    }

    if (error) {
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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>Limpiando: Cámara</Text>
                    <Text style={styles.subtitle}>{Math.min(currentIndex + 1, photos.length)} de {photos.length} fotos</Text>
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
                        onEmpty={() => console.log('No more photos!')}
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
