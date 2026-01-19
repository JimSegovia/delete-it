import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PhotoAsset } from '../../hooks/usePhotos';
import { SwipeCard, SwipeCardRef } from './Card';

export interface SwipeDeckRef {
    swipeLeft: () => void;
    swipeRight: () => void;
    undo: () => void;
}

interface SwipeDeckProps {
    assets: PhotoAsset[];
    onSwipeLeft: (asset: PhotoAsset) => void;
    onSwipeRight: (asset: PhotoAsset) => void;
    onEmpty?: () => void;
    isZoomMode: boolean;
}

export const SwipeDeck = React.forwardRef<SwipeDeckRef, SwipeDeckProps>(
    ({ assets, onSwipeLeft, onSwipeRight, onEmpty, isZoomMode }, ref) => {
        const [currentIndex, setCurrentIndex] = useState(0);
        const [isUndo, setIsUndo] = useState(false);
        const [ghosts, setGhosts] = useState<{
            asset: PhotoAsset;
            direction: 'left' | 'right';
            id: string;
            initialVelocity?: number;
            initialTranslateX?: number;
        }[]>([]);
        const topCardRef = useRef<SwipeCardRef>(null);

        // Stable Refs for callbacks to prevent re-renders of child cards
        const stateRef = useRef({ assets, currentIndex, onSwipeLeft, onSwipeRight, onEmpty });
        // Update refs on every render
        stateRef.current = { assets, currentIndex, onSwipeLeft, onSwipeRight, onEmpty };

        const handleSwipeLeft = useCallback((asset: PhotoAsset, velocity?: number, translation?: number) => {
            const { assets, currentIndex, onSwipeLeft, onEmpty } = stateRef.current;
            const currentAsset = assets[currentIndex];

            // Safety check: ensure we are swiping the *current* card
            if (!currentAsset || currentAsset.id !== asset.id) return;

            setIsUndo(false);
            onSwipeLeft(asset);

            // Spawn Ghost
            setGhosts((prev) => [
                ...prev,
                {
                    asset: asset,
                    direction: 'left',
                    id: asset.id,
                    initialVelocity: velocity,
                    initialTranslateX: translation
                }
            ]);

            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            if (nextIndex >= assets.length) {
                onEmpty?.();
            }
        }, []); // Dependencies empty! Stable function

        const handleSwipeRight = useCallback((asset: PhotoAsset, velocity?: number, translation?: number) => {
            const { assets, currentIndex, onSwipeRight, onEmpty } = stateRef.current;
            const currentAsset = assets[currentIndex];

            if (!currentAsset || currentAsset.id !== asset.id) return;

            setIsUndo(false);
            onSwipeRight(asset);

            // Spawn Ghost
            setGhosts((prev) => [
                ...prev,
                {
                    asset: asset,
                    direction: 'right',
                    id: asset.id,
                    initialVelocity: velocity,
                    initialTranslateX: translation
                }
            ]);

            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            if (nextIndex >= assets.length) {
                onEmpty?.();
            }
        }, []); // Dependencies empty! Stable function

        const undo = useCallback(() => {
            const { assets, currentIndex } = stateRef.current;
            const newIndex = Math.max(0, currentIndex - 1);
            const restoredAsset = assets[newIndex];

            // Remove any ghost matching this asset to avoid duplicate keys
            if (restoredAsset) {
                setGhosts((prev) => prev.filter((g) => g.id !== restoredAsset.id));
            }

            setIsUndo(true);
            setCurrentIndex(newIndex);
        }, []);

        const removeGhost = useCallback((id: string) => {
            setGhosts((prev) => prev.filter((g) => g.id !== id));
        }, []);

        useImperativeHandle(ref, () => ({
            swipeLeft: () => {
                const { assets, currentIndex } = stateRef.current;
                const currentAsset = assets[currentIndex];
                if (!currentAsset) return;
                // Simulate gesture params for button click
                handleSwipeLeft(currentAsset, undefined, undefined);
            },
            swipeRight: () => {
                const { assets, currentIndex } = stateRef.current;
                const currentAsset = assets[currentIndex];
                if (!currentAsset) return;
                handleSwipeRight(currentAsset, undefined, undefined);
            },
            undo,
        }));

        const cards = useMemo(() => {
            // Render active cards
            // Only render up to 3 cards for performance, reversed so first index is on top
            const activeCards = assets.slice(currentIndex, currentIndex + 3).reverse().map((asset, index, array) => {
                const isTop = index === array.length - 1;
                return (
                    <SwipeCard
                        key={asset.id}
                        asset={asset}
                        onSwipeLeft={handleSwipeLeft}
                        onSwipeRight={handleSwipeRight}
                        isTop={isTop}
                        isZoomMode={isZoomMode}
                        ref={isTop ? topCardRef : null}
                        startFromLeft={isTop && isUndo}
                    />
                );
            });

            // Render ghosts
            const ghostCards = ghosts.map((ghost) => (
                <SwipeCard
                    key={ghost.id}
                    asset={ghost.asset}
                    onSwipeLeft={() => removeGhost(ghost.id)}
                    onSwipeRight={() => removeGhost(ghost.id)}
                    isTop={false} // Ghosts don't need gestures enabled usually, or maybe true if we want to grab them? Usually false is safer as they are animating out.
                    isZoomMode={false}
                    autoSwipe={ghost.direction}
                    initialTranslateX={ghost.initialTranslateX}
                    initialVelocity={ghost.initialVelocity}
                />
            ));

            return [...activeCards, ...ghostCards];
        }, [assets, currentIndex, handleSwipeLeft, handleSwipeRight, isZoomMode, isUndo, ghosts, removeGhost]);

        return (
            <View style={styles.container} pointerEvents="box-none">
                {cards}
            </View>
        );
    }
);

SwipeDeck.displayName = 'SwipeDeck';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
