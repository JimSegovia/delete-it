import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Dimensions, Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

import { ThemeColors } from '../../constants/Colors';
import { Language } from '../../constants/Translations';
import { PhotoAsset } from '../../hooks/usePhotos';
import { useThemeColor } from '../../hooks/useThemeColor';
import { FilePreview } from './FilePreview';



const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
    language: Language;
}

const SwipeCardComponent = React.forwardRef<SwipeCardRef, SwipeCardProps>(
    ({ asset, onSwipeLeft, onSwipeRight, isTop, isZoomMode, startFromLeft, autoSwipe, initialTranslateX, initialVelocity, language }, ref) => {
        // Swipe State
        const translateX = useSharedValue(initialTranslateX ?? (startFromLeft ? -SCREEN_WIDTH * 1.5 : 0));
        // Determine Render Type EARLY
        const renderType = useMemo(() => {
            if (asset.mediaType === 'video') return 'video';
            if (asset.mediaType === 'unknown' || (asset.uri && /\.(pdf|doc|docx|xls|xlsx)$/i.test(asset.uri))) return 'file';
            return 'image';
        }, [asset]);

        // Smart Resize State
        const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
            asset.width && asset.height ? { width: asset.width, height: asset.height } : null
        );

        // Fetch dimensions if missing (e.g. from Folder)
        useEffect(() => {
            if (!imageDimensions && asset.uri && renderType === 'image') {
                RNImage.getSize(asset.uri, (w: number, h: number) => {
                    setImageDimensions({ width: w, height: h });
                }, (err: any) => {
                    // Fallback or ignore
                    console.log("Failed to get image size", err);
                });
            }
        }, [asset, imageDimensions, renderType]);

        // Determine Content Fit based on aspect ratio
        const contentFit = useMemo(() => {
            if (!imageDimensions) return 'cover'; // Default
            const { width, height } = imageDimensions;
            // Landscape -> Contain
            if (width > height) return 'contain';
            // Portrait -> Cover
            return 'cover';
        }, [imageDimensions]);

        // Zoom State
        const scale = useSharedValue(1);
        const savedScale = useSharedValue(1);
        const focalX = useSharedValue(0);
        const focalY = useSharedValue(0);
        const zoomTranslateX = useSharedValue(0);
        const zoomTranslateY = useSharedValue(0);
        const savedZoomTx = useSharedValue(0);
        const savedZoomTy = useSharedValue(0);
        const translateY = useSharedValue(0);
        const colors = useThemeColor();
        const styles = React.useMemo(() => createStyles(colors), [colors]);

        // State to track if we are currently animating in from an undo
        const isRestoring = useSharedValue(!!startFromLeft);

        // Track zoom state for gesture enabling without reading shared value in render
        const [fileInfo, setFileInfo] = useState<{ size: string; date: string } | null>(null);

        // Video Player Setup (expo-video)
        // Note: useVideoPlayer is stable
        const player = useVideoPlayer(asset.uri, (player) => {
            player.loop = true;
            player.muted = true;
            // Initial state based on whether we are top card
            if (isTop && !autoSwipe) {
                player.play();
            } else {
                player.pause();
            }
        });

        // Effect to control play/pause based on props (Top Card)
        // Effect to control play/pause based on props (Top Card)
        useEffect(() => {
            if (!player) return;
            try {
                if (isTop && !autoSwipe) {
                    player.play();
                } else {
                    player.pause();
                }
            } catch (e) { console.log("Player effect error", e); }
        }, [isTop, autoSwipe, player]);

        useEffect(() => {
            // OPTIMIZATION: Don't fetch info for ghost cards (they are just animating out)
            if (autoSwipe) return;

            let isMounted = true;
            const fetchInfo = async () => {
                if (!asset || !asset.id) return;
                try {
                    let sizeBytes = asset.fileSize || 0;
                    let date = new Date(asset.creationTime || asset.modificationTime || Date.now());

                    // 1. Try MediaLibrary first (Best for Gallery Assets)
                    // If we don't have size, try getting full asset info. 
                    if (sizeBytes === 0) {
                        const info = await MediaLibrary.getAssetInfoAsync(asset.id).catch(() => null);
                        if (isMounted && info) {
                            // On Android, MediaLibrary.AssetInfo might not have a direct 'fileSize' property.
                            // We use FileSystem.getInfoAsync on localUri (or uri) to get accurate size.
                            const fileUri = info.localUri || info.uri;
                            if (fileUri) {
                                const fsInfo = await FileSystem.getInfoAsync(fileUri).catch(() => null);
                                if (isMounted && fsInfo?.exists) {
                                    sizeBytes = fsInfo.size || 0;
                                }
                            }
                            // Even if FS fails, we might have creationTime
                            date = new Date(info.creationTime || asset.creationTime || Date.now());
                        }
                    }

                    // 2. Fallback to FileSystem for direct URI if size is still 0
                    if (sizeBytes === 0 && asset.uri) {
                        const fsInfo = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
                        if (isMounted && fsInfo?.exists) {
                            sizeBytes = fsInfo.size || 0;
                        }
                    }

                    if (!isMounted) return;

                    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
                    const dateStr = date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

                    setFileInfo({
                        size: sizeBytes > 0 ? `${sizeMB} MB` : '',
                        date: dateStr
                    });
                } catch (e) {
                    console.error("Error fetching asset info", e);
                }
            };
            fetchInfo();
            return () => { isMounted = false; };
        }, [asset, autoSwipe, language]);

        React.useEffect(() => {
            if (startFromLeft) {
                isRestoring.value = true;
                translateY.value = 0; // Hard reset Y to 0 immediately to prevent misalignment
                translateX.value = 0; // Reset X to 0 from whatever it was
                // We want to animate FROM left (-Width) to 0
                // So momentarily set to left then spring to 0?
                // Actually initial state hook handled the initial value.
                // We just need to animate to 0.
                translateX.value = -SCREEN_WIDTH * 1.5; // Force start pos
                translateX.value = withSpring(0, {}, (finished) => {
                    if (finished) {
                        isRestoring.value = false;
                    }
                });
            } else if (autoSwipe === 'left') {
                translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: initialVelocity }, (finished) => {
                    if (finished) {
                        runOnJS(onSwipeLeft)(asset);
                    }
                });
            } else if (autoSwipe === 'right') {
                translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: initialVelocity }, (finished) => {
                    if (finished) {
                        runOnJS(onSwipeRight)(asset);
                    }
                });
            }
        }, [startFromLeft, translateX, translateY, isRestoring, autoSwipe, initialVelocity, onSwipeLeft, onSwipeRight, asset]);

        // Reset zoom when mode is disabled
        useEffect(() => {
            if (!isZoomMode) {
                scale.value = withSpring(1);
                focalX.value = withSpring(0);
                focalY.value = withSpring(0);
                zoomTranslateX.value = withSpring(0);
                zoomTranslateY.value = withSpring(0);
                savedScale.value = 1;
                savedZoomTx.value = 0;
                savedZoomTy.value = 0;
            }
        }, [isZoomMode, scale, focalX, focalY, zoomTranslateX, zoomTranslateY, savedScale, savedZoomTx, savedZoomTy]);

        const swipeLeft = useCallback((velocity?: number, translation?: number) => {
            'worklet';
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

        // Video Player Ref to avoid Reanimated trying to serialize the player object
        const playerRef = React.useRef(player);
        useEffect(() => {
            playerRef.current = player;
        }, [player]);

        // 4. Tap Gesture (Video Only)
        // Enable Tap logic for Video
        const togglePlayback = useCallback(() => {
            const p = playerRef.current;
            if (p) {
                try {
                    if (p.playing) {
                        p.pause();
                    } else {
                        p.play();
                    }
                } catch (e) {
                    console.log("Error toggling playback", e);
                }
            }
        }, []);

        const pauseVideo = useCallback(() => {
            const p = playerRef.current;
            if (p) {
                try {
                    if (p.playing) p.pause();
                } catch (e) { console.log("Error pausing video", e); }
            }
        }, []);

        const playVideo = useCallback(() => {
            const p = playerRef.current;
            if (p) {
                try {
                    if (!p.playing) p.play();
                } catch (e) { console.log("Error playing video", e); }
            }
        }, []);

        const tapGesture = useMemo(() => Gesture.Tap()
            .enabled(isTop && renderType === 'video')
            .onEnd(() => {
                runOnJS(togglePlayback)();
            }), [isTop, renderType, togglePlayback]);

        // --- GESTURES ---

        // 1. Swipe Gesture (Normal Mode)
        const swipeGesture = useMemo(() => Gesture.Pan()
            .enabled(isTop && !isZoomMode)
            .activeOffsetX([-20, 20])
            .maxPointers(1) // Avoid conflict with pinch
            .onStart(() => {
                if (renderType === 'video') {
                    runOnJS(pauseVideo)();
                }
            })
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
                    // Resume video if swipe cancelled
                    if (renderType === 'video') {
                        runOnJS(playVideo)();
                    }
                }
            }), [isTop, isZoomMode, translateX, translateY, swipeLeft, swipeRight, renderType, pauseVideo, playVideo]);

        // 2. Pinch Gesture (Zoom)
        const pinchGesture = useMemo(() => Gesture.Pinch()
            .enabled(isTop)
            .onStart((event) => {
                if (renderType === 'video') runOnJS(pauseVideo)();
                savedScale.value = scale.value;
                focalX.value = event.focalX - SCREEN_WIDTH / 2;
                focalY.value = event.focalY - SCREEN_HEIGHT / 2;
            })
            .onUpdate((event) => {
                scale.value = savedScale.value * event.scale;
            })
            .onEnd(() => {
                // Return to default if zoomed out OR if we are not in persistent zoom mode
                if (scale.value < 1 || !isZoomMode) {
                    scale.value = withSpring(1);
                    focalX.value = withSpring(0);
                    focalY.value = withSpring(0);
                    zoomTranslateX.value = withSpring(0);
                    zoomTranslateY.value = withSpring(0);
                } else {
                    savedScale.value = scale.value;
                }
            }), [isTop, isZoomMode, renderType, pauseVideo, scale, savedScale, focalX, focalY, zoomTranslateX, zoomTranslateY]);

        // 3. Pan Gesture (Zoom Mode)
        // Only active when we are in explicit zoom mode
        const zoomPanGesture = useMemo(() => Gesture.Pan()
            .enabled(isTop && isZoomMode)
            .averageTouches(true)
            .minPointers(1)
            .onStart(() => {
                savedZoomTx.value = zoomTranslateX.value;
                savedZoomTy.value = zoomTranslateY.value;
            })
            .onUpdate((event) => {
                zoomTranslateX.value = savedZoomTx.value + event.translationX;
                zoomTranslateY.value = savedZoomTy.value + event.translationY;
            })
            .onEnd(() => {
                savedZoomTx.value = zoomTranslateX.value;
                savedZoomTy.value = zoomTranslateY.value;
            }), [isTop, isZoomMode, zoomTranslateX, zoomTranslateY, savedZoomTx, savedZoomTy]);

        // Combine gestures
        const composedGesture = useMemo(() => {
            if (renderType === 'video') {
                return Gesture.Simultaneous(swipeGesture, tapGesture);
            }

            // Priority: Pinch > ZoomPan > Swipe
            // If we are pinching, we want pinch.
            // If we are zoomed in, we want panning.
            // If we are default, we want swipe.

            // However, Gesture.Race can vary.
            // Let's use Simultaneous for pinch to coexist with others if needed, 
            // but for single touch, we need swipe vs zoomPan.

            const nativePan = Gesture.Simultaneous(pinchGesture, zoomPanGesture);

            // If in Zoom Mode, Swipe should be disabled physically in its definition
            // but we can also handle it here.

            return Gesture.Simultaneous(nativePan, swipeGesture);
        }, [pinchGesture, zoomPanGesture, swipeGesture, tapGesture, renderType]);

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

            const backgroundColor = interpolateColor(
                translateX.value,
                [-SCREEN_WIDTH / 4, 0, SCREEN_WIDTH / 4],
                ['#f87171', 'transparent', '#4ade80']
            );

            return {
                flex: 1,
                backgroundColor,
                opacity: Math.abs(translateX.value) > 20 ? Math.max(opacityRight, opacityLeft) : 0,
            };
        });

        return (
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.card, animatedStyle]}>
                    {renderType === 'image' && (
                        <Image
                            source={{ uri: asset.uri }}
                            style={styles.image}
                            contentFit={contentFit}
                            cachePolicy="disk"
                        />
                    )}

                    {renderType === 'video' && player && (
                        <VideoView
                            player={player}
                            style={[styles.image, { borderRadius: 20 }]} // Explicit border radius for Android clipping
                            contentFit="cover"
                            nativeControls={false}
                        />
                    )}

                    {renderType === 'file' && (
                        <FilePreview
                            uri={asset.uri}
                            extension={asset.uri.split('.').pop() || ''}
                            colors={colors}
                        />
                    )}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    card: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: colors.card,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    fileContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: colors.card, // Already set on container, but ensuring contrast
    },
    fileName: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
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
        backgroundColor: colors.overlay,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    infoText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
});
