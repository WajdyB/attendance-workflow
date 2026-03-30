"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AUTH_STORAGE_KEY = "authStorage";
type StorageMode = "local" | "session";

// Define interfaces (add documents and department)
interface Document {
  id: string;
  userId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseUser {
  id: string;
  authId: string;
  roleId: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  phone: string;
  address: string;
  personalEmail: string;
  workEmail: string;
  jobTitle: string;
  bankName: string;
  cnssNumber: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  avatarUrl?: string;
  departmentId?: string | null;
  department?: Department | null;
  documents?: Document[]; // Add documents field
}

interface AuthUser {
  id: string;
  email: string;
  lastSignIn: string;
}

interface Session {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refresh_token?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user: AuthUser;
  session: Session;
  databaseUser: DatabaseUser; // This should already include documents from your API
}

interface AuthContextType {
  user: AuthUser | null;
  databaseUser: DatabaseUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (response: LoginResponse, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (userData: Partial<DatabaseUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const getStorage = (mode: StorageMode): Storage =>
    mode === "local" ? localStorage : sessionStorage;

  const clearAuthKeys = (storage: Storage) => {
    storage.removeItem("token");
    storage.removeItem("refreshToken");
    storage.removeItem("user");
    storage.removeItem("databaseUser");
  };

  const detectStorageMode = (): StorageMode | null => {
    const preferredMode = localStorage.getItem(
      AUTH_STORAGE_KEY,
    ) as StorageMode | null;

    if (preferredMode === "local") {
      const hasLocalSession =
        !!localStorage.getItem("token") && !!localStorage.getItem("user");
      if (hasLocalSession) return "local";
    }

    if (preferredMode === "session") {
      const hasSessionStorageSession =
        !!sessionStorage.getItem("token") && !!sessionStorage.getItem("user");
      if (hasSessionStorageSession) return "session";
    }

    const hasLocalSession =
      !!localStorage.getItem("token") && !!localStorage.getItem("user");
    if (hasLocalSession) return "local";

    const hasSessionStorageSession =
      !!sessionStorage.getItem("token") && !!sessionStorage.getItem("user");
    if (hasSessionStorageSession) return "session";

    return null;
  };

  // Load auth state from storage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const mode = detectStorageMode();
        const storage = mode ? getStorage(mode) : null;
        const storedToken = storage?.getItem("token") ?? null;
        const storedUser = storage?.getItem("user") ?? null;
        const storedDatabaseUser = storage?.getItem("databaseUser") ?? null;

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          if (storedDatabaseUser) {
            const parsedUser = JSON.parse(storedDatabaseUser);
            console.log("Loaded user with documents:", parsedUser.documents); // Debug log
            setDatabaseUser(parsedUser);
          }
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = (response: LoginResponse, rememberMe = false) => {
    const { session, user, databaseUser } = response;


    const refreshToken = session.refreshToken ?? session.refresh_token;
    const storageMode: StorageMode = rememberMe ? "local" : "session";
    const targetStorage = getStorage(storageMode);
    const otherStorage = getStorage(
      storageMode === "local" ? "session" : "local",
    );

    clearAuthKeys(otherStorage);
    clearAuthKeys(targetStorage);
    localStorage.setItem(AUTH_STORAGE_KEY, storageMode);

    // Save to selected storage mode
    targetStorage.setItem("token", session.accessToken);
    if (refreshToken) {
      targetStorage.setItem("refreshToken", refreshToken);
    }
    targetStorage.setItem("user", JSON.stringify(user));
    targetStorage.setItem("databaseUser", JSON.stringify(databaseUser));

    // Update state
    setToken(session.accessToken);
    setUser(user);
    setDatabaseUser(databaseUser);
  };

  const logout = () => {
    // Clear auth in both storage scopes
    clearAuthKeys(sessionStorage);
    clearAuthKeys(localStorage);
    localStorage.removeItem(AUTH_STORAGE_KEY);

    // Clear state
    setToken(null);
    setUser(null);
    setDatabaseUser(null);

    // Redirect to login
    router.push("/auth/login");
  };

  const updateUser = (userData: Partial<DatabaseUser>) => {
    if (databaseUser) {
      const updatedUser = { ...databaseUser, ...userData };

      // Update in storage
      const mode = detectStorageMode();
      if (mode) {
        const storage = getStorage(mode);
        storage.setItem("databaseUser", JSON.stringify(updatedUser));
      }

      setDatabaseUser(updatedUser);
    }
  };

  const value = {
    user,
    databaseUser,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

