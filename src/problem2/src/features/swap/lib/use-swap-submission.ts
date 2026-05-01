import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * State machine for the Confirm flow. Real DEXes wait on a wallet
 * signature → broadcast → mempool inclusion → finality. We mock all of
 * that with a single `confirming` window of fixed duration so the UI
 * still has a meaningful in-flight state.
 *
 * Phases:
 *   - idle      : the form is editable
 *   - confirming: lock the form; show inline progress
 *   - success   : show receipt; user can dismiss to return to idle
 *   - error     : show reason; user can dismiss to retry
 */
export type SwapReceipt = {
  fromSymbol: string;
  toSymbol: string;
  pay: number;
  receive: number;
  /** DEX label the swap was routed through (display string). */
  routedVia: string;
  txId: string;
  finishedAt: number;
};

export type SwapSubmissionState =
  | { phase: 'idle' }
  | { phase: 'confirming'; receipt: Omit<SwapReceipt, 'txId' | 'finishedAt'> }
  | { phase: 'success'; receipt: SwapReceipt }
  | { phase: 'error'; reason: string };

type Action =
  | { type: 'submit'; pending: SwapSubmissionState & { phase: 'confirming' } }
  | { type: 'resolve'; receipt: SwapReceipt }
  | { type: 'reject'; reason: string }
  | { type: 'reset' };

const reducer = (_state: SwapSubmissionState, action: Action): SwapSubmissionState => {
  switch (action.type) {
    case 'submit':
      return action.pending;
    case 'resolve':
      return { phase: 'success', receipt: action.receipt };
    case 'reject':
      return { phase: 'error', reason: action.reason };
    case 'reset':
      return { phase: 'idle' };
  }
};

const randomTxId = (): string =>
  '0x' +
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

type UseSwapSubmissionOptions = {
  /** Mock confirmation latency, ms. */
  delayMs?: number;
};

/**
 * Drives a Confirm click through confirming → success/error. The reducer
 * is the only place that mutates state; the timer is held in a ref so a
 * fast unmount cancels the pending transition cleanly.
 */
export const useSwapSubmission = ({ delayMs = 1500 }: UseSwapSubmissionOptions = {}) => {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const submit = useCallback(
    (pending: Omit<SwapReceipt, 'txId' | 'finishedAt'>) => {
      dispatch({ type: 'submit', pending: { phase: 'confirming', receipt: pending } });
      timeoutRef.current = window.setTimeout(() => {
        // 5% mock failure rate keeps the error path reachable in demos.
        if (Math.random() < 0.05) {
          dispatch({ type: 'reject', reason: 'Network refused the trade. Try again.' });
        } else {
          dispatch({
            type: 'resolve',
            receipt: { ...pending, txId: randomTxId(), finishedAt: Date.now() },
          });
        }
      }, delayMs);
    },
    [delayMs],
  );

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return { state, submit, reset };
};
