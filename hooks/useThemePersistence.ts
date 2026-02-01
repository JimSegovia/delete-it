import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';

export function useThemePersistence() {
    const { setColorScheme } = useColorScheme();
    const [isThemeLoaded, setIsThemeLoaded] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                // 1. Get Saved Theme
                const savedTheme = await AsyncStorage.getItem('deleteit_theme') as 'light' | 'dark' | 'automatic' | null;

                // 2. Determine Initial Mode
                // If clean install (null), we want DARK by default as per user request.
                // If saved, use it.

                if (!savedTheme) {
                    // Default to Dark
                    setColorScheme('dark');
                    await AsyncStorage.setItem('deleteit_theme', 'dark');
                } else if (savedTheme === 'automatic') {
                    setColorScheme('system');
                } else {
                    setColorScheme(savedTheme);
                }

            } catch (error) {
                console.error("Theme persistence error", error);
                // Fallback safe
                setColorScheme('dark');
            } finally {
                setIsThemeLoaded(true);
            }
        };

        loadTheme();
    }, [setColorScheme]);

    return { isThemeLoaded };
}
