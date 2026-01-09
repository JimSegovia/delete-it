import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

// Wrapper for expo-image to make it animatable
const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

interface ZoomableImageProps {
    uri: string;
    isZoomMode: boolean;
    onZoomChange?: (isZoomed: boolean) => void;
}

export const ZoomableImage = ({ uri, isZoomMode, onZoomChange }: ZoomableImageProps) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    // Reset when Zoom Mode is turned off
    useEffect(() => {
        if (!isZoomMode) {
            scale.value = withSpring(1);
            savedScale.value = 1;
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
        }
    }, [isZoomMode, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

    const pinchGesture = Gesture.Pinch()
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
                scale.value = withSpring(1);
            }
        });

    const panGesture = Gesture.Pan()
        .enabled(isZoomMode) // Only allow panning in zoom mode
        .onUpdate((event) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + event.translationX;
                translateY.value = savedTranslateY.value + event.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                // Adjust pivot for zooming
                { translateX: focalX.value },
                { translateY: focalY.value },
                { scale: scale.value },
                { translateX: -focalX.value },
                { translateY: -focalY.value },
            ],
            zIndex: scale.value > 1 ? 999 : 1, // Ensure zoomed image is on top
        };
    });

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.container}>
                <AnimatedExpoImage
                    source={{ uri }}
                    style={[styles.image, animatedStyle]}
                    contentFit="contain"
                    cachePolicy="disk"
                />
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});
