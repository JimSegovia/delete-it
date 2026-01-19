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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COUNT = 50;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

interface ConfettiPieceProps {
    index: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index }) => {
    const startX = Math.random() * SCREEN_WIDTH;

    // stable shared values
    const translateY = useSharedValue(-Math.random() * SCREEN_HEIGHT * 0.5 - 50);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        // const startY = translateY.value; // Store initial value if needed, or just use logic
        const endY = SCREEN_HEIGHT + Math.random() * 200;
        const rotationOffset = Math.random() * 360;

        const delay = Math.random() * 1000;
        const duration = 2000 + Math.random() * 1000;

        translateY.value = withDelay(delay, withTiming(endY, { duration, easing: Easing.out(Easing.quad) }));
        rotate.value = withDelay(delay, withTiming(rotationOffset + 720, { duration }));
        opacity.value = withDelay(delay + duration - 500, withTiming(0, { duration: 500 }));
    }, []); // Empty deps because we want this to run once on mount with random values calculated INSIDE

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: startX },
            { translateY: translateY.value },
            { rotate: `${rotate.value}deg` }
        ],
        opacity: opacity.value,
        backgroundColor: COLORS[index % COLORS.length],
    }));

    return <Animated.View style={[styles.confetti, style]} />;
};

const AnimatedTrashCan = () => {
    const rotation = useSharedValue(0);
    const scale = useSharedValue(0);

    useEffect(() => {
        // Pop in
        scale.value = withSpring(1, { damping: 12 });

        // Wiggle loop
        rotation.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 100 }),
                withTiming(15, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(0, { duration: 100 }),
                withDelay(1000, withTiming(0, { duration: 0 })) // Pause
            ),
            -1, // Infinite
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ]
    }));

    return (
        <Animated.View style={style}>
            <Ionicons name="trash" size={100} color="#ef4444" />
        </Animated.View>
    );
};

export default function CompletionView({ onFinish }: { onFinish: () => void }) {
    // const router = useRouter(); // Unused

    useEffect(() => {
        // ...
        const timer = setTimeout(() => {
            // onFinish();
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
                <ConfettiPiece key={i} index={i} />
            ))}

            <View style={styles.content}>
                <AnimatedTrashCan />
                <Text style={styles.title}>¡Limpieza Completada!</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={onFinish}
                >
                    <Text style={styles.buttonText}>Volver al Menú Principal</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#110F18', // Consistent dark theme
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
        color: '#fff',
        marginTop: 20,
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#a855f7',
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
