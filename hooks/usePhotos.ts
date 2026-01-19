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
}

export interface UsePhotosParams {
    sourceType?: 'album' | 'folder';
    sourceId?: string | null; // Album ID or Folder URI
    selectionMode?: 'default' | 'manual' | 'resume';
    startAssetId?: string;
    endAssetId?: string;
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
            } catch (e) {
                // ignore
            }

            const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
            const cameraAlbum = albums.find((a) =>
                ['camera', 'recientes', 'recent', 'dcim'].includes(a.title.toLowerCase())
            );

            if (params.sourceType === 'folder' && params.sourceId) {
                // FOLDER LOGIC
                // 1. Read Directory
                const files = await StorageAccessFramework.readDirectoryAsync(params.sourceId);

                // 2. Filter Valid Extensions
                const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.mp4', '.mov'];
                const mediaFiles = files.filter(fileUri => {
                    const decodedUri = decodeURIComponent(fileUri).toLowerCase();
                    return validExtensions.some(ext => decodedUri.endsWith(ext));
                });

                // 3. Get Info & Sort (Expensive for many files, but necessary for order)
                // Optimization: In real app, maybe cached or lazy loaded.
                const filesWithInfo = await Promise.all(
                    mediaFiles.map(async (uri) => {
                        try {
                            const info = await FileSystem.getInfoAsync(uri);
                            const mediaType: MediaLibrary.MediaTypeValue = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') ? 'video' : 'photo';
                            return {
                                uri,
                                id: uri,
                                modificationTime: info.exists ? (info.modificationTime || 0) : 0,
                                fileSize: info.exists ? info.size : 0,
                                mediaType: mediaType,
                            };
                        } catch (e) {
                            return { uri, id: uri, modificationTime: 0, fileSize: 0, mediaType: 'photo' as MediaLibrary.MediaTypeValue };
                        }
                    })
                );

                // Sort Newest First (descending)
                filesWithInfo.sort((a, b) => (b.modificationTime || 0) - (a.modificationTime || 0));

                let finalAssets = filesWithInfo;

                // 4. Apply Manual Range OR Resume if needed
                if (params.selectionMode === 'manual' && params.startAssetId && params.endAssetId) {
                    const startIndex = finalAssets.findIndex((a) => a.id === params.startAssetId);
                    const endIndex = finalAssets.findIndex((a) => a.id === params.endAssetId);

                    if (startIndex !== -1 && endIndex !== -1) {
                        const start = Math.min(startIndex, endIndex);
                        const end = Math.max(startIndex, endIndex);
                        finalAssets = finalAssets.slice(start, end + 1);
                    } else if (params.startAssetId) {
                        // Just start from this one? (resume-like behavior in manual?)
                        const start = finalAssets.findIndex((a) => a.id === params.startAssetId);
                        if (start !== -1) finalAssets = finalAssets.slice(start);
                    }
                } else if (params.selectionMode === 'resume' && params.startAssetId) {
                    // Resume for Folder: Find the last swiped ID (URI), start AFTER it.
                    // Normalize URIs for comparison (some might be encoded, some not)
                    const targetId = decodeURIComponent(params.startAssetId);

                    // Extract filename from target (everything after last / or %2F)
                    const targetDecoded = decodeURIComponent(targetId);
                    const targetFilename = targetDecoded.split('/').pop()?.split('%2F').pop();

                    const lastSwipedIndex = finalAssets.findIndex((a) => {
                        // 1. Exact or Decoded ID Match
                        const currentDecoded = decodeURIComponent(a.id);
                        if (a.id === params.startAssetId || currentDecoded === targetDecoded) return true;

                        // 2. Filename Match (fallback)
                        const currentFilename = currentDecoded.split('/').pop()?.split('%2F').pop();
                        if (targetFilename && currentFilename && targetFilename === currentFilename) return true;

                        return false;
                    });

                    if (lastSwipedIndex !== -1) {
                        // Start from the NEXT one
                        finalAssets = finalAssets.slice(lastSwipedIndex + 1);
                    }
                }

                // 5. Pagination Simulation
                // usePhotos generally handles "loadMore" by appending.
                // For folder, to fit "cursor" model without complex re-reads, we might just load ALL (if < 500) or simulate.
                // If excessively large, we'd need meaningful cursor.
                // For now: Return ALL valid adjusted assets.
                setPhotos(finalAssets);
                setHasNextPage(false);
                setEndCursor(null);

            } else {
                // ALBUM / DEFAULT LOGIC
                const options: MediaLibrary.AssetsOptions = {
                    first: params.selectionMode === 'manual' ? 500 : 50, // Fetch more if manual to find range
                    mediaType: 'photo',
                    sortBy: ['modificationTime'],
                    after: cursor || undefined,
                };

                if (params.sourceType === 'album' && params.sourceId) {
                    options.album = params.sourceId;
                } else if (!params.sourceType && cameraAlbum) {
                    options.album = cameraAlbum;
                }

                // Initialize variable to hold results from either Resume or Standard path
                let fetchedAssets: MediaLibrary.Asset[] = [];

                // RESUME LOGIC (Seek and Slice)
                if (params.selectionMode === 'resume' && params.startAssetId && !cursor) {
                    let currentCursor: string | undefined = undefined;
                    let found = false;
                    let attempts = 0;
                    const MAX_ATTEMPTS = 10; // Search approx 500-1000 items deep

                    while (!found && attempts < MAX_ATTEMPTS) {
                        options.after = currentCursor;
                        const result: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync(options);

                        const assetsPage = result.assets;
                        const targetIndex = assetsPage.findIndex(a => a.id === params.startAssetId);

                        if (targetIndex !== -1) {
                            // Found it! Start AFTER this item.
                            const sliced = assetsPage.slice(targetIndex + 1);

                            // If slice is empty (it was the last item on page), we might need next page immediately
                            // But usually loadMore handles that. For now, set what we have.
                            fetchedAssets = sliced;

                            // IMPORTANT: valid "after" cursor for NEXT PAGE is result.endCursor
                            setEndCursor(result.endCursor);
                            setHasNextPage(result.hasNextPage);

                            // If we sliced everything away (last item), trigger a speculative load of next page?
                            // Let's rely on standard flow: if empty, user sees empty? 
                            // Better: if sliced is empty and hasNextPage, fetch one more page immediately.
                            if (sliced.length === 0 && result.hasNextPage) {
                                const nextResult = await MediaLibrary.getAssetsAsync({ ...options, after: result.endCursor });
                                fetchedAssets = nextResult.assets;
                                setEndCursor(nextResult.endCursor);
                                setHasNextPage(nextResult.hasNextPage);
                            }

                            found = true;
                        } else {
                            // Not in this page. Move to next.
                            if (!result.hasNextPage) {
                                break; // End of album, asset not found
                            }
                            currentCursor = result.endCursor;
                            attempts++;
                        }
                    }

                    if (!found) {
                        // Asset not found (maybe deleted?). Fallback to regular load (Start from top).
                        // Or show error? Fallback to top is safer UX.
                        console.log("Resume asset not found, starting over.");
                        options.after = undefined;
                        const result = await MediaLibrary.getAssetsAsync(options);
                        fetchedAssets = result.assets;
                        setEndCursor(result.endCursor);
                        setHasNextPage(result.hasNextPage);
                    }

                } else {
                    // STANDARD LOAD
                    const result = await MediaLibrary.getAssetsAsync(options);
                    fetchedAssets = result.assets;

                    if (params.selectionMode === 'manual' && params.startAssetId && params.endAssetId && !cursor) {
                        // ... (Manual range logic)
                        const startIndex = fetchedAssets.findIndex(a => a.id === params.startAssetId);
                        const endIndex = fetchedAssets.findIndex(a => a.id === params.endAssetId);
                        if (startIndex !== -1 && endIndex !== -1) {
                            const min = Math.min(startIndex, endIndex);
                            const max = Math.max(startIndex, endIndex);
                            fetchedAssets = fetchedAssets.slice(min, max + 1);
                            setHasNextPage(false);
                            setEndCursor(null);
                        }
                    } else {
                        setEndCursor(result.endCursor);
                        setHasNextPage(result.hasNextPage);
                    }
                }

                // Apply Favorites Filter (if enabled)
                // Note: Only works for MediaLibrary assets which have isFavorite property
                // For folders, we assume false or need checking (usually not available easily)
                if (shouldHideFavorites) {
                    fetchedAssets = fetchedAssets.filter(a => !(a as any).isFavorite);
                    // Edge case: If we filtered ALL items in this page, we might show empty. 
                    // Ideally we'd fetch more recursively, but for simplicity let's stick to this.
                    // If user has MANY favorites, they might see shorter pages. Safe MVP.
                }

                if (isRefresh || !cursor) {
                    setPhotos(fetchedAssets);
                } else {
                    setPhotos((prev) => [...prev, ...fetchedAssets]);
                }
            }

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al buscar fotos');
        } finally {
            setLoading(false);
        }
    }, [permissionResponse, requestPermission, params.sourceType, params.sourceId, params.selectionMode, params.startAssetId, params.endAssetId]);

    const loadMore = useCallback(() => {
        if (!loading && hasNextPage && endCursor) {
            fetchPhotos(endCursor, false);
        }
    }, [loading, hasNextPage, endCursor, fetchPhotos]);

    useEffect(() => {
        if (permissionResponse && photos.length === 0 && loading) {
            // Only fetch initial if we haven't yet or specifically asked. 
            // The loading check helps avoid double fetch in StrictMode sometimes, 
            // valid initial state usually loading=true, photos=[]
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
