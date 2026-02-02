import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemeColors } from '../../constants/Colors';
import { PhotoAsset } from '../../hooks/usePhotos';
import { useThemeColor } from '../../hooks/useThemeColor';

interface FullscreenZoomProps {
    isVisible: boolean;
    asset: PhotoAsset;
    onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FullscreenZoom: React.FC<FullscreenZoomProps> = ({ isVisible, asset, onClose }) => {
    const colors = useThemeColor();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    // Zoom State
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTx = useSharedValue(0);
    const savedTy = useSharedValue(0);

    // Reset on open/close
    useEffect(() => {
        if (!isVisible) {
            scale.value = 1;
            savedScale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
            savedTx.value = 0;
            savedTy.value = 0;
        }
    }, [isVisible, scale, savedScale, translateX, translateY, savedTx, savedTy]);

    // Video Player
    const player = useVideoPlayer(asset?.uri ?? '', (player) => {
        player.loop = true;
        player.muted = false;
        // logic handled in effect
    });

    useEffect(() => {
        if (isVisible && asset?.mediaType === 'video' && player) {
            player.play();
        } else if (player) {
            player.pause();
        }
    }, [isVisible, asset, player]);


    // Gestures
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .averageTouches(true)
        .onStart(() => {
            savedTx.value = translateX.value;
            savedTy.value = translateY.value;
        })
        .onUpdate((e) => {
            translateX.value = savedTx.value + e.translationX;
            translateY.value = savedTy.value + e.translationY;
        })
        .onEnd(() => {
            savedTx.value = translateX.value;
            savedTy.value = translateY.value;
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    if (!asset) return null;

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
            navigationBarTranslucent={true}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.container}>
                    {/* Explicit Status Bar to ensure transparency/dimming works visually if needed, though Modal handles it */}
                    {isVisible && <StatusBar style="light" translucent />}

                    <GestureDetector gesture={composedGesture}>
                        <Animated.View style={[styles.content, animatedStyle]}>
                            {asset.mediaType === 'video' ? (
                                <VideoView
                                    player={player}
                                    style={styles.image}
                                    contentFit="contain"
                                    nativeControls={false}
                                />
                            ) : (
                                <Image
                                    source={{ uri: asset.uri }}
                                    style={styles.image}
                                    contentFit="contain"
                                    cachePolicy="disk"
                                />
                            )}
                        </Animated.View>
                    </GestureDetector>

                    {/* Floating Lupa Button (Toggle Off) */}
                    <View style={styles.zoomButtonWrapper}>
                        <TouchableOpacity
                            style={[styles.controlButton, styles.secondaryButton, styles.zoomButtonActive]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="search" size={24} color={colors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black', // Full black background as requested
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    zoomButtonWrapper: {
        position: 'absolute',
        // If swipe.tsx uses SafeAreaView, its 'bottom: 37' starts from the safe area edge.
        // So we must add bottomInset here to match.
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
        // zIndex: 10000, // Handled by wrapper zIndex
    },
});
