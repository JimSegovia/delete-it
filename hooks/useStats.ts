import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';

const DELETION_LOG_FILE = FileSystem.documentDirectory + 'deletion_log.json';
const STATS_KEY = 'deleteit_stats';

export interface DeletionLogEntry {
    id: string;
    size: number;
    date: string; // ISO string
    type: 'photo' | 'video';
}

export interface AppStats {
    totalFreedBytes: number;
    streakDays: number;
    lastCleanupDate: string | null; // YYYY-MM-DD
}

export function useStats() {
    const [stats, setStats] = useState<AppStats>({
        totalFreedBytes: 0,
        streakDays: 0,
        lastCleanupDate: null,
    });
    const [loading, setLoading] = useState(true);

    // Load Stats on mount
    const reloadStats = useCallback(async () => {
        try {
            console.log("[reloadStats] Loading stats from AsyncStorage...");
            const data = await AsyncStorage.getItem(STATS_KEY);
            console.log("[reloadStats] Loaded data:", data);
            if (data) {
                const parsed = JSON.parse(data);
                setStats(parsed);
                checkStreakReset(parsed);
            }
        } catch (e) {
            console.error("Error loading stats", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reloadStats();
    }, [reloadStats]);

    const checkStreakReset = async (currentStats: AppStats) => {
        if (!currentStats.lastCleanupDate) return;

        const today = new Date().toISOString().split('T')[0];

        // Let's implement strict "Reset at 12am":
        // If today != lastCleanupDate AND today != 'yesterday'
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (currentStats.lastCleanupDate !== today && currentStats.lastCleanupDate !== yesterdayStr) {
            // Streak broken
            const newStats = { ...currentStats, streakDays: 0 };
            setStats(newStats);
            await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
        }
    };

    const logDeletion = useCallback(async (id: string, size: number, type: 'photo' | 'video' = 'photo') => {
        try {
            console.log(`[logDeletion] Called for ID: ${id}, Size: ${size}, Type: ${type}`);
            const today = new Date().toISOString().split('T')[0];

            // 1. Update Stats (Total + Streak)
            setStats(prev => {
                let newStreak = prev.streakDays;
                let newLastDate = prev.lastCleanupDate;

                // Update Streak Logic
                if (prev.lastCleanupDate !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (prev.lastCleanupDate === yesterdayStr) {
                        newStreak += 1; // Continued streak
                    } else {
                        newStreak = 1; // New streak (or restart)
                    }
                    newLastDate = today;
                }

                const newStats = {
                    totalFreedBytes: prev.totalFreedBytes + size,
                    streakDays: newStreak,
                    lastCleanupDate: newLastDate
                };

                console.log(`[logDeletion] New Stats calculated:`, newStats);

                // Persist stats immediately
                AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats))
                    .then(() => console.log("[logDeletion] Stats saved to AsyncStorage"))
                    .catch(e => console.error("Error saving stats", e));
                return newStats;
            });

            // 2. Append to Log File (Prevent Duplicates)
            // Read existing log? inefficient for huge logs. 
            // Better: Append-only, and maybe dedupe later? 
            // Or use a separate "deleted_ids.json" set for quick lookup?
            // User requirement: "anotar... para evitar duplicado"
            // Let's just append for now, but to avoid inserting same ID twice in one session, we could check.
            // But FS read every delete is slow.
            // Let's trust unique ID flow from app logic mostly.

            const entry: DeletionLogEntry = {
                id,
                size,
                date: new Date().toISOString(),
                type
            };

            // Check file exists
            const fileInfo = await FileSystem.getInfoAsync(DELETION_LOG_FILE);
            let content = '[]';
            if (fileInfo.exists) {
                content = await FileSystem.readAsStringAsync(DELETION_LOG_FILE);
            }

            const log: DeletionLogEntry[] = JSON.parse(content || '[]');

            // Dedupe check
            if (!log.some(item => item.id === id)) {
                log.push(entry);
                await FileSystem.writeAsStringAsync(DELETION_LOG_FILE, JSON.stringify(log));
            }

        } catch (e) {
            console.error("Error logging deletion", e);
        }
    }, []);

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 MB';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

        // Force minimum unit to be MB (index 2)
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const index = Math.max(2, i);

        return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
    };

    return {
        stats,
        loading,
        logDeletion,
        formatBytes,
        reloadStats
    };
}
