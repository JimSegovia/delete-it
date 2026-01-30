import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';

// Key names for storage
const VIBRATION_KEY = 'deleteit_vibration';
const SOUND_KEY = 'deleteit_sound';

export function useFeedback() {
    const [vibrationEnabled, setVibrationEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Load settings on mount (and listen for changes if we implemented an event emitter, 
    // but for now we'll load once or expect parent to pass it, or simple polling/focus effect)
    // Actually, best to expose a reload like useStats
    const loadSettings = useCallback(async () => {
        try {
            const vib = await AsyncStorage.getItem(VIBRATION_KEY);
            if (vib !== null) setVibrationEnabled(vib === 'true');

            const snd = await AsyncStorage.getItem(SOUND_KEY);
            if (snd !== null) setSoundEnabled(snd === 'true');
        } catch (e) {
            console.error("Error loading feedback settings", e);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
        if (vibrationEnabled) {
            Haptics.impactAsync(style).catch(() => { });
        }
    }, [vibrationEnabled]);

    const triggerSelectionHaptic = useCallback(() => {
        if (vibrationEnabled) {
            Haptics.selectionAsync().catch(() => { });
        }
    }, [vibrationEnabled]);

    const triggerSound = useCallback(async (type: 'tap' | 'success' | 'delete' = 'tap') => {
        if (!soundEnabled) return;

        // Since we don't have custom sound assets yet, and expo-av isn't clearly installed,
        // we will implement the LOGIC here but leave the implementation commented or placeholder.
        // If user wants system sound, React Native doesn't expose it easily.
        // A common trick is using a very light haptic as "sound" feel, but user requested both.

        // TODO: Enable this once 'expo-av' is confirmed and assets like 'assets/click.mp3' exist.
        /*
        try {
            const { Audio } = require('expo-av');
            let soundFile;
            switch (type) {
                case 'delete': soundFile = require('../assets/sounds/delete.mp3'); break;
                case 'success': soundFile = require('../assets/sounds/success.mp3'); break;
                default: soundFile = require('../assets/sounds/tap.mp3'); break;
            }
            if (soundFile) {
                const { sound } = await Audio.Sound.createAsync(soundFile);
                await sound.playAsync();
                // cleanup? sound.unloadAsync() usually needed after
            }
        } catch (e) {
            console.log("Sound error", e);
        }
        */
        console.log(`[Sound] Triggered: ${type} (Enabled: ${soundEnabled})`);
    }, [soundEnabled]);

    // Helper to toggle manually if needed locally (though SettingsScreen does it directly via AsyncStorage)
    // We expose reload to refresh state if settings changed elsewhere

    return {
        vibrationEnabled,
        soundEnabled,
        triggerHaptic,
        triggerSelectionHaptic,
        triggerSound,
        reloadSettings: loadSettings
    };
}
