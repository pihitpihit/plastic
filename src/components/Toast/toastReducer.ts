import type { ToastData, ToastPhase } from "./Toast.types";

export interface ToastInternalState {
  id: string;
  data: ToastData;
  phase: ToastPhase;
  elapsed: number;
  isPaused: boolean;
  swipeOffset: number;
  swipeOpacity: number;
}

export type ToastReducerAction =
  | { type: "ADD"; data: ToastData; maxToasts: number; stackOrder: "newest-first" | "oldest-first" }
  | { type: "DISMISS"; id: string }
  | { type: "DISMISS_ALL" }
  | { type: "REMOVE"; id: string }
  | { type: "SET_PHASE"; id: string; phase: ToastPhase }
  | { type: "PAUSE"; id: string }
  | { type: "RESUME"; id: string }
  | { type: "UPDATE"; id: string; data: Partial<ToastData> };

export function toastReducer(
  state: ToastInternalState[],
  action: ToastReducerAction,
): ToastInternalState[] {
  switch (action.type) {
    case "ADD": {
      const next: ToastInternalState = {
        id: action.data.id,
        data: action.data,
        phase: "entering",
        elapsed: 0,
        isPaused: false,
        swipeOffset: 0,
        swipeOpacity: 1,
      };

      // Insert at the end; UI ordering (newest-first vs oldest-first) is
      // handled at render time.
      const combined = [...state, next];

      // maxToasts 초과 시 가장 오래된 non-exiting 항목을 exiting으로 전환
      const visible = combined.filter((t) => t.phase !== "exiting");
      if (visible.length > action.maxToasts) {
        const overflow = visible.length - action.maxToasts;
        // 오래된 순서대로 overflow만큼 exiting 처리
        const toExpel = visible.slice(0, overflow).map((t) => t.id);
        return combined.map((t) =>
          toExpel.includes(t.id) ? { ...t, phase: "exiting" as ToastPhase } : t,
        );
      }

      return combined;
    }

    case "DISMISS": {
      return state.map((t) =>
        t.id === action.id ? { ...t, phase: "exiting" as ToastPhase } : t,
      );
    }

    case "DISMISS_ALL": {
      return state.map((t) => ({ ...t, phase: "exiting" as ToastPhase }));
    }

    case "REMOVE": {
      return state.filter((t) => t.id !== action.id);
    }

    case "SET_PHASE": {
      return state.map((t) =>
        t.id === action.id ? { ...t, phase: action.phase } : t,
      );
    }

    case "PAUSE": {
      return state.map((t) =>
        t.id === action.id ? { ...t, isPaused: true } : t,
      );
    }

    case "RESUME": {
      return state.map((t) =>
        t.id === action.id ? { ...t, isPaused: false } : t,
      );
    }

    case "UPDATE": {
      return state.map((t) =>
        t.id === action.id ? { ...t, data: { ...t.data, ...action.data } } : t,
      );
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
