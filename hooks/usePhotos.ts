import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface PhotoAsset extends Partial<MediaLibrary.Asset> {
    uri: string;
    id: string; // Ensure id is always present (uri for files)
    modificationTime?: number;
    fileSize?: number;
    mediaType?: MediaLibrary.MediaTypeValue;
    creationTime?: number;
    width?: number;
    height?: number;
}

export interface UsePhotosParams {
    sourceType?: 'album' | 'folder';
    sourceId?: string | null; // Album ID or Folder URI
    selectionMode?: 'default' | 'manual' | 'resume';
    startAssetId?: string;
    endAssetId?: string;
    minDate?: number; // For manual range
    maxDate?: number; // For manual range
}

export function usePhotos(params: UsePhotosParams = {}) {
    const [photos, setPhotos] = useState<PhotoAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [endCursor, setEndCursor] = useState<string | null>(null);
    const [hasNextPage, setHasNextPage] = useState(true);

    const fetchPhotos = useCallback(async (cursor: string | null = null, isRefresh = false) => {
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
            if (Platform.OS === 'android' && Platform.Version >= 29) {
                // ... (permission request remains)
            }

            // Check Settings for Filter
            let shouldHideFavorites = false;
            try {
                const hideFavSetting = await AsyncStorage.getItem('deleteit_hideFavorites');
                shouldHideFavorites = hideFavSetting === 'true';
            } catch {
                // ignore
            }

            const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
            const cameraAlbum = albums.find((a) =>
                ['camera', 'recientes', 'recent', 'dcim'].includes(a.title.toLowerCase())
            );

            if (params.sourceType === 'folder' && params.sourceId) {
                // FOLDER LOGIC
                // 1. Read Directory
                let files: string[] = [];
                try {
                    files = await StorageAccessFramework.readDirectoryAsync(params.sourceId);
                } catch (e) {
                    console.warn("Folder access revoked/failed (handled):", e);
                    setError("No se puede acceder a esta carpeta. Intente con otra.");
                    setLoading(false);
                    return;
                }

                // 2. Filter Valid Extensions
                const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
                const mediaFiles = files.filter(fileUri => {
                    const decodedUri = decodeURIComponent(fileUri).toLowerCase();
                    return validExtensions.some(ext => decodedUri.endsWith(ext));
                });

                // 3. Get Info & Sort
                const filesWithInfo = await Promise.all(
                    mediaFiles.map(async (uri) => {
                        try {
                            const info = await FileSystem.getInfoAsync(uri);
                            const lowerUri = uri.toLowerCase();

                            let mediaType: MediaLibrary.MediaTypeValue = 'photo';
                            if (lowerUri.endsWith('.mp4') || lowerUri.endsWith('.mov') || lowerUri.endsWith('.avi') || lowerUri.endsWith('.mkv') || lowerUri.endsWith('.webm')) {
                                mediaType = 'video';
                            } else if (lowerUri.endsWith('.pdf') || lowerUri.endsWith('.doc') || lowerUri.endsWith('.docx') || lowerUri.endsWith('.xls') || lowerUri.endsWith('.xlsx')) {
                                mediaType = 'unknown';
                            }

                            return {
                                uri,
                                id: uri,
                                modificationTime: info.exists ? (info.modificationTime || 0) : 0,
                                fileSize: info.exists ? info.size : 0,
                                mediaType: mediaType,
                                width: 0,
                                height: 0,
                            };
                        } catch {
                            return { uri, id: uri, modificationTime: 0, fileSize: 0, mediaType: 'photo' as MediaLibrary.MediaTypeValue, width: 0, height: 0 };
                        }
                    })
                );

                // Sort by MODIFICATION TIME for folders (Creation time not reliable on FS)
                filesWithInfo.sort((a, b) => (b.modificationTime || 0) - (a.modificationTime || 0));

                let finalAssets = filesWithInfo;

                // 4. Apply Manual Range OR Resume
                if (params.selectionMode === 'manual' && params.startAssetId && params.endAssetId) {
                    const findIndexRobust = (targetId: string) => {
                        const targetDecoded = decodeURIComponent(targetId);
                        return finalAssets.findIndex(a => {
                            if (a.id === targetId) return true;
                            if (decodeURIComponent(a.id) === targetDecoded) return true;
                            return false;
                        });
                    };

                    const startIndex = findIndexRobust(params.startAssetId);
                    const endIndex = findIndexRobust(params.endAssetId);

                    if (startIndex !== -1 && endIndex !== -1) {
                        const start = Math.min(startIndex, endIndex);
                        const end = Math.max(startIndex, endIndex);
                        finalAssets = finalAssets.slice(start, end + 1);
                    }
                } else if (params.selectionMode === 'resume' && params.startAssetId) {
                    const targetId = decodeURIComponent(params.startAssetId);
                    const targetDecoded = decodeURIComponent(targetId);
                    const targetFilename = targetDecoded.split('/').pop()?.split('%2F').pop();

                    const lastSwipedIndex = finalAssets.findIndex((a) => {
                        const currentDecoded = decodeURIComponent(a.id);
                        if (a.id === params.startAssetId || currentDecoded === targetDecoded) return true;
                        const currentFilename = currentDecoded.split('/').pop()?.split('%2F').pop();
                        if (targetFilename && currentFilename && targetFilename === currentFilename) return true;
                        return false;
                    });

                    if (lastSwipedIndex !== -1) {
                        finalAssets = finalAssets.slice(lastSwipedIndex + 1);
                    }
                }

                const uniqueAssets = finalAssets.filter((a, index, self) =>
                    index === self.findIndex((t) => t.id === a.id)
                );
                setPhotos(uniqueAssets);
                setHasNextPage(false);
                setEndCursor(null);

            } else {
                // ALBUM / DEFAULT LOGIC with CREATION TIME support

                // Use Creation Time for Albums
                const options: MediaLibrary.AssetsOptions = {
                    first: params.selectionMode === 'manual' ? 1000 : 50, // Increase batch for manual just in case
                    mediaType: ['photo', 'video'],
                    sortBy: ['creationTime'],
                    after: cursor || undefined,
                };

                if (params.sourceType === 'album' && params.sourceId) {
                    options.album = params.sourceId;
                } else if (!params.sourceType && cameraAlbum) {
                    options.album = cameraAlbum;
                }

                // TIME RANGE FILTERING (Manual Mode)
                if (params.selectionMode === 'manual' && params.minDate && params.maxDate) {
                    options.createdAfter = params.minDate;
                    options.createdBefore = params.maxDate;
                }

                let fetchedAssets: MediaLibrary.Asset[] = [];

                if (params.selectionMode === 'resume' && params.startAssetId && !cursor) {
                    let currentCursor: string | undefined = undefined;
                    let found = false;
                    let attempts = 0;
                    const MAX_ATTEMPTS = 20;

                    while (!found && attempts < MAX_ATTEMPTS) {
                        options.after = currentCursor;
                        const result: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync(options);

                        const assetsPage = result.assets;
                        const targetIndex = assetsPage.findIndex(a => a.id === params.startAssetId);

                        if (targetIndex !== -1) {
                            fetchedAssets = assetsPage.slice(targetIndex + 1);
                            setEndCursor(result.endCursor);
                            setHasNextPage(result.hasNextPage);

                            if (fetchedAssets.length === 0 && result.hasNextPage) {
                                const nextResult = await MediaLibrary.getAssetsAsync({ ...options, after: result.endCursor });
                                fetchedAssets = nextResult.assets;
                                setEndCursor(nextResult.endCursor);
                                setHasNextPage(nextResult.hasNextPage);
                            }
                            found = true;
                        } else {
                            if (!result.hasNextPage) break;
                            currentCursor = result.endCursor;
                            attempts++;
                        }
                    }

                    if (!found) {
                        options.after = undefined;
                        const result = await MediaLibrary.getAssetsAsync(options);
                        fetchedAssets = result.assets;
                        setEndCursor(result.endCursor);
                        setHasNextPage(result.hasNextPage);
                    }

                } else {
                    // STANDARD or MANUAL (First Page or Paged)
                    const result = await MediaLibrary.getAssetsAsync(options);
                    fetchedAssets = result.assets;

                    setEndCursor(result.endCursor);
                    setHasNextPage(result.hasNextPage);
                }

                // Apply Favorites Filter (if enabled)
                if (shouldHideFavorites) {
                    fetchedAssets = fetchedAssets.filter(a => !(a as any).isFavorite);
                }

                if (isRefresh || !cursor) {
                    // Even if it's a refresh, ensure the batch itself doesn't have duplicates
                    const uniqueBatch = fetchedAssets.filter((a, index, self) =>
                        index === self.findIndex((t) => t.id === a.id)
                    );
                    setPhotos(uniqueBatch);
                } else {
                    setPhotos((prev) => {
                        // Filter out assets that are already in prev, and also ensure the new batch is unique within itself
                        const uniqueNew = fetchedAssets.filter((a, index, self) =>
                            index === self.findIndex((t) => t.id === a.id) &&
                            !prev.some(p => p.id === a.id)
                        );
                        return [...prev, ...uniqueNew];
                    });
                }
            }

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al buscar fotos');
        } finally {
            setLoading(false);
        }
    }, [
        permissionResponse,
        requestPermission,
        params.sourceType,
        params.sourceId,
        params.selectionMode,
        params.startAssetId,
        params.endAssetId,
        params.minDate,
        params.maxDate
    ]);

    const loadMore = useCallback(() => {
        if (!loading && hasNextPage && endCursor) {
            fetchPhotos(endCursor, false);
        }
    }, [loading, hasNextPage, endCursor, fetchPhotos]);

    useEffect(() => {
        if (permissionResponse && photos.length === 0 && loading) {
            fetchPhotos(null, true);
        }
    }, [permissionResponse, fetchPhotos, photos.length, loading]);

    const refresh = useCallback(() => {
        setHasNextPage(true);
        setEndCursor(null);
        fetchPhotos(null, true);
    }, [fetchPhotos]);

    return { photos, loading, error, refresh, loadMore, hasNextPage };
}
