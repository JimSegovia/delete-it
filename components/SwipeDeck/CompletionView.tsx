import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { ThemeColors } from '../../constants/Colors';
import { Language, translations } from '../../constants/Translations';
import { useThemeColor } from '../../hooks/useThemeColor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COUNT = 50;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

interface ConfettiPieceProps {
    index: number;
    styles: any;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index, styles }) => {
    const startX = Math.random() * SCREEN_WIDTH;

    // stable shared values
    const translateY = useSharedValue(-Math.random() * SCREEN_HEIGHT * 0.5 - 50);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        const endY = SCREEN_HEIGHT + Math.random() * 200;
        const rotationOffset = Math.random() * 360;
        const delay = Math.random() * 1000;
        const duration = 2000 + Math.random() * 1000;

        translateY.value = withDelay(delay, withTiming(endY, { duration, easing: Easing.out(Easing.quad) }));
        rotate.value = withDelay(delay, withTiming(rotationOffset + 720, { duration }));
        opacity.value = withDelay(delay + duration - 500, withTiming(0, { duration: 500 }));
    }, [translateY, rotate, opacity]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: startX },
            { translateY: translateY.value },
            { rotate: `${rotate.value}deg` }
        ],
        opacity: opacity.value,
        backgroundColor: COLORS[index % COLORS.length],
    }));

    // In ConfettiPiece, styles are passed as props
    return <Animated.View style={[styles.confetti, style]} />;
};

const AnimatedTrashCan = ({ colors }: { colors: ThemeColors }) => {
    const rotation = useSharedValue(0);
    const scale = useSharedValue(0);

    useEffect(() => {
        // Pop in
        scale.value = withSpring(1, { damping: 12 }, (finished) => {
            if (finished) {
                // ...
            }
        });

        // Wiggle loop
        rotation.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 100 }),
                withTiming(15, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(0, { duration: 100 }),
                withDelay(1000, withTiming(0, { duration: 0 }))
            ),
            -1,
            false
        );
    }, [scale, rotation]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ]
    }));

    return (
        <Animated.View style={style}>
            <Ionicons name="trash" size={100} color={colors.accent} />
        </Animated.View>
    );
};

export default function CompletionView({ onFinish, language }: { onFinish: () => void, language: Language }) {
    const colors = useThemeColor();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        const timer = setTimeout(() => {
            // onFinish();
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const t = translations[language].swipe;

    return (
        <View style={styles.container}>
            {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
                <ConfettiPiece key={i} index={i} styles={styles} />
            ))}

            <View style={styles.content}>
                <AnimatedTrashCan colors={colors} />
                <Text style={styles.title}>{t.completion}</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={onFinish}
                >
                    <Text style={styles.buttonText}>{t.backToMenu}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
    },
    content: {
        alignItems: 'center',
        zIndex: 60,
    },
    confetti: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 20,
        marginBottom: 40,
    },
    button: {
        backgroundColor: colors.accent,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    }
});
