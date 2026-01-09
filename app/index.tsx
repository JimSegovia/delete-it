import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.mainTitle}>¡A limpiar se ha dicho</Text>
        </View>
        <TouchableOpacity style={styles.donateButton}>
          <Text style={styles.donateText}>Donate</Text>
          <Ionicons name="cafe" size={16} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {/* Total Freed Card */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <View style={styles.statRow}>
            <Text style={styles.statValue}>1.2 GB</Text>
            <Text style={styles.statUnit}>Liberados</Text>
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.statCard}>
          <View style={styles.streakHeader}>
            <Text style={styles.statLabel}>Racha</Text>
            <Ionicons name="flame" size={28} color="#f97316" />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statValue}>30</Text>
            <Text style={styles.statUnit}>Dias</Text>
          </View>
        </View>
      </View>

      {/* Configuration Section */}
      <View style={styles.configContainer}>
        <Text style={styles.sectionTitle}>Configuración de Limpieza</Text>

        <View style={styles.configCard}>
          {/* Cleaning Source */}
          <TouchableOpacity style={styles.configItem}>
            <View style={styles.configHeader}>
              <Ionicons name="folder-open" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
              <Text style={styles.configLabel}>Limpiar de:</Text>
            </View>
            <View style={styles.configContent}>
              <View>
                <Text style={styles.configValue}>Cámara</Text>
                <Text style={styles.configSub}>{"(1,205 fotos)"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Start Point */}
          <TouchableOpacity style={styles.configItem}>
            <View style={styles.configHeader}>
              <Ionicons name="images" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
              <Text style={styles.configLabel}>Iniciar desde:</Text>
            </View>

            <View style={styles.configContentTarget}>
              <View style={styles.previewBox} />
              <View style={{ flex: 1 }}>
                <Text style={styles.configValue}>Ultima foto</Text>
                <Text style={styles.configSub}>{"(por defecto)"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>

          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#a855f7" />
          <Text style={[styles.navText, { color: '#a855f7' }]}>Home</Text>
        </TouchableOpacity>

        <View style={styles.playButtonContainer}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => router.push('/swipe')}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={styles.startText}>Start</Text>
        </View>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings-outline" size={24} color="#6b7280" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#110F18',
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
    color: '#9ca3af',
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    maxWidth: 200,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c026d3', // Purple/Pink
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
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C2E',
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
    color: '#9ca3af',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statUnit: {
    color: '#9ca3af',
    fontSize: 14,
  },
  configContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 12,
  },
  configCard: {
    backgroundColor: '#1C1C2E',
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
    color: '#9ca3af',
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
    backgroundColor: '#d1d5db',
    borderRadius: 12,
  },
  configValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  configSub: {
    color: '#9ca3af',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D2D44',
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#16141F', // Slightly lighter than bg for differentiation
    height: 100,
  },
  navItem: {
    alignItems: 'center',
    marginBottom: 8,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#6b7280',
  },
  playButtonContainer: {
    alignItems: 'center',
    bottom: 20, // push it up
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#c026d3', // Pink/Purple gradient equivalent
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c026d3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 8,
    borderWidth: 4,
    borderColor: '#2e1065', // Dark border to match bg visual
  },
  startText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});
