import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import Pdf from 'react-native-pdf';
import { useCompetition } from '../store/CompetitionContext';
import { PasswordModal } from '../components/PasswordModal';
import { RootStackParamList } from '../navigation';

type ViewerRoute = RouteProp<RootStackParamList, 'Viewer'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Viewer'>;

export function ViewerScreen() {
  const route = useRoute<ViewerRoute>();
  const navigation = useNavigation<Nav>();
  const { sets, passwords, setSetPassword, setPasswordForRemaining } = useCompetition();

  const [currentIndex, setCurrentIndex] = useState(route.params.initialIndex);
  const [pageCount, setPageCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const currentSet = sets[currentIndex];
  const currentPassword = currentSet ? (passwords[currentSet.name] ?? '') : '';

  // When set changes, reset state and show password prompt if no password stored yet
  useEffect(() => {
    setPageCount(0);
    setPasswordError(false);
    // Auto-prompt if set has a PDF but no password saved yet
    if (currentSet?.pdfPath && !passwords[currentSet.name]) {
      setShowPasswordModal(true);
    } else {
      setShowPasswordModal(false);
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= sets.length) return;
      setCurrentIndex(index);
    },
    [sets.length],
  );

  const goToPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goToNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  useEffect(() => {
    navigation.setOptions({
      title: currentSet ? `${currentIndex + 1} / ${sets.length}` : 'Viewer',
    });
  }, [currentIndex, sets.length, currentSet, navigation]);

  const handleSwipe = useCallback(
    ({ nativeEvent }: { nativeEvent: { state: number; translationX: number; velocityX: number } }) => {
      if (nativeEvent.state !== State.END) return;
      const { translationX, velocityX } = nativeEvent;
      if (translationX < -60 && velocityX < -200) goToNext();
      else if (translationX > 60 && velocityX > 200) goToPrev();
    },
    [goToNext, goToPrev],
  );

  const handlePdfError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    const isPasswordErr =
      msg.toLowerCase().includes('password') ||
      msg.toLowerCase().includes('encrypted') ||
      msg.toLowerCase().includes('security');
    if (isPasswordErr) {
      setPasswordError(true);
      setShowPasswordModal(true);
    }
  }, []);

  const handleSavePassword = useCallback(
    (password: string) => {
      if (!currentSet) return;
      setSetPassword(currentSet.name, password);
      setPasswordError(false);
      setShowPasswordModal(false);
    },
    [currentSet, setSetPassword],
  );

  const handleSaveForAll = useCallback(
    (password: string) => {
      if (!currentSet) return;
      // Save for current set explicitly, then fill remaining
      setSetPassword(currentSet.name, password);
      setPasswordForRemaining(password);
      setPasswordError(false);
      setShowPasswordModal(false);
    },
    [currentSet, setSetPassword, setPasswordForRemaining],
  );

  if (!currentSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No sets available</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Set name bar */}
      <View style={styles.infoBar}>
        <Text style={styles.setName} numberOfLines={1} adjustsFontSizeToFit>
          {currentSet.name}
        </Text>
        {pageCount > 0 && (
          <Text style={styles.pageCount}>{pageCount}p</Text>
        )}
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => { setPasswordError(false); setShowPasswordModal(true); }}
        >
          <Text style={styles.lockIcon}>{currentPassword ? '🔑' : '🔒'}</Text>
        </TouchableOpacity>
      </View>

      {/* PDF area */}
      <PanGestureHandler
        onHandlerStateChange={handleSwipe}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-25, 25]}
      >
        <View style={styles.pdfContainer}>
          {currentSet.pdfPath ? (
            <Pdf
              // Key forces remount when password changes so the PDF reloads
              key={`${currentSet.name}::${currentPassword}`}
              source={{ uri: currentSet.pdfPath, cache: false }}
              password={currentPassword}
              style={styles.pdf}
              onLoadComplete={n => { setPageCount(n); setPasswordError(false); }}
              onError={handlePdfError}
              enablePaging={false}
              horizontal={false}
            />
          ) : (
            <View style={styles.center}>
              <Text style={styles.errorText}>No PDF loaded for this set</Text>
              <Text style={styles.errorHint}>Load a ZIP file from the home screen</Text>
            </View>
          )}

          {/* Side tap zones for navigation */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navZone, styles.navZoneLeft]}
              onPress={goToPrev}
              activeOpacity={0.2}
            >
              <View style={styles.navArrowBox}>
                <Text style={styles.navArrow}>‹</Text>
              </View>
            </TouchableOpacity>
          )}
          {currentIndex < sets.length - 1 && (
            <TouchableOpacity
              style={[styles.navZone, styles.navZoneRight]}
              onPress={goToNext}
              activeOpacity={0.2}
            >
              <View style={styles.navArrowBox}>
                <Text style={styles.navArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </PanGestureHandler>

      {/* Bottom nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={goToPrev}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
            ← Prev
          </Text>
        </TouchableOpacity>

        <Text style={styles.counter}>{currentIndex + 1} / {sets.length}</Text>

        <TouchableOpacity
          style={[styles.navBtn, currentIndex === sets.length - 1 && styles.navBtnDisabled]}
          onPress={goToNext}
          disabled={currentIndex === sets.length - 1}
        >
          <Text style={[styles.navBtnText, currentIndex === sets.length - 1 && styles.navBtnTextDisabled]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>

      <PasswordModal
        visible={showPasswordModal}
        setName={currentSet.name}
        current={currentPassword}
        showError={passwordError}
        onSave={handleSavePassword}
        onSaveForAll={handleSaveForAll}
        onClose={() => setShowPasswordModal(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003087',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  setName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  pageCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  lockBtn: { padding: 4 },
  lockIcon: { fontSize: 16 },
  pdfContainer: { flex: 1, position: 'relative' },
  pdf: { flex: 1, width: '100%', backgroundColor: '#1a1a1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  errorHint: { color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  navZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '18%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navZoneLeft: { left: 0 },
  navZoneRight: { right: 0 },
  navArrowBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 28, lineHeight: 32 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#003087',
    borderRadius: 8,
  },
  navBtnDisabled: { backgroundColor: '#333' },
  navBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  navBtnTextDisabled: { color: '#555' },
  counter: { color: '#ccc', fontSize: 14 },
});
