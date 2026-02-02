export type Language = 'es' | 'en';

export const translations = {
    es: {
        settings: {
            title: 'Ajustes',
            appearance: 'APARIENCIA',
            automatic: 'Automático',
            light: 'Claro',
            dark: 'Oscuro',
            language: 'IDIOMA',
            spanish: 'Español',
            english: 'English',
            security: 'SEGURIDAD',
            immediateDeletion: 'Eliminación Inmediata',
            immediateDeletionSubOn: 'Borrar al deslizar',
            immediateDeletionSubOff: 'Confirmar al final',
            moveToTrash: 'Mover a Papelera',
            moveToTrashSubOn: 'Se guardan 30 días en la papelera',
            moveToTrashSubOff: 'Se eliminan permanentemente',
            hideFavorites: 'Ocultar Favoritos',
            sensations: 'SENSACIONES',
            vibration: 'Vibración',
            sounds: 'Sonido',
            others: 'OTROS',
            viewTutorial: 'Ver Tutorial',
            viewIntro: 'Ver Intro',
            privacyPolicy: 'Política de Privacidad',
            appInfo: 'INFORMACIÓN',
            version: 'Versión',

            tutorial: {
                header: 'Aquí verás un resumen de tu actividad.',
                total: 'Espacio total que has recuperado.',
                streak: '¡No pierdas tu racha de limpieza!',
                actions: 'Elige qué quieres limpiar: Cámara, Álbumes o Carpetas.',
                tab: 'Personaliza la app a tu gusto.',
            }
        },
        onboarding: {
            skip: 'Saltar',
            next: 'Siguiente',
            finish: 'Comenzar',
            continue: 'Continuar',
            goToSettings: 'Ir a Ajustes',
            permissionTitle: 'Permite el Acceso',
            permissionDesc: 'Necesitaremos acceso a tu galería',
            slides: [
                {
                    title: '¡Te damos la bienvenida!',
                    description: 'La forma más rápida y divertida de organizar tu galería. ¡Desliza y listo!',
                },
                {
                    title: 'Toma el Control',
                    description: 'Tú decides si quieres borrar al instante o confirmar al finalizar.',
                },
                {
                    title: '100% Privado',
                    description: 'Tus fotos nunca salen de tu dispositivo. Todo es local y seguro.',
                }
            ]
        },
        main: {
            welcome: '¡Hola!',
            stats: {
                photos: 'Elementos',
                cleared: 'Espacio liberado',
                session: 'en esta sesión',
                streak: 'Racha',
                days: 'Días'
            },
            config: {
                title: 'Configuración de Limpieza',
                items: 'elementos',
                photos: 'elementos',
                customRange: 'Rango personalizado',
                startPoint: 'Punto de inicio',
                latestItem: 'Último elemento',
                latestPhoto: 'Último elemento',
                selectedGroup: 'Grupo seleccionado',
                fromSelected: 'Desde elemento elegido',
                fromResume: 'Donde lo dejaste',
                default: '(Por defecto)'
            },
            source: {
                title: 'Fuente',
                camera: 'Cámara',
                albums: 'Álbumes',
                folders: 'Carpetas',
                selectSource: '¿Qué quieres limpiar?',
                startFrom: 'Empezar desde...',
                resume: 'Seguir limpieza',
                mostRecent: 'Lo más reciente',
                manual: 'Selección manual',
                gallery: 'Galería',
                files: 'Archivos',
                selectAlbum: 'Elige un Álbum',
                chooseSource: '¿Qué quieres organizar hoy?',
                chooseSourceDesc: 'Selecciona qué quieres limpiar',
                exploreFolders: 'Explora tus carpetas',
                yourAlbums: 'Tus álbumes de fotos',
                howToStart: '¿Cómo quieres empezar?',
                startPoint: 'Elige el punto de partida',
                resumeDesc: 'Continúa donde te quedaste',
                noResume: 'No hay sesión previa',
                recentDesc: 'Desde la última foto (Recomendado)',
                manualDesc: 'Elige un rango de elementos específico',
                cancel: 'Cancelar',
                back: 'Atrás',
                start: 'Empezar'
            },
            tabs: {
                home: 'Inicio',
                settings: 'Ajustes'
            },
            startNow: 'A limpiar se ha dicho!'
        },
        swipe: {
            cleaning: 'Limpiando',
            keep: 'Conservar',
            delete: 'Eliminar',
            undo: 'Deshacer',
            finish: 'Finalizar',
            progress: '{current} de {total} elementos',
            completion: '¡Limpieza completada!',
            backToMenu: 'Volver al Inicio',
            loading: 'Cargando...',
            noPhotos: 'No se encontraron fotos',
            searching: 'Buscando fotos de tu carrete...',
            deletePermanentTitle: 'Borrar archivo',
            deletePermanentDesc: '¿Estás seguro de eliminar este archivo permanentemente?',
            batchTitle: 'Finalizar limpieza',
            batchDesc: '¿Deseas eliminar {count} elementos seleccionados?',
            batchError: 'Ocurrió un error al eliminar algunos elementos.',
            exitTitle: 'Finalizar Limpieza',
            exitDesc: 'Tienes {count} eliminaciones pendientes. ¿Qué deseas hacer?',
            deleteAndExit: 'Borrar y Salir',
            discardAndExit: 'Descartar y Salir',
            continueSwiping: 'Seguir Deslizando'
        },
        mediaSelect: {
            title: 'Seleccionar Rango',
            rangeSelected: 'Rango seleccionado',
            tapEnd: 'Toca el elemento final',
            tapFirst: 'Toca el primer elemento',
            items: 'elementos',
            item: 'elemento',
            nothingSelected: 'Nada seleccionado',
            confirm: 'Confirmar selección'
        }
    },
    en: {
        settings: {
            title: 'Settings',
            appearance: 'APPEARANCE',
            automatic: 'Automatic',
            light: 'Light',
            dark: 'Dark',
            language: 'LANGUAGE',
            spanish: 'Spanish',
            english: 'English',
            security: 'SECURITY',
            immediateDeletion: 'Immediate Deletion',
            immediateDeletionSubOn: 'Delete on swipe',
            immediateDeletionSubOff: 'Confirm at end',
            moveToTrash: 'Move to Trash',
            moveToTrashSubOn: 'Items stay 30 days in trash',
            moveToTrashSubOff: 'Items are deleted permanently',
            hideFavorites: 'Hide Favorites',
            sensations: 'SENSATIONS',
            vibration: 'Vibration',
            sounds: 'Sounds',
            others: 'OTHERS',
            viewTutorial: 'Watch Tutorial',
            viewIntro: 'Watch Intro',
            privacyPolicy: 'Privacy Policy',
            appInfo: 'INFORMATION',
            version: 'Version',

            tutorial: {
                header: 'Here is a summary of your activity.',
                total: 'Total space you have recovered.',
                streak: 'Do not lose your cleaning streak!',
                actions: 'Choose what to clean: Camera, Albums, or Folders.',
                tab: 'Personalize the app to your liking.',
            }
        },
        onboarding: {
            skip: 'Skip',
            next: 'Next',
            finish: 'Start',
            continue: 'Continue',
            goToSettings: 'Go to Settings',
            permissionTitle: 'Allow Access',
            permissionDesc: 'We will need access to your gallery',
            slides: [
                {
                    title: 'Welcome!',
                    description: 'The fastest and most fun way to organize your gallery. Swipe and go!',
                },
                {
                    title: 'Take Control',
                    description: 'You decide if you want to keep or delete to free up space.',
                },
                {
                    title: '100% Private',
                    description: 'Everything is local and secure. No Ads. Your photos never leave your device. ',
                }
            ]
        },
        main: {
            welcome: 'Hello!',
            stats: {
                photos: 'Items',
                cleared: 'Space freed',
                session: 'this session',
                streak: 'Streak',
                days: 'Days'
            },
            config: {
                title: 'Cleaning Setup',
                items: 'items',
                photos: 'items',
                customRange: 'Custom range',
                startPoint: 'Starting point',
                latestItem: 'Latest item',
                latestPhoto: 'Latest item',
                selectedGroup: 'Selected group',
                fromSelected: 'From chosen item',
                fromResume: 'Where you left off',
                default: '(Default)'
            },
            source: {
                title: 'Source',
                camera: 'Camera',
                albums: 'Albums',
                folders: 'Folders',
                selectSource: 'What to clean?',
                startFrom: 'Start from...',
                resume: 'Resume session',
                mostRecent: 'Most recent',
                manual: 'Manual selection',
                gallery: 'Gallery',
                files: 'Files',
                selectAlbum: 'Choose an Album',
                chooseSource: 'What do you want to organize today?',
                chooseSourceDesc: 'Select what you want to clean',
                exploreFolders: 'Explore your folders',
                yourAlbums: 'Your photo albums',
                howToStart: 'How do you want to start?',
                startPoint: 'Choose your starting point',
                resumeDesc: 'Continue where you left off',
                noResume: 'No previous session',
                recentDesc: 'From the latest item (Recommended)',
                manualDesc: 'Choose a specific range of items',
                cancel: 'Cancel',
                back: 'Back',
                start: 'Start'
            },
            tabs: {
                home: 'Home',
                settings: 'Settings'
            },
            startNow: 'Start Cleaning'
        },
        swipe: {
            cleaning: 'Cleaning',
            keep: 'Keep',
            delete: 'Delete',
            undo: 'Undo',
            finish: 'Finish',
            progress: '{current} of {total} items',
            completion: 'Cleanup completed!',
            backToMenu: 'Back to Start',
            loading: 'Loading...',
            noPhotos: 'No photos found',
            searching: 'Fetching photos from your gallery...',
            deletePermanentTitle: 'Delete file',
            deletePermanentDesc: 'Are you sure you want to delete this file permanently?',
            batchTitle: 'Finish cleanup',
            batchDesc: 'Do you want to delete {count} selected items?',
            batchError: 'An error occurred while deleting some items.',
            exitTitle: 'Finish Cleanup',
            exitDesc: 'You have {count} pending deletions. What do you want to do?',
            deleteAndExit: 'Delete & Exit',
            discardAndExit: 'Discard & Exit',
            continueSwiping: 'Continue Swiping'
        },
        mediaSelect: {
            title: 'Select Range',
            rangeSelected: 'Range selected',
            tapEnd: 'Tap the last item',
            tapFirst: 'Tap the first item',
            items: 'items',
            item: 'item',
            nothingSelected: 'Nothing selected',
            confirm: 'Confirm selection'
        }
    }
};

export type Translations = typeof translations.es;
