import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORT_AVAILABLE } from '../config/support';
import {
  INITIAL_SUPPORT_PROMPT_STATE,
  SupportPromptState,
  optOut,
  recordZipLoad,
  shouldShowSupportPrompt,
  snooze,
} from '../utils/supportPrompt';

const STORAGE_KEY = 'support_prompt_state';

/**
 * Kept out of CompetitionContext on purpose: resetting the competition should not
 * reset how often the user has been asked for a donation.
 */
export function useSupportPrompt() {
  const [state, setState] = useState<SupportPromptState>(INITIAL_SUPPORT_PROMPT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...INITIAL_SUPPORT_PROMPT_STATE, ...JSON.parse(raw) });
      } catch {
        // Corrupt or unreadable — fall back to the initial state and carry on.
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback((next: SupportPromptState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Losing the counter only means the prompt may come back later; not worth surfacing.
    });
  }, []);

  const markZipLoaded = useCallback(() => {
    if (!SUPPORT_AVAILABLE) return;
    setState(prev => {
      const next = recordZipLoad(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const dismiss = useCallback(() => persist(snooze(state)), [persist, state]);
  const dontAskAgain = useCallback(() => persist(optOut(state)), [persist, state]);

  return {
    /** False until the stored state has loaded, so the prompt never flashes on launch. */
    shouldPrompt: loaded && shouldShowSupportPrompt(SUPPORT_AVAILABLE, state),
    markZipLoaded,
    dismiss,
    dontAskAgain,
  };
}
