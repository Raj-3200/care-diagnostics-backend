'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/api';
import type { User, LoginRequest, LoginResponse, ApiResponse } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: (options?: { force?: boolean }) => Promise<void>;
}

// Singleton promise — never fire /auth/me twice simultaneously
let _loadPromise: Promise<void> | null = null;

function clearPersistedAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cd_token');
    localStorage.removeItem('care-auth');
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (credentials: LoginRequest) => {
        const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
        if (data.success && data.data) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('cd_token', data.data.tokens.accessToken);
          }
          set({ user: data.data.user, isAuthenticated: true, isLoading: false });
        }
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        _loadPromise = null;
        set({ user: null, isAuthenticated: false, isLoading: false });
        // Clear persisted storage on logout
        if (typeof window !== 'undefined') {
          clearPersistedAuth();
          window.location.href = '/login';
        }
      },

      loadUser: async (options = {}) => {
        // ── Fast path: user already in store (from localStorage persist) ──
        // Still validate with server silently in background
        const { user, isAuthenticated } = get();
        if (!options.force && isAuthenticated && user) {
          set({ isLoading: false });
          // Background re-validation (silent — don't block UI)
          _silentValidate(set);
          return;
        }

        // ── Cold load: no cached user — fetch from server ──
        if (_loadPromise) return _loadPromise;

        _loadPromise = (async () => {
          set({ isLoading: true });
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const { data } = await api.get<ApiResponse<User>>('/auth/me', {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (data.success && data.data) {
              set({ user: data.data, isAuthenticated: true, isLoading: false });
            } else {
              set({ user: null, isAuthenticated: false, isLoading: false });
              clearPersistedAuth();
            }
          } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
            clearPersistedAuth();
          } finally {
            _loadPromise = null;
          }
        })();

        return _loadPromise;
      },
    }),
    {
      name: 'care-auth',                        // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({                 // only persist user data, not loading state
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydrating from localStorage, mark loading done
        if (state) {
          state.isLoading = false;
        }
      },
    },
  ),
);

// ── Silent background validation ──────────────────────────────────────────
// Called when user is found in localStorage — verifies the session is still
// valid without blocking the UI. If it fails, logs the user out quietly.
async function _silentValidate(
  set: (state: Partial<AuthState>) => void,
) {
  try {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    if (data.success && data.data) {
      // Refresh user data in case anything changed (role, name etc.)
      set({ user: data.data, isAuthenticated: true });
    } else {
      // Session expired server-side
      set({ user: null, isAuthenticated: false });
      if (typeof window !== 'undefined') {
        clearPersistedAuth();
        window.location.href = '/login';
      }
    }
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
        ? (error as { response: { status: number } }).response.status
        : undefined;

    if (status === 401 || status === 403) {
      set({ user: null, isAuthenticated: false });
      clearPersistedAuth();
      return;
    }
    // Network error — keep the cached user, don't log out
    // (prevents logout on brief connectivity issues)
  }
}
