import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Pdf from 'react-native-pdf';
import { useCompetition } from '../store/CompetitionContext';
import { PasswordModal } from '../components/PasswordModal';
import { RootStackParamList } from '../navigation';

type ViewerRoute = RouteProp<RootStackParamList, 'Viewer'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Viewer'>;

export function ViewerScreen() {
  const route = useRoute<ViewerRoute>();
  const navigation = useNavigation<Nav>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const { sets, passwords, setSetPassword, clearPasswords } = useCompetition();

  const [currentIndex, setCurrentIndex] = useState(route.params.initialIndex);
  const [pageCount, setPageCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // pdfKey increments to force a clean PDF remount after a password change.
  // pdfReady gates rendering so we never show the PDF with an empty password,
  // which avoids the false "incorrect password" error on first open.
  const [pdfKey, setPdfKey] = useState(0);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfScale, setPdfScale] = useState(1);
  const remountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const currentSet = sets[currentIndex];
  const currentPassword = currentSet ? (passwords[currentSet.name] ?? '') : '';

  const clearPasswordsRef = useRef(clearPasswords);
  clearPasswordsRef.current = clearPasswords;

  // Hide the React Navigation header in landscape (declarative — no setOptions churn)
  useEffect(() => {
    navigation.setOptions({ headerShown: !isLandscape });
  }, [isLandscape, navigation]);

  // Cleanup: clear in-memory passwords on unmount only
  useEffect(() => {
    return () => {
      if (remountTimer.current) clearTimeout(remountTimer.current);
      clearPasswordsRef.current();
    };
  }, []);

  // When navigating to a different set, reset PDF state
  useEffect(() => {
    if (remountTimer.current) clearTimeout(remountTimer.current);
    setPdfReady(false);
    setPdfKey(0);
    setPageCount(0);
    setPasswordError(false);
    setPdfScale(1);

    if (currentSet?.pdfPath && !passwords[currentSet.name]) {
      // No saved password — prompt the user before showing the PDF
      setShowPasswordModal(true);
    } else if (currentSet?.pdfPath && passwords[currentSet.name]) {
      // Password already known — show PDF immediately
      setShowPasswordModal(false);
      setPdfReady(true);
    } else {
      setShowPasswordModal(false);
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback(
    (index: number, dir: 1 | -1 = 1) => {
      if (index < 0 || index >= sets.length || isAnimating.current) return;
      isAnimating.current = true;
      Animated.timing(slideAnim, {
        toValue: -dir * width,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(index);
        slideAnim.setValue(dir * width);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => { isAnimating.current = false; });
      });
    },
    [sets.length, slideAnim, width],
  );

  const goToPrev = useCallback(() => goTo(currentIndex - 1, -1), [currentIndex, goTo]);
  const goToNext = useCallback(() => goTo(currentIndex + 1, 1), [currentIndex, goTo]);

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
      // Hide the PDF before re-prompting to avoid a stale/crashing native view
      setPdfReady(false);
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
      // Give the old PDF native view a frame to fully unmount before the new one mounts
      remountTimer.current = setTimeout(() => {
        setPdfKey(k => k + 1);
        setPdfReady(true);
      }, 80);
    },
    [currentSet, setSetPassword],
  );

  if (!currentSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No sets available</Text>
      </View>
    );
  }

  const openPasswordModal = () => {
    setPasswordError(false);
    setPdfReady(false);
    setShowPasswordModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={isLandscape} animated />
      {/* Landscape compact bar */}
      {isLandscape && (
        <View style={styles.landscapeBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.landscapeBack}>
            <Text style={styles.landscapeBackText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.landscapeSetName} numberOfLines={1}>{currentSet.name}</Text>
          <Text style={styles.landscapeCounter}>{currentIndex + 1}/{sets.length}</Text>
          <TouchableOpacity style={styles.lockBtn} onPress={openPasswordModal}>
            <Text style={styles.lockIcon}>{currentPassword ? '🔑' : '🔒'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Portrait info bar */}
      {!isLandscape && (
        <View style={styles.infoBar}>
          <Text style={styles.setName} numberOfLines={1} adjustsFontSizeToFit>
            {currentSet.name}
          </Text>
          {pageCount > 0 && <Text style={styles.pageCount}>{pageCount}p</Text>}
          <TouchableOpacity style={styles.lockBtn} onPress={openPasswordModal}>
            <Text style={styles.lockIcon}>{currentPassword ? '🔑' : '🔒'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <PanGestureHandler
        onHandlerStateChange={handleSwipe}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-25, 25]}
      >
        <View style={styles.pdfContainer}>
          <Animated.View style={[styles.slideContent, { transform: [{ translateX: slideAnim }] }]}>
            {!currentSet.pdfPath ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>No PDF loaded for this set</Text>
                <Text style={styles.errorHint}>Load a ZIP file from the home screen</Text>
              </View>
            ) : pdfReady ? (
              <Pdf
                key={pdfKey}
                source={{ uri: currentSet.pdfPath }}
                password={currentPassword}
                style={styles.pdf}
                onLoadComplete={n => { setPageCount(n); setPasswordError(false); }}
                onError={handlePdfError}
                onScaleChanged={scale => setPdfScale(scale)}
              />
            ) : (
              <View style={styles.center}>
                <Text style={styles.placeholderText}>
                  {currentPassword ? 'Loading…' : 'Enter password to view this set'}
                </Text>
              </View>
            )}

            {/* Side tap zones — hidden when zoomed in */}
            {currentIndex > 0 && pdfScale <= 1.05 && (
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
            {currentIndex < sets.length - 1 && pdfScale <= 1.05 && (
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
          </Animated.View>
        </View>
      </PanGestureHandler>

      {/* Portrait bottom bar */}
      {!isLandscape && (
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
      )}

      <PasswordModal
        visible={showPasswordModal}
        setName={currentSet.name}
        current={currentPassword}
        showError={passwordError}
        onSave={handleSavePassword}
        onClose={() => setShowPasswordModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  errorHint: { color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  placeholderText: { color: '#888', fontSize: 15, textAlign: 'center' },

  landscapeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  landscapeBack: { paddingHorizontal: 4 },
  landscapeBackText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  landscapeSetName: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  landscapeCounter: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

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
  slideContent: { flex: 1 },
  pdf: { flex: 1, width: '100%', backgroundColor: '#1a1a1a' },

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
