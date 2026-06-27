import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const BULLET = '●';
const REVEAL_MS = 600;

interface Props {
  visible: boolean;
  setName: string;
  current?: string;
  showError?: boolean;
  onSave(password: string): void;
  onClose(): void;
}

export function PasswordModal({ visible, setName, current = '', showError, onSave, onClose }: Props) {
  const actualRef = useRef(current);
  const maskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [display, setDisplay] = useState(BULLET.repeat(current.length));
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (visible) {
      if (maskTimer.current) clearTimeout(maskTimer.current);
      actualRef.current = current;
      setDisplay(showText ? current : BULLET.repeat(current.length));
      setShowText(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current]);

  useEffect(() => {
    return () => {
      if (maskTimer.current) clearTimeout(maskTimer.current);
    };
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      const prev = actualRef.current;
      const prevLen = prev.length;
      const newLen = text.length;

      if (newLen > prevLen) {
        // Characters added — the new display value has bullet-masked existing chars
        // plus whatever the OS passed for new chars. Extract only the newly typed chars.
        // When secureTextEntry=false and we control display, text === display + new chars
        const added = text.slice(prevLen);
        const newActual = prev + added;
        actualRef.current = newActual;

        if (showText) {
          setDisplay(newActual);
        } else {
          // Show new chars briefly, then mask
          const masked = BULLET.repeat(prevLen) + added;
          setDisplay(masked);
          if (maskTimer.current) clearTimeout(maskTimer.current);
          maskTimer.current = setTimeout(() => {
            setDisplay(BULLET.repeat(newActual.length));
          }, REVEAL_MS);
        }
      } else {
        // Characters removed — sync actual to what was deleted
        // Map display back: bullets are old chars, visible chars are newly typed ones still showing
        // Safest: just trim actualRef to newLen
        const newActual = actualRef.current.slice(0, newLen);
        actualRef.current = newActual;
        if (maskTimer.current) clearTimeout(maskTimer.current);
        if (showText) {
          setDisplay(newActual);
        } else {
          setDisplay(prev => prev.slice(0, newLen));
        }
      }
    },
    [showText],
  );

  const toggleShowText = useCallback(() => {
    setShowText(prev => {
      const next = !prev;
      if (maskTimer.current) clearTimeout(maskTimer.current);
      setDisplay(next ? actualRef.current : BULLET.repeat(actualRef.current.length));
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    onSave(actualRef.current);
  }, [onSave]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        {/* Tap backdrop to dismiss */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.card}>
          <Text style={styles.title}>PDF Password</Text>
          <Text style={styles.setName} numberOfLines={2}>{setName}</Text>

          {showError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Incorrect password — try again</Text>
            </View>
          )}

          <View style={[styles.inputRow, showError && styles.inputRowError]}>
            <TextInput
              style={styles.input}
              value={display}
              onChangeText={handleChange}
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry={false}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={toggleShowText}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showText ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  setName: { fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 18 },
  errorBanner: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  errorText: { color: '#c62828', fontSize: 13, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 20,
    paddingRight: 8,
  },
  inputRowError: { borderColor: '#c62828' },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: '#1a1a1a',
  },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 11 },
  cancelText: { color: '#666', fontSize: 15 },
  primaryBtn: {
    backgroundColor: '#003087',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
