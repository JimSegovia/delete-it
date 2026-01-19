import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    // State for toggles
    const [moveToTrash, setMoveToTrash] = useState(true);
    const [hideFavorites, setHideFavorites] = useState(true);
    const [immediateDeletion, setImmediateDeletion] = useState(true);
    const [vibration, setVibration] = useState(true);
    const [sounds, setSounds] = useState(true);
    const [theme, setTheme] = useState<'automatic' | 'light' | 'dark'>('dark');
    const [language, setLanguage] = useState<'es' | 'en'>('es');

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

                // Load others if needed in future
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };
        // Small delay to ensure render cycle catches up or just avoids flickering too fast
        loadSettings();
    }, []);

    const toggleMoveToTrash = async (value: boolean) => {
        setMoveToTrash(value);
        await AsyncStorage.setItem('deleteit_moveToTrash', String(value));
    };

    const toggleHideFavorites = async (value: boolean) => {
        setHideFavorites(value);
        await AsyncStorage.setItem('deleteit_hideFavorites', String(value));
        // We might need to trigger a refresh in usePhotos if it's listening, 
        // but typically a restart of the session handles it.
    };

    const toggleImmediateDeletion = async (value: boolean) => {
        setImmediateDeletion(value);
        await AsyncStorage.setItem('deleteit_immediateDeletion', String(value));
    };



    return (
        <View style={styles.container}>
            <Text style={styles.screenTitle}>Ajustes</Text>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

                {/* APARIENCIA SECTION */}
                <Text style={styles.sectionHeader}>APARIENCIA</Text>
                <View style={styles.sectionContainer}>
                    {[
                        { label: 'Automático', value: 'automatic', icon: 'contrast-outline' },
                        { label: 'Claro', value: 'light', icon: 'sunny-outline' },
                        { label: 'Oscuro', value: 'dark', icon: 'moon-outline' },
                    ].map((item, index, arr) => (
                        <React.Fragment key={item.value}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setTheme(item.value as any)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.iconContainer}>
                                    <Ionicons name={item.icon as any} size={22} color="#9ca3af" />
                                </View>
                                <View style={styles.rowTextContent}>
                                    <Text style={styles.rowTitle}>{item.label}</Text>
                                </View>
                                {theme === item.value && (
                                    <Ionicons name="checkmark" size={20} color="#0ea5e9" />
                                )}
                            </TouchableOpacity>
                            {index < arr.length - 1 && <View style={styles.separator} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* IDIOMA SECTION */}
                <Text style={styles.sectionHeader}>IDIOMA</Text>
                <View style={styles.sectionContainer}>
                    {[
                        { label: 'Español', value: 'es', icon: 'language-outline' },
                        { label: 'English', value: 'en', icon: 'earth-outline' },
                    ].map((item, index, arr) => (
                        <React.Fragment key={item.value}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setLanguage(item.value as any)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.iconContainer}>
                                    <Ionicons name={item.icon as any} size={22} color="#9ca3af" />
                                </View>
                                <View style={styles.rowTextContent}>
                                    <Text style={styles.rowTitle}>{item.label}</Text>
                                </View>
                                {language === item.value && (
                                    <Ionicons name="checkmark" size={20} color="#0ea5e9" />
                                )}
                            </TouchableOpacity>
                            {index < arr.length - 1 && <View style={styles.separator} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* SEGURIDAD SECTION */}
                <Text style={styles.sectionHeader}>SEGURIDAD</Text>
                <View style={styles.sectionContainer}>

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="flash-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Eliminación Inmediata</Text>
                            <Text style={styles.rowSubtitle}>
                                {immediateDeletion
                                    ? "Borrar al deslizar"
                                    : "Borrar al finalizar sesión"}
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: '#0ea5e9' }}
                            thumbColor={'#fff'}
                            onValueChange={toggleImmediateDeletion}
                            value={immediateDeletion}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="trash-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Mover a Papelera</Text>
                            <Text style={styles.rowSubtitle}>
                                {moveToTrash
                                    ? "Los elementos se borran tras 30 días"
                                    : "Las fotos se eliminarán permanentemente"}
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: '#0ea5e9' }} // Sky blue for ON
                            thumbColor={'#fff'}
                            onValueChange={toggleMoveToTrash}
                            value={moveToTrash}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="eye-off-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Ocultar Favoritos</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: '#0ea5e9' }}
                            thumbColor={'#fff'}
                            onValueChange={toggleHideFavorites}
                            value={hideFavorites}
                        />
                    </View>
                </View>

                {/* SENSACIONES SECTION */}
                <Text style={styles.sectionHeader}>SENSACIONES</Text>
                <View style={styles.sectionContainer}>

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="phone-portrait-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Vibración</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: '#0ea5e9' }}
                            thumbColor={'#fff'}
                            onValueChange={setVibration}
                            value={vibration}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="volume-medium-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Sonidos</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#3f3f46', true: '#0ea5e9' }}
                            thumbColor={'#fff'}
                            onValueChange={setSounds}
                            value={sounds}
                        />
                    </View>
                </View>

                {/* OTROS SECTION */}
                <Text style={styles.sectionHeader}>OTROS</Text>
                <View style={styles.sectionContainer}>

                    <TouchableOpacity style={styles.row} activeOpacity={0.7}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="play-circle-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Ver Tutorial</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    <TouchableOpacity style={styles.row} activeOpacity={0.7}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="document-text-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Política de Privacidad</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* APP INFO SECTION */}
                <Text style={styles.sectionHeader}>APP INFO</Text>
                <View style={styles.sectionContainer}>
                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="information-circle-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Versión</Text>
                        </View>
                        <Text style={styles.valueText}>1.0.0</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.row}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-outline" size={22} color="#9ca3af" />
                        </View>
                        <View style={styles.rowTextContent}>
                            <Text style={styles.rowTitle}>Creado por</Text>
                        </View>
                        <Text style={styles.valueText}>Jim Bryan</Text>
                    </View>
                </View>


                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#110F18', // Matching app background
        paddingTop: 60, // Space for header/top
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
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
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContainer: {
        backgroundColor: '#1C1C2E',
        borderRadius: 16,
        overflow: 'hidden',
        paddingVertical: 4,
        marginBottom: 24,
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
        color: '#fff',
        fontWeight: '400',
    },
    rowSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
        maxWidth: '90%',
    },
    separator: {
        height: 1,
        backgroundColor: '#2D2D44',
        marginLeft: 48, // Indent separator to match text start
    },
    helperText: {
        color: '#6b7280',
        fontSize: 12,
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 24,
        marginTop: -16, // Pull closer to the section above
    },
    valueText: {
        fontSize: 16,
        color: '#6b7280',
    }
});
