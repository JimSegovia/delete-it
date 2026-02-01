import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { ThemeColors } from '../constants/Colors';
import { Language, translations } from '../constants/Translations';
import { useThemeColor } from '../hooks/useThemeColor';

interface SettingsScreenProps {
    language?: Language;
    onLanguageChange?: (lang: Language) => void;
}

export default function SettingsScreen({ language, onLanguageChange }: SettingsScreenProps) {
    // State for toggles
    const [moveToTrash, setMoveToTrash] = useState(true);
    const [hideFavorites, setHideFavorites] = useState(true);
    const [immediateDeletion, setImmediateDeletion] = useState(true);
    const [vibration, setVibration] = useState(true);
    const [sounds, setSounds] = useState(true);
    const { setColorScheme } = useColorScheme();
    const [themeSelection, setThemeSelection] = useState<'automatic' | 'light' | 'dark'>('dark');

    // Use the passed language prop. If strictly undefined, fallback to 'es', but it should be passed.
    const currentLang = language || 'es';
    const t = translations[currentLang].settings;

    const colors = useThemeColor();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    // Load settings on mount
    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const deleteMode = await AsyncStorage.getItem('deleteit_moveToTrash');
                if (deleteMode !== null) setMoveToTrash(deleteMode === 'true');

                const favoritesMode = await AsyncStorage.getItem('deleteit_hideFavorites');
                if (favoritesMode !== null) setHideFavorites(favoritesMode === 'true');

                const immediateMode = await AsyncStorage.getItem('deleteit_immediateDeletion');
                if (immediateMode !== null) setImmediateDeletion(immediateMode === 'true');

                const vibrationMode = await AsyncStorage.getItem('deleteit_vibration');
                if (vibrationMode !== null) setVibration(vibrationMode === 'true');

                const soundMode = await AsyncStorage.getItem('deleteit_sound');
                if (soundMode !== null) setSounds(soundMode === 'true');

                const savedTheme = await AsyncStorage.getItem('deleteit_theme') as 'automatic' | 'light' | 'dark' | null;
                if (savedTheme) {
                    setThemeSelection(savedTheme);
                    if (savedTheme === 'automatic') {
                        setColorScheme('system');
                    } else {
                        setColorScheme(savedTheme);
                    }
                } else {
                    setThemeSelection('dark');
                    setColorScheme('dark');
                }

                // Language is now handled by the hook
            } catch (error) {
                console.error("Failed to load settings", error);
            }
        };
        loadSettings();
    }, [setColorScheme]);

    const toggleMoveToTrash = async (value: boolean) => {
        setMoveToTrash(value);
        await AsyncStorage.setItem('deleteit_moveToTrash', String(value));
    };

    const toggleHideFavorites = async (value: boolean) => {
        setHideFavorites(value);
        await AsyncStorage.setItem('deleteit_hideFavorites', String(value));
    };

    const toggleImmediateDeletion = async (value: boolean) => {
        setImmediateDeletion(value);
        await AsyncStorage.setItem('deleteit_immediateDeletion', String(value));
    };

    const handleThemeChange = async (newTheme: 'automatic' | 'light' | 'dark') => {
        setThemeSelection(newTheme);
        if (newTheme === 'automatic') {
            setColorScheme('system');
        } else {
            setColorScheme(newTheme);
        }
        await AsyncStorage.setItem('deleteit_theme', newTheme);
    };


    const router = useRouter();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>{t.title}</Text>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

                {/* APARIENCIA SECTION */}
                <Text style={styles.sectionHeader}>{t.appearance}</Text>
                <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                    {[
                        { label: t.automatic, value: 'automatic', icon: 'contrast-outline' },
                        { label: t.light, value: 'light', icon: 'sunny-outline' },
                        { label: t.dark, value: 'dark', icon: 'moon-outline' },
                    ].map((item, index, arr) => (
                        <React.Fragment key={item.value}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => handleThemeChange(item.value as any)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.iconContainer}>
                                    <Ionicons name={item.icon as any} size={22} color={colors.icon} />
                                </View>
                                <View style={styles.rowTextContent}>
                                    <Text style={[styles.rowTitle, { color: colors.text }]}>{item.label}</Text>
                                </View>
                                {themeSelection === item.value && (
                                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                                )}
                            </TouchableOpacity>
                            {index < arr.length - 1 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* IDIOMA SECTION */}
                <Text style={styles.sectionHeader}>{t.language}</Text>
                <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                    {[
                        { label: t.spanish, value: 'es', icon: 'language-outline' },
                        { label: t.english, value: 'en', icon: 'earth-outline' },
                    ].map((item, index, arr) => (
                        <React.Fragment key={item.value}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => {
                                    if (onLanguageChange) onLanguageChange(item.value as any);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.iconContainer}>
                                    <Ionicons name={item.icon as any} size={22} color={colors.icon} />
                                </View>
                                <View style={styles.rowTextContent}>
                                    <Text style={[styles.rowTitle, { color: colors.text }]}>{item.label}</Text>
                                </View>
                                {language === item.value && (
                                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                                )}
                            </TouchableOpacity>
                            {index < arr.length - 1 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* SEGURIDAD SECTION */}
                <Text style={styles.sectionHeader}>{t.security}</Text>
                <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="flash-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.immediateDeletion}</Text>
                            <Text style={styles.rowSubtitle}>
                                {immediateDeletion
                                    ? t.immediateDeletionSubOn
                                    : t.immediateDeletionSubOff}
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: colors.accent }}
                            thumbColor={'#fff'}
                            onValueChange={toggleImmediateDeletion}
                            value={immediateDeletion}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="trash-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.moveToTrash}</Text>
                            <Text style={styles.rowSubtitle}>
                                {moveToTrash
                                    ? t.moveToTrashSubOn
                                    : t.moveToTrashSubOff}
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: colors.accent }}
                            thumbColor={'#fff'}
                            onValueChange={toggleMoveToTrash}
                            value={moveToTrash}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="eye-off-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.hideFavorites}</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: colors.accent }}
                            thumbColor={'#fff'}
                            onValueChange={toggleHideFavorites}
                            value={hideFavorites}
                        />
                    </View>
                </View>

                {/* SENSACIONES SECTION */}
                <Text style={styles.sectionHeader}>{t.sensations}</Text>
                <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="phone-portrait-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.vibration}</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: colors.accent }}
                            thumbColor={'#fff'}
                            onValueChange={async (val) => {
                                setVibration(val);
                                await AsyncStorage.setItem('deleteit_vibration', String(val));
                            }}
                            value={vibration}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="volume-medium-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.sounds}</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: colors.accent }}
                            thumbColor={'#fff'}
                            onValueChange={async (val) => {
                                setSounds(val);
                                await AsyncStorage.setItem('deleteit_sound', String(val));
                            }}
                            value={sounds}
                        />
                    </View>
                </View>

                {/* OTROS SECTION */}
                <Text style={styles.sectionHeader}>{t.others}</Text>
                <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>

                    <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={async () => {
                            await AsyncStorage.setItem('tutorial_completed', 'false');
                            router.replace({ pathname: '/', params: { showTutorial: 'true' } });
                        }}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="play-circle-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.viewTutorial}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                    <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={async () => {
                            await AsyncStorage.removeItem('onboarding_completed');
                            router.replace('/onboarding');
                        }}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="rocket-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>Ver Intro</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                    <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={() => {
                            Linking.openURL('https://delete-it-app.netlify.app/');
                        }}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="document-text-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.privacyPolicy}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* APP INFO SECTION */}
                <Text style={styles.sectionHeader}>{t.appInfo}</Text>
                <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="information-circle-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.version}</Text>
                        </View>
                        <Text style={styles.valueText}>0.9.1</Text>
                    </View>

                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-outline" size={22} color={colors.icon} />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{t.createdBy}</Text>
                        </View>
                        <Text style={styles.valueText}>Jim Bryan</Text>
                    </View>
                </View>


                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 60,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 30,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        paddingVertical: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
        minHeight: 56,
    },
    iconContainer: {
        width: 32,
        alignItems: 'flex-start',
    },
    rowTextContent: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    rowTitle: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '400',
    },
    rowSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
        maxWidth: '90%',
    },
    separator: {
        height: 1,
        backgroundColor: colors.separator,
        marginLeft: 48,
    },
    helperText: {
        color: colors.textSecondary,
        fontSize: 12,
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 24,
        marginTop: -16,
    },
    valueText: {
        fontSize: 16,
        color: colors.textSecondary,
    }
});
