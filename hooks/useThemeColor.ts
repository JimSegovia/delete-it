import { useColorScheme } from 'nativewind';
import { Colors, ThemeColors } from '../constants/Colors';

export function useThemeColor(): ThemeColors {
    const { colorScheme } = useColorScheme();
    const theme = colorScheme ?? 'dark'; // Fallback to dark if not set
    return Colors[theme === 'dark' ? 'dark' : 'light'];
}
