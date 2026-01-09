import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { PhotoAsset } from '../../hooks/usePhotos';



const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export interface SwipeCardRef {
    swipeLeft: () => void;
    swipeRight: () => void;
}

interface SwipeCardProps {
    asset: PhotoAsset;
    onSwipeLeft: (asset: PhotoAsset, velocity?: number, translation?: number) => void;
    onSwipeRight: (asset: PhotoAsset, velocity?: number, translation?: number) => void;
    isTop: boolean;
    isZoomMode: boolean;
    startFromLeft?: boolean;
    autoSwipe?: 'left' | 'right';
    initialTranslateX?: number;
    initialVelocity?: number;
}

const SwipeCardComponent = React.forwardRef<SwipeCardRef, SwipeCardProps>(
    ({ asset, onSwipeLeft, onSwipeRight, isTop, isZoomMode, startFromLeft, autoSwipe, initialTranslateX, initialVelocity }, ref) => {
        // Swipe State
        const translateX = useSharedValue(initialTranslateX ?? (startFromLeft ? -SCREEN_WIDTH * 1.5 : 0));
        const translateY = useSharedValue(0);

        // Zoom State
        const scale = useSharedValue(1);
        const savedScale = useSharedValue(1);
        const focalX = useSharedValue(0);
        const focalY = useSharedValue(0);
        const zoomTranslateX = useSharedValue(0);
        const zoomTranslateY = useSharedValue(0);
        const savedZoomTx = useSharedValue(0);
        const savedZoomTy = useSharedValue(0);

        // State to track if we are currently animating in from an undo
        const isRestoring = useSharedValue(!!startFromLeft);
        const [fileInfo, setFileInfo] = useState<{ size: string; date: string } | null>(null);

        useEffect(() => {
            let isMounted = true;
            const fetchInfo = async () => {
                try {
                    const info = await MediaLibrary.getAssetInfoAsync(asset.id);
                    if (!isMounted) return;

                    const date = new Date(asset.creationTime);
                    const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

                    // @ts-ignore - access fileSize which might not be in the type definition depending on version
                    const sizeBytes = info.fileSize || 0;
                    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);

                    setFileInfo({
                        size: `${sizeMB} MB`,
                        date: dateStr
                    });
                } catch (e) {
                    console.error("Error fetching asset info", e);
                }
            };
            fetchInfo();
            return () => { isMounted = false; };
        }, [asset.id, asset.creationTime]);

        React.useEffect(() => {
            if (startFromLeft) {
                isRestoring.value = true;
                translateY.value = 0; // Hard reset Y to 0 immediately to prevent misalignment
                translateX.value = withSpring(0, {}, (finished) => {
                    if (finished) {
                        isRestoring.value = false;
                    }
                });
            } else if (autoSwipe === 'left') {
                translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: initialVelocity });
            } else if (autoSwipe === 'right') {
                translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: initialVelocity });
            }
        }, [startFromLeft, translateX, translateY, isRestoring, autoSwipe, initialVelocity]);

        const swipeLeft = useCallback((velocity?: number, translation?: number) => {
            'worklet';
            // If called manually (button), we animate.
            // If called from gesture end, we might just want to notify parent.
            // BUT: Parent now handles "logical removal".
            // So this function is mainly used by:
            // 1. Gesture onEnd -> notify parent -> parent spawns ghost.
            // 2. Button -> notify parent -> parent spawns ghost.

            // Actually, for button press, parent calls ref.swipeLeft().
            // Ideally ref.swipeLeft() just tells parent "I'm done".

            // Wait, ref.swipeLeft is called by parent's useImperativeHandle.
            // But now parent handles logic FIRST.
            // So parent basically doesn't need to call ref.swipeLeft anymore for *active* card?
            // Correct. Parent will just REMOVE active card.
            // AND SPAWN GHOST.
            // The GHOST will have autoSwipe='left'.
            // So we don't need to do anything here except maybe expose current stats?

            // However, gesture needs to call it.
            runOnJS(onSwipeLeft)(asset, velocity, translation);
        }, [onSwipeLeft, asset]);

        const swipeRight = useCallback((velocity?: number, translation?: number) => {
            'worklet';
            runOnJS(onSwipeRight)(asset, velocity, translation);
        }, [onSwipeRight, asset]);

        useImperativeHandle(ref, () => ({
            swipeLeft,
            swipeRight,
        }));

        // --- GESTURES ---

        // 1. Swipe Gesture (Normal Mode)
        const swipeGesture = Gesture.Pan()
            .enabled(isTop && !isZoomMode)
            .maxPointers(1) // Avoid conflict with pinch
            .onUpdate((event) => {
                translateX.value = event.translationX;
                translateY.value = event.translationY;
            })
            .onEnd((event) => {
                if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
                    if (event.translationX > 0) {
                        swipeRight(event.velocityX, event.translationX);
                    } else {
                        swipeLeft(event.velocityX, event.translationX);
                    }
                } else {
                    translateX.value = withSpring(0);
                    translateY.value = withSpring(0);
                }
            });

        // 2. Zoom Pan Gesture (Zoom Mode)
        const zoomPanGesture = Gesture.Pan()
            .enabled(isTop && isZoomMode)
            .averageTouches(true)
            .onUpdate((event) => {
                zoomTranslateX.value = savedZoomTx.value + event.translationX;
                zoomTranslateY.value = savedZoomTy.value + event.translationY;
            })
            .onEnd(() => {
                savedZoomTx.value = zoomTranslateX.value;
                savedZoomTy.value = zoomTranslateY.value;
            });

        // 3. Pinch Gesture (Both Modes)
        const pinchGesture = Gesture.Pinch()
            .enabled(isTop)
            .onUpdate((event) => {
                scale.value = savedScale.value * event.scale;
                focalX.value = event.focalX;
                focalY.value = event.focalY;
            })
            .onEnd(() => {
                if (isZoomMode) {
                    if (scale.value < 1) {
                        scale.value = withSpring(1);
                        savedScale.value = 1;
                    } else {
                        savedScale.value = scale.value;
                    }
                } else {
                    // Normal mode: Revert on release
                    scale.value = withSpring(1);
                }
            });

        // Reset zoom when mode changes
        React.useEffect(() => {
            if (!isZoomMode) {
                scale.value = withSpring(1);
                zoomTranslateX.value = withSpring(0);
                zoomTranslateY.value = withSpring(0);
                savedScale.value = 1;
                savedZoomTx.value = 0;
                savedZoomTy.value = 0;
            }
        }, [isZoomMode, scale, zoomTranslateX, zoomTranslateY, savedScale, savedZoomTx, savedZoomTy]);

        // Combine gestures
        const composedGesture = Gesture.Simultaneous(
            pinchGesture,
            Gesture.Race(zoomPanGesture, swipeGesture)
        );

        // --- STYLES ---

        const animatedStyle = useAnimatedStyle(() => {
            const rotate = interpolate(
                translateX.value,
                [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
                [-10, 0, 10],
                Extrapolation.CLAMP
            );

            return {
                transform: [
                    // Swipe Translations
                    { translateX: translateX.value },
                    { translateY: translateY.value },
                    { rotate: `${rotate}deg` },

                    // Zoom Transforms
                    { translateX: focalX.value },
                    { translateY: focalY.value },
                    { translateX: zoomTranslateX.value },
                    { translateY: zoomTranslateY.value },
                    { scale: scale.value },
                    { translateX: -focalX.value },
                    { translateY: -focalY.value },
                ],
                zIndex: isZoomMode || scale.value > 1.1 ? 9999 : 1, // Bring to front when zooming
                elevation: isZoomMode || scale.value > 1.1 ? 50 : 5, // Elevation for Android
            };
        });

        const overlayStyle = useAnimatedStyle(() => {
            const opacityRight = interpolate(
                translateX.value,
                [0, SCREEN_WIDTH / 4],
                [0, 0.4],
                Extrapolation.CLAMP
            );
            const opacityLeft = interpolate(
                translateX.value,
                [-SCREEN_WIDTH / 4, 0],
                [0.4, 0],
                Extrapolation.CLAMP
            );

            // Hide overlay if we are restoring (animating in from undo)
            if (isRestoring.value) {
                return {
                    flex: 1,
                    backgroundColor: 'transparent',
                    opacity: 0,
                };
            }

            return {
                flex: 1,
                backgroundColor: translateX.value > 0 ? '#4ade80' : '#f87171',
                opacity: Math.abs(translateX.value) > 20 ? Math.max(opacityRight, opacityLeft) : 0,
            };
        });

        return (
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.card, animatedStyle]}>
                    <Image
                        source={{ uri: asset.uri }}
                        style={styles.image}
                        contentFit="cover"
                        cachePolicy="disk"
                    />
                    {fileInfo && (
                        <View style={styles.infoOverlay}>
                            <View style={styles.infoContainer}>
                                <Text style={styles.infoText}>
                                    {fileInfo.size} • {fileInfo.date}
                                </Text>
                            </View>
                        </View>
                    )}
                    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents="none" />
                </Animated.View>
            </GestureDetector>
        );
    }
);

SwipeCardComponent.displayName = 'SwipeCard';

export const SwipeCard = React.memo(SwipeCardComponent);

const styles = StyleSheet.create({
    card: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: '#fff',
        // overflow: 'hidden', // Removing this to allow zoom to overflow if needed, but we lose rounded corners on zoom. 
        // Actually, let's keep it hidden for now as "zooming the whole card" usually means the *image* zooms within the frame, or the frame scales.
        // If the user said "se hace zoom de toda la carta" (zoom is made of the whole card - negative), maybe they want the card to scale? 
        // But "ZoomableImage" scales the image. 
        // Let's stick to maxPointers first.
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    infoOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    infoContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    infoText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
});
