import React, { useState, useEffect } from 'react';
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

interface Props {
  visible: boolean;
  setName: string;
  current?: string;
  showError?: boolean;
  onSave(password: string): void;
  onSaveForAll(password: string): void;
  onClose(): void;
}

export function PasswordModal({ visible, setName, current = '', showError, onSave, onSaveForAll, onClose }: Props) {
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (visible) setValue(current);
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>PDF Password</Text>
          <Text style={styles.setName} numberOfLines={2}>{setName}</Text>

          {showError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Incorrect password — try again</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, showError && styles.inputError]}
            value={value}
            onChangeText={setValue}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => onSave(value)}
          />

          <View style={styles.btnCol}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onSave(value)}
            >
              <Text style={styles.primaryBtnText}>Unlock this set</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => onSaveForAll(value)}
            >
              <Text style={styles.secondaryBtnText}>Use for all remaining sets</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '88%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  setName: { fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 18 },
  errorBanner: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  errorText: { color: '#c62828', fontSize: 13, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#c62828' },
  btnCol: { gap: 10 },
  primaryBtn: {
    backgroundColor: '#003087',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#003087', fontSize: 14, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#888', fontSize: 14 },
});
