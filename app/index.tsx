import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import MediaSelectModal from '../components/MediaSelectModal';
import SettingsScreen from '../components/SettingsScreen';
import SplashScreen from '../components/SplashScreen';
import { TutorialOverlay, TutorialStep } from '../components/Tutorial/TutorialOverlay';
import { ThemeColors } from '../constants/Colors';
import { useFeedback } from '../hooks/useFeedback';
import { useLanguage } from '../hooks/useLanguage';
import { useStats } from '../hooks/useStats';
import { useThemeColor } from '../hooks/useThemeColor';

const { StorageAccessFramework } = FileSystem;

// Tab Item Component
const TabItem = ({
  label,
  iconName,
  isActive,
  onPress,
  colors,
  styles,
}: {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: any;
}) => {
  const activeColor = colors.accent;
  const inactiveColor = colors.navInactive;

  // Use useDerivedValue for better stability
  const animation = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    animation.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive, animation]);

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(animation.value, [0, 1], [0, -18]) },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      // Delay opacity to create sequence: Icon moves, then text appears.
      opacity: interpolate(animation.value, [0.5, 1], [0, 1]),
      transform: [
        { translateY: interpolate(animation.value, [0, 1], [10, 0]) },
      ]
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.navItem} hitSlop={10}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={iconName}
          size={26}
          color={isActive ? activeColor : inactiveColor}
        />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', bottom: 0 }, textStyle]}>
        <Text style={[styles.navText, { color: activeColor }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};


// Wrapper helper for scale animation
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ScaleButton = ({ children, onPress, style }: { children: React.ReactNode, onPress: () => void, style?: any }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => scale.value = withTiming(0.95, { duration: 100 })}
      onPressOut={() => scale.value = withTiming(1, { duration: 100 })}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { stats, formatBytes, reloadStats } = useStats();
  const { triggerSelectionHaptic } = useFeedback();
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [isSourceMenuOpen, setSourceMenuOpen] = useState(false);

  // Reload stats whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reloadStats();
    }, [reloadStats])
  );

  // Tutorial State
  const [isTutorialVisible, setTutorialVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [layouts, setLayouts] = useState<Record<string, { x: number, y: number, width: number, height: number }>>({});

  // Loading State for Splash
  const [isLoading, setIsLoading] = useState(true);
  const colors = useThemeColor();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { language, t: allTranslations, changeLanguage, isLoaded } = useLanguage();
  const t = allTranslations.main;
  const tTutorial = allTranslations.settings;
  // but let's use what we have or extend Translations.ts if needed.
  // Actually, I should probably add tutorial translations to Translations.ts to be clean.
  // For now I'll use the ones I put in settings or hardcode logical ones.
  // Wait, I'll update Translations.ts first to include tutorial and more index strings.

  // Check First Launch & Splash
  useEffect(() => {
    const checkFirstLaunch = async () => {
      // Intentional delay for splash screen visibility (User request "telon")
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
        if (onboardingCompleted !== 'true') {
          router.replace('/onboarding');
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };
    checkFirstLaunch();
  }, [router]);

  // Check for tutorial on mount (only if loaded)
  useEffect(() => {
    if (isLoading) return;

    const checkTutorial = async () => {
      const completed = await AsyncStorage.getItem('tutorial_completed');
      if (completed !== 'true' || params.showTutorial === 'true') {
        setTimeout(() => setTutorialVisible(true), 1000);
      }
    };
    checkTutorial();
  }, [params.showTutorial, isLoading, router]);

  // Refs for measurement


  // Refs for measurement
  const headerRef = React.useRef<View>(null);
  const totalCardRef = React.useRef<View>(null);
  const streakCardRef = React.useRef<View>(null);
  const actionCardRef = React.useRef<View>(null); // Start/Source
  const tabRef = React.useRef<View>(null);

  const measureLayouts = () => {
    const measure = (ref: any, key: string) => {
      ref.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
        setLayouts(prev => ({ ...prev, [key]: { x, y, width, height } }));
      });
    };

    setTimeout(() => {
      measure(headerRef, 'header');
      measure(totalCardRef, 'total');
      measure(streakCardRef, 'streak');
      measure(actionCardRef, 'actions');
      measure(tabRef, 'tab');
    }, 100);
  };

  useEffect(() => {
    if (isTutorialVisible) {
      measureLayouts();
    }
  }, [isTutorialVisible]);

  const tutorialSteps: TutorialStep[] = [
    {
      key: 'header',
      text: tTutorial.tutorial.header,
      ...(layouts['header'] || { x: 0, y: 0, width: 0, height: 0 }),
      radius: 20
    },
    {
      key: 'total',
      text: tTutorial.tutorial.total,
      ...(layouts['total'] || { x: 0, y: 0, width: 0, height: 0 }),
      radius: 20
    },
    {
      key: 'streak',
      text: tTutorial.tutorial.streak,
      ...(layouts['streak'] || { x: 0, y: 0, width: 0, height: 0 }),
      radius: 20
    },
    {
      key: 'actions',
      text: tTutorial.tutorial.actions,
      ...(layouts['actions'] || { x: 0, y: 0, width: 0, height: 0 }),
      radius: 30
    },
    {
      key: 'tab',
      text: tTutorial.tutorial.tab,
      ...(layouts['tab'] || { x: 0, y: 0, width: 0, height: 0 }),
      radius: 30
    },
  ].filter(s => s.width > 0);

  const handleNextStep = async () => {
    triggerSelectionHaptic();
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setTutorialVisible(false);
      await AsyncStorage.setItem('tutorial_completed', 'true');
      router.setParams({ showTutorial: undefined });
      setCurrentStep(0);
    }
  };

  const handleSkip = async () => {
    setTutorialVisible(false);
    await AsyncStorage.setItem('tutorial_completed', 'true');
    router.setParams({ showTutorial: undefined });
    setCurrentStep(0);
  };

  // Source Selection State
  const [sourceType, setSourceType] = useState<'camera' | 'album' | 'folder'>('camera');
  const [folderName, setFolderName] = useState(language === 'es' ? 'Cámara' : 'Camera');
  const [fileCount, setFileCount] = useState(1205);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedFolderUri, setSelectedFolderUri] = useState<string | null>(null);

  // Modal View State
  const [modalView, setModalView] = useState<'main' | 'albums'>('main');
  const [albums, setAlbums] = useState<(MediaLibrary.Album & { coverUri?: string })[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [latestAssetUri, setLatestAssetUri] = useState<string | null>(null);

  // Advanced Start Selection State
  const [isStartMenuOpen, setStartMenuOpen] = useState(false);
  const [isMediaSelectVisible, setMediaSelectVisible] = useState(false);
  const [manualSelection, setManualSelection] = useState<{ startAsset: any | null, endAsset: any | null } | null>(null);
  const [selectionMode, setSelectionMode] = useState<'default' | 'resume' | 'manual'>('default');

  // Storage for Folder Files (needed to pass to MediaSelectModal)
  const [folderFilesCache, setFolderFilesCache] = useState<any[]>([]);

  // Fetch Preview for Start Card
  useEffect(() => {
    const fetchPreview = async () => {
      if (sourceType === 'folder') return; // Handled in selection

      if (permissionResponse?.status === 'granted') {
        const params: MediaLibrary.AssetsOptions = {
          first: 1,
          mediaType: ['photo', 'video'],
          sortBy: ['creationTime'],
        };

        if (sourceType === 'album' && selectedAlbumId) {
          params.album = selectedAlbumId;
        }

        const assets = await MediaLibrary.getAssetsAsync(params);
        if (assets.assets.length > 0) {
          setLatestAssetUri(assets.assets[0].uri);
        }
      }
    };

    fetchPreview();
  }, [sourceType, selectedAlbumId, permissionResponse]);

  // Session Management
  const [resumeSession, setResumeSession] = useState<{ startAssetId: string, timestamp: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        try {
          const sessionJson = await AsyncStorage.getItem('deleteit_session');
          if (sessionJson) {
            const session = JSON.parse(sessionJson);
            // Check if session matches current source
            const isSameSource = session.sourceType === sourceType &&
              (sourceType === 'album'
                ? session.sourceId === selectedAlbumId
                : (session.sourceId === selectedFolderUri || decodeURIComponent(session.sourceId) === decodeURIComponent(selectedFolderUri || ''))
              );

            if (isSameSource) {
              setResumeSession(session);
              // Auto-select resume if we just came back and it matches
              setSelectionMode('resume');
              setManualSelection(null);
            } else {
              setResumeSession(null);
            }
          } else {
            setResumeSession(null);
          }
        } catch (e) {
          console.error("Error loading session:", e);
        }
      };

      checkSession();
    }, [sourceType, selectedAlbumId, selectedFolderUri])
  );

  // Handle Android Back Button
  useEffect(() => {
    const backAction = () => {
      if (isSourceMenuOpen) {
        if (modalView === 'albums') {
          setModalView('main'); // Go back to main menu
        } else {
          setSourceMenuOpen(false); // Close menu
        }
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isSourceMenuOpen, modalView]);

  // Default Selection OR Restore Session on Load
  useEffect(() => {
    const initSessionOrDefaults = async () => {
      // 1. Wait for permissions
      if (permissionResponse?.status !== 'granted') return;

      try {
        // 2. Check for saved session FIRST
        const sessionJson = await AsyncStorage.getItem('deleteit_session');

        if (sessionJson) {
          const session = JSON.parse(sessionJson);
          // Basic validation
          if (session.sourceType && session.sourceId) {
            console.log("Restoring session:", session);

            // Restore State
            setSourceType(session.sourceType);
            if (session.sourceType === 'album') {
              setSelectedAlbumId(session.sourceId);
            } else {
              setSelectedFolderUri(session.sourceId);
              // For folders, we need to ensure we can read it, but let's assume valid
              setFolderFilesCache([]); // Clear cache, will reload if needed
            }

            // Restore UI Meta
            setFolderName(session.title || (session.sourceType === 'folder' ? 'Carpeta' : 'Álbum'));
            setFileCount(session.totalCount || 0);

            // Set Resume Mode
            setResumeSession(session);
            setSelectionMode('resume');
            setManualSelection(null);

            return; // Stop here, don't load defaults
          }
        }
      } catch (e) {
        console.error("Error restoring session", e);
      }

      // 3. Fallback to Default (Camera/Recent) if no session
      const fetchedAlbums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      const validAlbums = fetchedAlbums.filter(album => album.assetCount > 0);

      if (validAlbums.length > 0) {
        const firstAlbum = validAlbums[0];
        setSourceType('album');
        setFolderName(firstAlbum.title);
        setFileCount(firstAlbum.assetCount);
        setSelectedAlbumId(firstAlbum.id);
        setSelectionMode('default');
      }
    };

    initSessionOrDefaults();
  }, [permissionResponse?.status]);

  // Fetch Albums with Covers
  const handleOpenAlbums = async () => {
    if (permissionResponse?.status !== 'granted') {
      await requestPermission();
    }

    const fetchedAlbums = await MediaLibrary.getAlbumsAsync({
      includeSmartAlbums: true,
    });
    // Filter empty albums if desired
    const validAlbums = fetchedAlbums.filter(album => album.assetCount > 0);

    // Fetch cover setup for each album
    const albumsWithCovers = await Promise.all(
      validAlbums.map(async (album) => {
        const assets = await MediaLibrary.getAssetsAsync({
          album: album.id,
          first: 1,
          mediaType: ['photo', 'video'],
          sortBy: ['creationTime'],
        });

        return {
          ...album,
          coverUri: assets.assets[0]?.uri
        };
      })
    );

    setAlbums(albumsWithCovers);
    setModalView('albums');
  };

  const handleSelectAlbum = async (album: MediaLibrary.Album) => { // Make async
    setSourceType('album');
    setFolderName(album.title);
    setFileCount(album.assetCount);
    setSelectedAlbumId(album.id);

    setSourceMenuOpen(false);
    setModalView('main'); // Reset for next time

    // Reset selection mode to default behavior and invalidate session
    setSelectionMode('default');
    setManualSelection(null);
    try {
      await AsyncStorage.removeItem('deleteit_session');
      setResumeSession(null); // Clear local state immediately
    } catch (e) {
      console.error("Error clearing session", e);
    }
  };

  // Handle Folder Selection
  const handleSelectFolder = async () => {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        const uri = permissions.directoryUri;
        setSelectedFolderUri(uri); // Save URI for later use
        const decodedName = decodeURIComponent(uri.split('%3A').pop() || 'Carpeta');

        let files: string[] = [];
        try {
          files = await StorageAccessFramework.readDirectoryAsync(uri);
        } catch (e) {
          console.warn("Folder access failed (handled):", e);
          Alert.alert("Error", "No se puede acceder a esta carpeta. Por favor selecciona otra.");
          return;
        }

        // Filter for valid media files only
        const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.mp4', '.mov'];
        const mediaFiles = files.filter(fileUri => {
          const decodedUri = decodeURIComponent(fileUri).toLowerCase();
          return validExtensions.some(ext => decodedUri.endsWith(ext));
        });

        setSourceType('folder');
        setFolderName(decodedName);
        setFileCount(mediaFiles.length);

        // Set preview from first valid media file
        if (mediaFiles.length > 0) {
          // Sort by modification time to get the most recent one
          // We limit this concurrently to avoid freezing UI on large folders if needed, 
          // but for now Promise.all is synonymous with standard React Native bridge usage
          const filesWithInfo = await Promise.all(
            mediaFiles.map(async (fileUri) => {
              try {
                const info = await FileSystem.getInfoAsync(fileUri);
                return {
                  uri: fileUri,
                  // Use 0 if modificationTime is missing so it goes to the end
                  modificationTime: info.exists ? (info.modificationTime || 0) : 0
                };
              } catch {
                return { uri: fileUri, modificationTime: 0 };
              }
            })
          );

          // Sort descending (newest first)
          filesWithInfo.sort((a, b) => b.modificationTime - a.modificationTime);

          setFolderFilesCache(filesWithInfo); // Cache for manual selector
          setLatestAssetUri(filesWithInfo[0].uri);
        } else {
          setLatestAssetUri(null);
        }

        setSourceMenuOpen(false);

        // Reset selection mode to default behavior and invalidate session
        setSelectionMode('default');
        setManualSelection(null);
        try {
          await AsyncStorage.removeItem('deleteit_session');
          setResumeSession(null);
        } catch (e) {
          console.error("Error clearing session", e);
        }
      }
    } catch (error) {
      console.log('Error selecting folder:', error);
    }
  };

  // Render Modal Content
  const renderModalContent = () => {
    if (modalView === 'albums') {
      return (
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>{t.source.selectAlbum}</Text>

          <FlatList
            data={albums}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
            style={{ flex: 1, marginBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumItem}
                onPress={() => handleSelectAlbum(item)}
              >
                {item.coverUri ? (
                  <Image
                    source={{ uri: item.coverUri }}
                    style={styles.albumIcon}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumIcon}>
                    <Ionicons name="images" size={24} color="#fff" />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.albumTitle}>{item.title}</Text>
                  <Text style={styles.albumCount}>{item.assetCount} {t.stats.photos}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          />

          <Pressable
            onPress={() => setModalView('main')}
            style={styles.bottomBackButton}
            android_ripple={{ color: colors.separator, borderless: true, radius: 60 }}
          >
            <Ionicons name="arrow-back-circle-outline" size={42} color={colors.textSecondary} />
            <Text style={styles.bottomBackText}>{t.source.back}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.modalTitle}>{t.source.chooseSource}</Text>
          <Text style={styles.modalSubtitle}>{t.source.chooseSourceDesc}</Text>

          <View style={styles.sourceGrid}>
            {/* Option 1: Gallery (Albums) */}
            <TouchableOpacity
              style={styles.sourceCard}
              activeOpacity={0.8}
              onPress={handleOpenAlbums}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#c026d3' }]}>
                <Ionicons name="images" size={32} color="#fff" />
              </View>
              <Text style={styles.sourceLabel}>{t.source.gallery}</Text>
              <Text style={styles.sourceDesc}>{t.source.yourAlbums}</Text>
            </TouchableOpacity>

            {/* Option 2: File Explorer */}
            <TouchableOpacity
              style={styles.sourceCard}
              activeOpacity={0.8}
              onPress={handleSelectFolder}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#2563eb' }]}>
                <Ionicons name="folder-open" size={32} color="#fff" />
              </View>
              <Text style={styles.sourceLabel}>{t.source.files}</Text>
              <Text style={styles.sourceDesc}>{t.source.exploreFolders}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Cancel Button */}
        <Pressable
          onPress={() => setSourceMenuOpen(false)}
          style={styles.bottomBackButton}
          android_ripple={{ color: colors.separator, borderless: true, radius: 60 }}
        >
          <Ionicons name="close-circle-outline" size={42} color={colors.textSecondary} />
          <Text style={styles.bottomBackText}>{t.source.cancel}</Text>
        </Pressable>
      </View>
    );
  };

  // Render Start Selection Modal Content
  const renderStartSelectionContent = () => {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.modalTitle}>{t.source.howToStart}</Text>
        <Text style={styles.modalSubtitle}>{t.source.startPoint}</Text>

        <View style={styles.startOptionsContainer}>
          {/* Option 1: Resume Session */}
          <TouchableOpacity
            style={[styles.startOptionRow, !resumeSession && { opacity: 0.5 }]}
            disabled={!resumeSession}
            onPress={() => {
              if (resumeSession) {
                setSelectionMode('resume');
                setManualSelection(null);
                setStartMenuOpen(false);
              }
            }}
          >
            <View style={[styles.iconCircleSmall, { backgroundColor: !resumeSession ? '#6b7280' : '#22c55e' }]}>
              <Ionicons name="reload" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.startOptionTitle}>{t.source.resume}</Text>
              <Text style={styles.startOptionDesc}>
                {resumeSession ? t.source.resumeDesc : t.source.noResume}
              </Text>
            </View>
            {resumeSession && <Ionicons name="chevron-forward" size={20} color="#6b7280" />}
          </TouchableOpacity>

          {/* Option 2: Default (Recent) */}
          <TouchableOpacity
            style={styles.startOptionRow}
            onPress={() => {
              // Reset to default behavior (latest item)
              setManualSelection(null);
              setSelectionMode('default');
              setStartMenuOpen(false);
            }}
          >
            <View style={[styles.iconCircleSmall, { backgroundColor: '#a855f7' }]}>
              <Ionicons name="flash" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.startOptionTitle}>{t.source.mostRecent}</Text>
              <Text style={styles.startOptionDesc}>{t.source.recentDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Option 3: Manual Selection (Grid) */}
          <TouchableOpacity
            style={styles.startOptionRow}
            onPress={() => {
              setStartMenuOpen(false);
              setMediaSelectVisible(true);
            }}
          >
            <View style={[styles.iconCircleSmall, { backgroundColor: '#f97316' }]}>
              <Ionicons name="grid" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.startOptionTitle}>{t.source.manual}</Text>
              <Text style={styles.startOptionDesc}>{t.source.manualDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Bottom Cancel Button */}
        <Pressable
          onPress={() => setStartMenuOpen(false)}
          style={styles.bottomBackButton}
          android_ripple={{ color: colors.separator, borderless: true, radius: 60 }}
        >
          <Ionicons name="close-circle-outline" size={42} color={colors.textSecondary} />
          <Text style={styles.bottomBackText}>{t.source.cancel}</Text>
        </Pressable>
      </View>
    );
  };

  if (isLoading || !isLoaded) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none' }}>
          {/* Header */}
          <View style={styles.header} ref={headerRef} collapsable={false}>
            <View>
              <Text style={styles.greeting}>{t.welcome}</Text>
              <Text style={styles.mainTitle}>{t.startNow}</Text>
            </View>
            {/*
            <TouchableOpacity style={styles.donateButton}>
              <Text style={styles.donateText}>Donar</Text>
              <Ionicons name="cafe" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            */}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {/* Total Freed Card */}
            <View style={styles.statCard} ref={totalCardRef} collapsable={false}>
              <Text style={styles.statLabel}>{t.stats.cleared}</Text>
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{formatBytes(stats.totalFreedBytes)}</Text>
              </View>
            </View>

            {/* Streak Card */}
            <View style={styles.statCard} ref={streakCardRef} collapsable={false}>
              <View style={styles.streakHeader}>
                <Text style={styles.statLabel}>{t.stats.streak}</Text>
                <Ionicons name="flame" size={28} color="#f97316" />
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{stats.streakDays}</Text>
                <Text style={styles.statUnit}>{t.stats.days}</Text>
              </View>
            </View>
          </View>

          {/* Configuration Section */}
          <View style={styles.configContainer}>
            <Text style={styles.sectionTitle}>{t.config.title}</Text>

            <View style={styles.configCard}>
              {/* Cleaning Source */}
              <View ref={actionCardRef} collapsable={false}>
                <ScaleButton
                  style={styles.configItem}
                  onPress={() => {
                    setModalView('main'); // Ensure main view on open
                    setSourceMenuOpen(true);
                  }}
                >
                  <View style={styles.configHeader}>
                    {/* Dynamic Icon */}
                    <Ionicons
                      name={sourceType === 'folder' ? "folder-open" : "images"}
                      size={20} color={colors.icon} style={{ marginRight: 8 }}
                    />
                    <Text style={styles.configLabel}>{t.source.title}</Text>
                  </View>
                  <View style={styles.configContent}>
                    <View>
                      <Text style={styles.configValue}>{folderName}</Text>
                      <Text style={styles.configSub}>
                        {`(${fileCount.toLocaleString()} ${sourceType === 'folder' ? t.config.items : t.config.photos})`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                  </View>
                </ScaleButton>
              </View>

              <View style={styles.divider} />

              {/* Start Point */}
              {/* Start Point */}
              <View collapsable={false} style={{ width: '100%', marginBottom: 20 }}>
                <ScaleButton
                  style={styles.configItem}
                  onPress={() => setStartMenuOpen(true)}
                >
                  <View style={styles.configHeader}>
                    <Ionicons name="time" size={20} color={colors.icon} style={{ marginRight: 8 }} />
                    <Text style={styles.configLabel}>{t.source.startFrom}</Text>
                  </View>

                  <View style={styles.configContentTarget}>
                    {manualSelection?.startAsset ? (
                      <Image
                        source={{ uri: manualSelection.startAsset.uri }}
                        style={styles.previewBox}
                        resizeMode="cover"
                      />
                    ) : latestAssetUri ? (
                      <Image
                        source={{ uri: latestAssetUri }}
                        style={styles.previewBox}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.previewBox} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.configValue}>
                        {selectionMode === 'manual'
                          ? (manualSelection?.endAsset ? t.config.customRange : t.config.startPoint)
                          : (selectionMode === 'resume' ? t.source.resume : (sourceType === 'folder' ? t.config.latestItem : t.config.latestPhoto))
                        }
                      </Text>
                      <Text style={styles.configSub}>
                        {selectionMode === 'manual'
                          ? (manualSelection?.endAsset ? t.config.selectedGroup : t.config.fromSelected)
                          : (selectionMode === 'resume' ? t.config.fromResume : t.config.default)
                        }
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                  </View>
                </ScaleButton>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flex: 1, display: activeTab === 'settings' ? 'flex' : 'none' }}>
          <SettingsScreen language={language} onLanguageChange={changeLanguage} />
        </View>
      </View >

      {/* Footer Navigation */}
      <View style={styles.footer} ref={tabRef} collapsable={false}>
        <TabItem
          label={t.tabs.home}
          iconName="home"
          isActive={activeTab === 'home'}
          onPress={() => setActiveTab('home')}
          colors={colors}
          styles={styles}
        />

        <View style={styles.playButtonContainer}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.accent, borderColor: colors.background }]}
            onPress={() => {
              // Robustly calculate date range with buffer to ensure inclusivity
              let minDateParam = undefined;
              let maxDateParam = undefined;

              if (selectionMode === 'manual' && manualSelection?.startAsset?.creationTime && manualSelection?.endAsset?.creationTime) {
                const t1 = manualSelection.startAsset.creationTime;
                const t2 = manualSelection.endAsset.creationTime;
                // Add 1s buffer because createdAfter/Before are exclusive
                minDateParam = Math.min(t1, t2) - 1000;
                maxDateParam = Math.max(t1, t2) + 1000;
              }

              router.push({
                pathname: '/swipe',
                params: {
                  sourceType,
                  sourceId: sourceType === 'album' ? selectedAlbumId : selectedFolderUri,
                  selectionMode,
                  startAssetId: selectionMode === 'resume' ? resumeSession?.startAssetId : manualSelection?.startAsset?.id,
                  endAssetId: manualSelection?.endAsset?.id,
                  title: sourceType === 'album' ? (folderName || 'Galería') : folderName,
                  minDate: minDateParam,
                  maxDate: maxDateParam,
                }
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={[styles.startText, { color: colors.text }]}>{t.source.start}</Text>
        </View>

        <TabItem
          label={t.tabs.settings}
          iconName="settings-outline"
          isActive={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
          colors={colors}
          styles={styles}
        />
      </View >

      {/* Source Selection Menu (Absolute Overlay) */}
      <Animated.View
        pointerEvents={isSourceMenuOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { zIndex: 2000, backgroundColor: colors.overlay, opacity: isSourceMenuOpen ? 1 : 0 }]}
      >
        {isSourceMenuOpen && (
          <BlurView intensity={20} tint={colors.blurTint as any} style={StyleSheet.absoluteFill}>
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {renderModalContent()}
              </View>
            </SafeAreaView>
          </BlurView>
        )}
      </Animated.View>

      {/* Start Selection Menu (Absolute Overlay) */}
      <Animated.View
        pointerEvents={isStartMenuOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { zIndex: 2000, backgroundColor: colors.overlay, opacity: isStartMenuOpen ? 1 : 0 }]}
      >
        {isStartMenuOpen && (
          <BlurView intensity={20} tint={colors.blurTint as any} style={StyleSheet.absoluteFill}>
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {renderStartSelectionContent()}
              </View>
            </SafeAreaView>
          </BlurView>
        )}
      </Animated.View>

      {/* Media Selector Modal */}
      <MediaSelectModal
        isVisible={isMediaSelectVisible}
        onClose={() => setMediaSelectVisible(false)}
        sourceType={sourceType === 'folder' ? 'folder' : 'album'}
        sourceIdOrFiles={sourceType === 'album' ? (selectedAlbumId || '') : folderFilesCache}
        onConfirm={(selection) => {
          setManualSelection(selection);
          setSelectionMode('manual');
          setMediaSelectVisible(false);
        }}
      />

      <TutorialOverlay
        isVisible={isTutorialVisible}
        steps={tutorialSteps}
        currentStepIndex={currentStep}
        onNext={handleNextStep}
        onSkip={handleSkip}
      />

    </SafeAreaView >
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    maxWidth: 200,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  donateText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    height: 100,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statUnit: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  configContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 12,
  },
  configCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  configItem: {
    marginBottom: 16,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  configLabel: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  configContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
  },
  configContentTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  previewBox: {
    width: 60,
    height: 60,
    backgroundColor: colors.statCard,
    borderRadius: 12,
  },
  configValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  configSub: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 50, // Increased from 30
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    height: 120, // Increased from 100
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  navItem: {
    alignItems: 'center',
    marginBottom: 8,
    width: 60,
    height: 50,
    justifyContent: 'flex-end',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  playButtonContainer: {
    alignItems: 'center',
    bottom: 20,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 8,
    borderWidth: 4,
  },
  startText: {
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingRight: 12,
    paddingLeft: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalBackText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  sourceGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  sourceCard: {
    width: '45%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sourceLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  bottomBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 40,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  albumIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.statCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  albumTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  albumCount: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  bottomBackText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  startOptionsContainer: {
    gap: 16,
    width: '100%',
  },
  startOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  startOptionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  startOptionDesc: {
    color: colors.textSecondary,
    fontSize: 12,
  }
});
