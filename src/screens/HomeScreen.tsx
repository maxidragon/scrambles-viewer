import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompetition } from '../store/CompetitionContext';
import { pickAndExtractZip, clearPdfs } from '../utils/zipHandler';
import { fetchWCIF } from '../api/wca';
import { ScrambleSet } from '../types/wcif';
import { getVenueTimezone, formatTime } from '../utils/schedule';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {
    competitionId,
    competitionName,
    wcif,
    sets,
    passwords,
    loading,
    reset,
    syncWCIF,
    updateSets,
  } = useCompetition();

  const [syncing, setSyncing] = useState(false);
  const [loadingZip, setLoadingZip] = useState(false);

  const timezone = wcif ? getVenueTimezone(wcif) : 'UTC';

  const handleSync = useCallback(async () => {
    if (!competitionId) return;
    setSyncing(true);
    try {
      const newWcif = await fetchWCIF(competitionId);
      await syncWCIF(newWcif);
    } catch {
      Alert.alert('Sync failed', 'Could not fetch updated schedule. Check your connection.');
    } finally {
      setSyncing(false);
    }
  }, [competitionId, syncWCIF]);

  const handleReset = useCallback(() => {
    Alert.alert('Reset Competition', 'This will clear all competition data and extracted PDFs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await clearPdfs();
          await reset();
        },
      },
    ]);
  }, [reset]);

  const handleLoadZip = useCallback(async () => {
    if (sets.length === 0) {
      Alert.alert('No schedule', 'Select a competition first to load its scramble ZIP.');
      return;
    }
    setLoadingZip(true);
    try {
      const { sets: updatedSets, matched, total } = await pickAndExtractZip(sets);
      updateSets(updatedSets);
      Alert.alert('ZIP loaded', `Matched ${matched} of ${total} PDFs to the schedule.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', `Failed to process ZIP: ${msg}`);
    } finally {
      setLoadingZip(false);
    }
  }, [sets, updateSets]);

  const handleClearZip = useCallback(() => {
    Alert.alert('Clear PDFs', 'Remove all extracted PDF files?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearPdfs();
          const cleared = sets.map(s => {
            const { pdfPath: _, ...rest } = s;
            return rest as ScrambleSet;
          });
          updateSets(cleared);
        },
      },
    ]);
  }, [sets, updateSets]);

  const openViewer = useCallback(
    (index: number) => {
      navigation.navigate('Viewer', { initialIndex: index });
    },
    [navigation],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#003087" />
      </View>
    );
  }

  // Group sets by activityCode for section display
  interface Section {
    title: string;
    time: string;
    data: (ScrambleSet & { globalIndex: number })[];
  }

  const sections: Section[] = [];
  if (sets.length > 0) {
    let currentCode = '';
    let currentSection: Section | null = null;

    sets.forEach((set, idx) => {
      if (set.activityCode !== currentCode) {
        currentCode = set.activityCode;
        const roundName = set.name.replace(/ Set [A-Z]$/, '');
        currentSection = {
          title: roundName,
          time: formatTime(set.startTime, timezone),
          data: [],
        };
        sections.push(currentSection);
      }
      currentSection!.data.push({ ...set, globalIndex: idx });
    });
  }

  const loadedCount = sets.filter(s => s.pdfPath).length;

  return (
    <View style={styles.container}>
      {/* Competition header */}
      <View style={styles.header}>
        {competitionName ? (
          <>
            <Text style={styles.compName}>{competitionName}</Text>
            <Text style={styles.compId}>{competitionId}</Text>
          </>
        ) : (
          <Text style={styles.noComp}>No competition selected</Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.btnText}>Search</Text>
        </TouchableOpacity>

        {competitionId && (
          <>
            <TouchableOpacity
              style={[styles.btn, syncing && styles.btnDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Sync</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={handleReset}
            >
              <Text style={styles.btnText}>Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {competitionId && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, loadingZip && styles.btnDisabled]}
            onPress={handleLoadZip}
            disabled={loadingZip}
          >
            {loadingZip ? (
              <ActivityIndicator color="#003087" size="small" />
            ) : (
              <Text style={styles.btnTextSecondary}>Load ZIP</Text>
            )}
          </TouchableOpacity>

          {loadedCount > 0 && (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleClearZip}
            >
              <Text style={styles.btnTextSecondary}>Clear PDFs</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* PDF status bar */}
      {sets.length > 0 && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {loadedCount}/{sets.length} PDFs loaded
          </Text>
          {loadedCount > 0 && (
            <TouchableOpacity onPress={() => openViewer(0)}>
              <Text style={styles.viewAllLink}>View first →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Set list */}
      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={item => item.name}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionTime}>{section.time}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.setRow}
              onPress={() => openViewer(item.globalIndex)}
            >
              <View style={[styles.dot, item.pdfPath ? styles.dotLoaded : styles.dotEmpty]} />
              <Text style={styles.setName}>{item.name}</Text>
              {item.pdfPath ? (
                <View style={styles.rowRight}>
                  <Text style={styles.lockIndicator}>
                    {passwords[item.name] ? '🔑' : '🔒'}
                  </Text>
                  <Text style={styles.viewHint}>View →</Text>
                </View>
              ) : (
                <Text style={styles.noFile}>No PDF</Text>
              )}
            </TouchableOpacity>
          )}
          stickySectionHeadersEnabled
        />
      ) : (
        <View style={styles.emptyState}>
          {competitionId ? (
            <Text style={styles.emptyText}>
              No schedule data yet.{'\n'}Try syncing the WCIF.
            </Text>
          ) : (
            <Text style={styles.emptyText}>
              Search for a WCA competition to get started.
            </Text>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  compName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  compId: { fontSize: 12, color: '#888' },
  noComp: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  actions: { flexDirection: 'row', padding: 10, gap: 8, flexWrap: 'wrap' },
  btn: {
    backgroundColor: '#003087',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDanger: { backgroundColor: '#c62828' },
  btnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#003087',
  },
  btnTextSecondary: { color: '#003087', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e8f0fe',
    borderBottomWidth: 1,
    borderBottomColor: '#c5cae9',
  },
  statusText: { fontSize: 13, color: '#3949ab', fontWeight: '500' },
  viewAllLink: { fontSize: 13, color: '#003087', fontWeight: '600' },
  listContent: { paddingBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#c5cae9',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a237e' },
  sectionTime: { fontSize: 12, color: '#5c6bc0' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  dotLoaded: { backgroundColor: '#4caf50' },
  dotEmpty: { backgroundColor: '#ccc' },
  setName: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockIndicator: { fontSize: 13 },
  viewHint: { fontSize: 13, color: '#003087', fontWeight: '500' },
  noFile: { fontSize: 12, color: '#bbb' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 22 },
});
