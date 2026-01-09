import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export interface PhotoAsset extends MediaLibrary.Asset { }

export function usePhotos() {
    const [photos, setPhotos] = useState<PhotoAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    const fetchPhotos = useCallback(async () => {
        try {
            setLoading(true);

            // Request permission if not granted
            if (permissionResponse?.status !== 'granted') {
                const { status } = await requestPermission();
                if (status !== 'granted') {
                    setError('Permiso denegado para acceder a las fotos');
                    setLoading(false);
                    return;
                }
            }

            // Explicity request ACCESS_MEDIA_LOCATION for Android 10+ (API 29+)
            // This is required to read EXIF data (like file size/location) from MediaStore
            if (Platform.OS === 'android' && Platform.Version >= 29) {
                const mediaLocationStatus = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION,
                    {
                        title: 'Permiso de ubicación de medios',
                        message: 'DeleteIt necesita acceso a la ubicación de los archivos multimedia para leer su información.',
                        buttonNeutral: 'Preguntar luego',
                        buttonNegative: 'Cancelar',
                        buttonPositive: 'OK',
                    }
                );
                if (mediaLocationStatus !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('ACCESS_MEDIA_LOCATION permission denied');
                    // We continue anyway, but some info might be missing
                }
            }

            // Get "Camera" album if it exists
            const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
            const cameraAlbum = albums.find((a) =>
                ['camera', 'recientes', 'recent', 'dcim'].includes(a.title.toLowerCase())
            );

            const options: MediaLibrary.AssetsOptions = {
                first: 50,
                mediaType: 'photo',
                sortBy: ['creationTime'],
            };

            if (cameraAlbum) {
                options.album = cameraAlbum;
            }

            const { assets } = await MediaLibrary.getAssetsAsync(options);
            setPhotos(assets);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al buscar fotos');
        } finally {
            setLoading(false);
        }
    }, [permissionResponse, requestPermission]);

    useEffect(() => {
        if (permissionResponse) {
            fetchPhotos();
        }
    }, [permissionResponse, fetchPhotos]);

    return { photos, loading, error, refresh: fetchPhotos, setPhotos };
}
