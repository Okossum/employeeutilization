import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = useMemo<AuthContextValue>(() => ({ user, isLoading, signOut }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};



