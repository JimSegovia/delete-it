import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { useCallback, useEffect, useState } from 'react';
import { Language, translations } from '../constants/Translations';

export function useLanguage() {
    const [language, setLanguage] = useState<Language>('es');
    const [isLoaded, setIsLoaded] = useState(false);

    const loadLanguage = useCallback(async () => {
        try {
            const savedLang = await AsyncStorage.getItem('deleteit_language') as Language | null;
            if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
                setLanguage(savedLang);
            } else {
                const deviceLanguage = Localization.getLocales()[0].languageCode;
                const defaultLang: Language = (deviceLanguage === 'en' || deviceLanguage === 'es')
                    ? deviceLanguage as Language
                    : 'es';
                setLanguage(defaultLang);
                await AsyncStorage.setItem('deleteit_language', defaultLang);
            }
        } catch (e) {
            console.error('Failed to load language', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const changeLanguage = useCallback(async (newLang: Language) => {
        setLanguage(newLang);
        await AsyncStorage.setItem('deleteit_language', newLang);
    }, []);

    useEffect(() => {
        loadLanguage();
    }, [loadLanguage]);

    const t = translations[language];

    return { language, isLoaded, changeLanguage, t };
}
