import { create } from 'zustand';

/**
 * Global "single active media" state for the page.
 * When one AudioPlayer or VideoPlayer plays, its id is set here;
 * all other players (audio and video) subscribe and pause themselves.
 */
interface MediaFocusState {
  activeMediaId: string | null;
  setActiveMediaId: (id: string | null) => void;
}

export const useMediaFocusStore = create<MediaFocusState>((set) => ({
  activeMediaId: null,
  setActiveMediaId: (id) => set({ activeMediaId: id }),
}));
