import React, { useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SUPPORT_URL } from '../config/support';

interface Props {
  visible: boolean;
  /** "Not now" — ask again in a couple of months. */
  onDismiss(): void;
  /** "Don't ask again", and also what a donation counts as. */
  onOptOut(): void;
}

export function SupportModal({ visible, onDismiss, onOptOut }: Props) {
  const handleSupport = useCallback(() => {
    // Whether or not the browser opens, stop asking — they went looking.
    onOptOut();
    Linking.openURL(SUPPORT_URL).catch(() => {});
  }, [onOptOut]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />

        <View style={styles.card}>
          <Text style={styles.title}>Enjoying Scrambles Viewer?</Text>
          <Text style={styles.body}>
            It's free, open source, and built in spare time between competitions. If it saved
            you some hassle at the scrambling table, you can chip in towards its development.
            Everything in the app stays free either way.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSupport}>
            <Text style={styles.primaryBtnText}>Support the app</Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.textBtn} onPress={onOptOut}>
              <Text style={styles.mutedText}>Don't ask again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textBtn} onPress={onDismiss}>
              <Text style={styles.linkText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 32,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  body: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 20 },
  primaryBtn: {
    backgroundColor: '#003087',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  textBtn: { paddingHorizontal: 4, paddingVertical: 11 },
  mutedText: { color: '#999', fontSize: 14 },
  linkText: { color: '#003087', fontSize: 14, fontWeight: '600' },
});
