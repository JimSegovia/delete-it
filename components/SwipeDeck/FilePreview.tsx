import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemeColors } from '../../constants/Colors';

interface FilePreviewProps {
    uri: string;
    extension: string;
    colors: ThemeColors;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ uri, extension, colors }) => {
    const [loading, setLoading] = useState(true);

    // Normalize extension
    const ext = extension.toLowerCase().replace('.', '');
    const isAndroid = Platform.OS === 'android';

    const iconName =
        ext === 'pdf' ? 'document-text-outline' :
            ['xls', 'xlsx'].includes(ext) ? 'grid-outline' :
                'document-outline';

    // Android: WebView often fails for local docs. Show fallback with open option.
    if (isAndroid) {
        return (
            <TouchableOpacity
                style={[styles.container, styles.fallbackContainer, { backgroundColor: colors.card }]}
                onPress={() => Linking.openURL(uri)}
            >
                <Ionicons name={iconName as any} size={80} color={colors.text} />
                <Text style={[styles.filename, { color: colors.text }]}>
                    {decodeURIComponent(uri).split('/').pop()?.split('%2F').pop()}
                </Text>
                <Text style={{ color: colors.accent, marginTop: 20 }}>Toca para abrir</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <WebView
                source={{ uri: uri }}
                style={styles.webview}
                originWhitelist={['*']}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={(e) => {
                    // If WebView fails, we might want to show the fallback
                    console.log("WebView Error", e.nativeEvent);
                    setLoading(false);
                }}
                // Android specific props (removed for Android path, kept for iOS)
                scalesPageToFit={true}
            />

            {loading && (
                <View style={[styles.loadingOverlay, { backgroundColor: colors.card }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            )}

            {/*
         Fallback/Overlay could be added here if WebView fails visually
         (hard to detect visual failure in WebView)
      */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 20, // Match card border radius
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    filename: {
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
    }
});
