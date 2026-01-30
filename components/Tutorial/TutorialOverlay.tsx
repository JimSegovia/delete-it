import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Huge border width to cover the screen
const BORDER_WIDTH = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.5;

export interface TutorialStep {
    key: string;
    text: string;
    x: number; // Center X
    y: number; // Center Y
    width: number;
    height: number;
    radius?: number;
}

interface TutorialOverlayProps {
    isVisible: boolean;
    steps: TutorialStep[];
    currentStepIndex: number;
    onNext: () => void;
    onSkip?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    isVisible,
    steps,
    currentStepIndex,
    onNext,
    onSkip
}) => {
    const opacity = useSharedValue(0);
    const spotlightX = useSharedValue(SCREEN_WIDTH / 2);
    const spotlightY = useSharedValue(SCREEN_HEIGHT / 2);
    const spotlightWidth = useSharedValue(0);
    const spotlightHeight = useSharedValue(0);
    const spotlightRadius = useSharedValue(0);

    const currentStep = steps[currentStepIndex];

    useEffect(() => {
        if (isVisible) {
            opacity.value = withTiming(1, { duration: 300 });
        } else {
            opacity.value = withTiming(0, { duration: 300 });
        }
    }, [isVisible]);

    useEffect(() => {
        if (isVisible && currentStep) {
            // Animate to new position
            // We want centered coordinates for the spotlight view
            // The step provides x,y as top-left usually? 
            // Let's assume the passed x,y are Top-Left and we want the spotlight to cover it.
            // Actually, for border hack, the "hole" is centered on the view.
            // Let's adjust values:

            // If inputs are TOP-LEFT, then Center is:
            const cx = currentStep.x + currentStep.width / 2;
            const cy = currentStep.y + currentStep.height / 2;

            spotlightX.value = withSpring(cx);
            // Adjust Y for Safe Area / Status Bar offset mismatch
            // measureInWindow returns absolutes. We need relative to overlay.
            // If the Overlay is effectively at (0,0) of the screen (e.g. translucent status bar or SafeAreaView behavior on Android),
            // then we don't need to subtract the status bar height.
            // User reported the hole was too high, implying we were subtracting too much.
            const yOffset = -50;
            spotlightY.value = withSpring(cy - yOffset);

            // Add some padding
            const padding = 10;
            const targetW = currentStep.width + padding * 2;
            const targetH = currentStep.height + padding * 2;
            const targetR = currentStep.radius ?? Math.min(targetW, targetH) / 2; // Default to circle/rounded

            spotlightWidth.value = withSpring(targetW);
            spotlightHeight.value = withSpring(targetH);
            spotlightRadius.value = withSpring(targetR);
        }
    }, [currentStep, isVisible]);

    const overlayStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const spotlightStyle = useAnimatedStyle(() => {
        return {
            left: spotlightX.value - spotlightWidth.value / 2 - BORDER_WIDTH,
            top: spotlightY.value - spotlightHeight.value / 2 - BORDER_WIDTH,
            width: spotlightWidth.value + BORDER_WIDTH * 2,
            height: spotlightHeight.value + BORDER_WIDTH * 2,
            borderRadius: spotlightRadius.value + BORDER_WIDTH,
            borderWidth: BORDER_WIDTH,
        };
    });

    // Text positioning logic
    const textStyle = useAnimatedStyle(() => {
        // Place text below or above based on Y position
        const isTopHalf = spotlightY.value < SCREEN_HEIGHT / 2;
        const textY = isTopHalf
            ? spotlightY.value + spotlightHeight.value / 2 + 20
            : spotlightY.value - spotlightHeight.value / 2 - 100;

        return {
            opacity: opacity.value, // Fade text with overlay
            position: 'absolute',
            top: textY,
            left: 20,
            right: 20,
            alignItems: 'center',
        };
    });

    if (!isVisible) return null;

    return (
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle, { zIndex: 9999 }]} pointerEvents="box-none">
            {/* The Spotlight View */}
            {/* We rely on the huge border to create the dimmed background */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Animated.View
                    style={[
                        styles.spotlight,
                        spotlightStyle,
                        { borderColor: 'rgba(0,0,0,0.85)' } // Dark overlay color
                    ]}
                />
            </View>

            {/* Content Container (Text & Buttons) */}
            <Animated.View style={[textStyle]} pointerEvents="box-none">
                <Text style={styles.stepText}>{currentStep?.text}</Text>
                <View style={styles.indicatorContainer}>
                    <Text style={styles.indicatorText}>
                        {currentStepIndex + 1} / {steps.length}
                    </Text>
                    <Ionicons name="finger-print" size={24} color="#c026d3" style={{ marginTop: 8 }} />
                    <Text style={styles.tapText}>Toca para continuar</Text>
                </View>
            </Animated.View>

            {/* Giant Touch Handler */}
            <Pressable style={StyleSheet.absoluteFill} onPress={onNext} />

            {/* Skip Button */}
            <Pressable
                style={styles.skipButton}
                onPress={onSkip || onNext}
                hitSlop={20}
            >
                <Text style={styles.skipText}>Saltar</Text>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    spotlight: {
        position: 'absolute',
        // content is transparent
        backgroundColor: 'transparent',
    },
    stepText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    indicatorContainer: {
        alignItems: 'center',
    },
    indicatorText: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 4,
    },
    tapText: {
        color: '#c026d3', // Pink accent
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    skipButton: {
        position: 'absolute',
        top: 60, // Safe area approx
        right: 20,
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 16,
    },
    skipText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    }
});
