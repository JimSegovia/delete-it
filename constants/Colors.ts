export const Colors = {
    light: {
        background: '#F3F4F6',
        text: '#111827',
        textSecondary: '#4B5563',
        accent: '#8B5CF6',
        card: '#FFFFFF',
        cardBorder: '#E5E7EB',
        separator: '#E5E7EB',
        statCard: '#F9FAFB',
        buttonBackground: '#FFFFFF',
        navInactive: '#9CA3AF',
        icon: '#6B7280',
        overlay: 'rgba(255,255,255,0.85)',
        blurTint: 'light',
    },
    dark: {
        background: '#110F18',
        text: '#FFFFFF',
        textSecondary: '#9ca3af',
        accent: '#c026d3',
        card: '#1C1C2E',
        cardBorder: 'rgba(255,255,255,0.05)',
        separator: '#2D2D44',
        statCard: '#2D2D44',
        buttonBackground: '#1C1C2E',
        navInactive: '#6b7280',
        icon: '#9ca3af',
        overlay: 'rgba(0,0,0,0.85)',
        blurTint: 'dark',
    }
};

export type ThemeColors = typeof Colors.light;
