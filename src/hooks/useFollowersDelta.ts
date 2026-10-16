import { useState, useEffect, useRef } from 'react';

export type FollowersDeltaState = 'gain' | 'loss' | 'same' | 'first';

export interface FollowersHistoryRecord {
  current: number;
  currentAt: number; // timestamp in milliseconds
  previous: number | null;
  previousAt: number | null; // timestamp in milliseconds
}

export interface FollowersDeltaResult {
  delta: number;
  since: string | null;
  state: FollowersDeltaState;
}

const STORAGE_KEY = 'mf:followers-history-v1';

/**
 * Format timestamp into "DD/MM às HH:MM" (e.g. "15/10 às 18:40")
 */
function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} às ${hours}:${minutes}`;
}

/**
 * Format timestamp into "DD/MM" (e.g. "15/10")
 */
function formatDateOnly(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Safely load history from localStorage
 */
function loadHistory(): FollowersHistoryRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.current === 'number') {
      return parsed as FollowersHistoryRecord;
    }
  } catch (err) {
    console.warn('[useFollowersDelta] Failed to read history from localStorage', err);
  }
  return null;
}

/**
 * Safely save history to localStorage
 */
function saveHistory(record: FollowersHistoryRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('[useFollowersDelta] Failed to save history to localStorage', err);
  }
}

/**
 * Hook to track followers delta between updates.
 *
 * @param seguidores Current count of followers
 * @param isFromNetwork Flag or fetch timestamp indicating if the data came freshly from network
 * @returns { delta, since, state }
 */
export function useFollowersDelta(
  seguidores: number,
  isFromNetwork: boolean | number = false
): FollowersDeltaResult {
  const [result, setResult] = useState<FollowersDeltaResult>(() => {
    // Initial calculation from existing stored history (read-only, no write)
    const existing = loadHistory();
    if (!existing || existing.previous === null) {
      return { delta: 0, since: null, state: 'first' };
    }
    const diff = existing.current - existing.previous;
    const state: FollowersDeltaState = diff > 0 ? 'gain' : diff < 0 ? 'loss' : 'same';
    const sinceText = existing.previousAt
      ? state === 'same'
        ? `sem variação desde ${formatDateOnly(existing.previousAt)}`
        : `desde ${formatDateTime(existing.previousAt)}`
      : null;

    return {
      delta: diff,
      since: sinceText,
      state
    };
  });

  // Track the last network execution key so re-renders don't duplicate network processing
  const lastProcessedNetworkRef = useRef<boolean | number | null>(null);

  useEffect(() => {
    // Only proceed when valid follower data is present
    if (typeof seguidores !== 'number' || seguidores <= 0) {
      return;
    }

    // Rule 4: Do NOT write to history when data comes from cache/offline.
    // Only record when response is from network.
    const isNetwork = Boolean(isFromNetwork);
    if (!isNetwork) {
      return;
    }

    // Avoid running multiple times for the exact same network response trigger
    if (lastProcessedNetworkRef.current === isFromNetwork) {
      return;
    }
    lastProcessedNetworkRef.current = isFromNetwork;

    try {
      const existing = loadHistory();
      const now = Date.now();

      if (!existing) {
        // 2a. Se não existir histórico: salvar { current: novo, currentAt: agora, previous: null, previousAt: null }
        // e mostrar o estado "primeira leitura"
        const newRecord: FollowersHistoryRecord = {
          current: seguidores,
          currentAt: now,
          previous: null,
          previousAt: null
        };
        saveHistory(newRecord);
        setResult({
          delta: 0,
          since: null,
          state: 'first'
        });
        return;
      }

      if (seguidores !== existing.current) {
        // 2b. Se o valor for DIFERENTE: mover current para previous (com suas datas),
        // gravar o novo valor como current e mostrar a variação = novo - previous
        const updatedRecord: FollowersHistoryRecord = {
          current: seguidores,
          currentAt: now,
          previous: existing.current,
          previousAt: existing.currentAt
        };
        saveHistory(updatedRecord);

        const diff = seguidores - existing.current;
        const state: FollowersDeltaState = diff > 0 ? 'gain' : diff < 0 ? 'loss' : 'same';
        const sinceText = existing.currentAt
          ? state === 'same'
            ? `sem variação desde ${formatDateOnly(existing.currentAt)}`
            : `desde ${formatDateTime(existing.currentAt)}`
          : null;

        setResult({
          delta: diff,
          since: sinceText,
          state
        });
      } else {
        // 2c. Se o valor for IGUAL: NÃO alterar o histórico, para que o último ganho ou perda continue visível.
        // Variação exibida = current - previous. Se previous for null, mostrar o estado "primeira leitura".
        if (existing.previous === null) {
          setResult({
            delta: 0,
            since: null,
            state: 'first'
          });
        } else {
          const diff = existing.current - existing.previous;
          const state: FollowersDeltaState = diff > 0 ? 'gain' : diff < 0 ? 'loss' : 'same';
          const sinceText = existing.previousAt
            ? state === 'same'
              ? `sem variação desde ${formatDateOnly(existing.previousAt)}`
              : `desde ${formatDateTime(existing.previousAt)}`
            : null;

          setResult({
            delta: diff,
            since: sinceText,
            state
          });
        }
      }
    } catch (err) {
      console.warn('[useFollowersDelta] Error handling followers delta', err);
    }
  }, [seguidores, isFromNetwork]);

  return result;
}
