import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Linking,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Language, translations } from '../constants/Translations';
import { useThemeColor } from '../hooks/useThemeColor';


const { width } = Dimensions.get('window');

const Dot = ({ index, currentIndex, colors }: { index: number, currentIndex: number, colors: any }) => {
    const animWidth = useSharedValue(6);

    // Animate width
    React.useEffect(() => {
        animWidth.value = withSpring(index === currentIndex ? 32 : 8, {
            mass: 0.5,
            damping: 15,
            stiffness: 120,
        });
    }, [currentIndex, index, animWidth]);

    // Animate color style
    const animatedStyle = useAnimatedStyle(() => {
        const backgroundColor = withTiming(
            index === currentIndex ? colors.accent : colors.separator,
            { duration: 50 }
        );

        return {
            width: animWidth.value,
            backgroundColor,
        };
    });

    return <Animated.View style={[styles.indicator, animatedStyle]} />;
};





export default function OnboardingScreen() {
    const router = useRouter();
    const colors = useThemeColor();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [language, setLanguage] = useState<Language>('es');

    // Load language on mount
    React.useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem('deleteit_language') as Language | null;
                if (savedLang) {
                    setLanguage(savedLang);
                } else {
                    const deviceLanguage = Localization.getLocales()[0].languageCode;
                    const defaultLang: Language = (deviceLanguage === 'en' || deviceLanguage === 'es')
                        ? deviceLanguage as Language
                        : 'es';
                    setLanguage(defaultLang);
                }
            } catch (e) {
                console.error('Failed to load language', e);
            }
        };
        loadLanguage();
    }, []);

    const t = translations[language].onboarding;

    const SLIDES = [
        {
            id: '1',
            image: require('../assets/images/onboarding/delete.png'),
            title: t.slides[0].title,
            subtitle: t.slides[0].description,
        },
        {
            id: '2',
            image: require('../assets/images/onboarding/choose.png'),
            title: t.slides[1].title,
            subtitle: t.slides[1].description,
        },
        {
            id: '3',
            image: require('../assets/images/onboarding/noads.png'),
            title: t.slides[2].title,
            subtitle: t.slides[2].description,
        },
        {
            id: '4',
            title: t.permissionTitle,
            subtitle: t.permissionDesc,
            isPermission: true,
        },
    ];

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await finishOnboarding();
        }
    };

    const handlePermission = async () => {
        if (permissionResponse?.status === 'granted') {
            await finishOnboarding();
        } else {
            const { status } = await requestPermission();
            if (status === 'granted') {
                await finishOnboarding();
            } else {
                // Correctly direct to settings based on platform if needed, or simple alert
                if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                } else {
                    Linking.openSettings();
                }
            }
        }
    };

    const finishOnboarding = async () => {
        try {
            await AsyncStorage.setItem('onboarding_completed', 'true');
            router.replace('/');
        } catch (e) {
            console.error('Failed to save onboarding status', e);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        if (item.isPermission) {
            return (
                <View style={[styles.slide, { width, backgroundColor: colors.background }]}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="cloud" size={120} color={colors.accent} />
                            <View style={[styles.miniIcon, { backgroundColor: colors.card, borderColor: colors.background }]}>
                                <Ionicons name="phone-portrait-outline" size={40} color={colors.text} />
                            </View>
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                    </View>

                    <View style={styles.footerPlaceholder} />
                </View>
            );
        }

        return (
            <View style={[styles.slide, { width, backgroundColor: colors.background }]}>
                <View style={styles.imageContainer}>
                    <Image source={item.image} style={styles.image} resizeMode="contain" />
                </View>
                <View style={[styles.textContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={styles.container}>
                <StatusBar style="auto" />

                {/* Back button logic could be added here if needed, but usually onboarding traps users until done */}

                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderItem}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    style={{ flex: 1 }}
                />

                <View style={styles.footer}>
                    {/* Indicators */}
                    <View style={styles.indicatorContainer}>
                        {SLIDES.map((_, index) => (
                            <Dot key={index} index={index} currentIndex={currentIndex} colors={colors} />
                        ))}
                    </View>

                    {/* Button */}
                    {currentIndex === SLIDES.length - 1 ? (
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handlePermission}>
                            <Text style={styles.buttonText}>
                                {permissionResponse?.status === 'granted'
                                    ? t.continue
                                    : t.goToSettings}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleNext}>
                            <Text style={styles.buttonText}>{t.next}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    image: {
        width: width * 0.8,
        height: width * 0.8,
    },
    textContainer: {
        flex: 0.3,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    footer: {
        height: 150,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 50,
        paddingHorizontal: 24,
    },
    footerPlaceholder: {
        height: 20, // push content up a bit
    },
    indicatorContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    indicator: {
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    // Custom Icon Styles
    iconContainer: {
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniIcon: {
        position: 'absolute',
        bottom: -10,
        borderRadius: 12,
        padding: 4,
        elevation: 5,
        borderWidth: 4,
    }
});
