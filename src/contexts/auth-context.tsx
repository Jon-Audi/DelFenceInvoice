
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  // signup: (email: string, pass: string) => Promise<void>; // Placeholder for future
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // User state will be updated by onAuthStateChanged
      toast({ title: "Logged In", description: "Successfully logged in." });
      router.push('/dashboard'); // Redirect after login
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Login Failed", description: e.message, variant: "destructive" });
      console.error("Login error:", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // User state will be updated by onAuthStateChanged
      toast({ title: "Logged Out", description: "Successfully logged out." });
      router.push('/login'); // Redirect to login after logout
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Logout Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // const signup = async (email, pass) => { /* ... */ }; // Implement later

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout /*, signup */ }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
