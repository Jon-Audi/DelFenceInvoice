
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from '@/lib/constants'; // Ensure this is imported
import type { User } from '@/types'; // For consistency, though not directly used for the Firestore object literal here

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
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
      toast({ title: "Logged In", description: "Successfully logged in." });
      router.push('/dashboard');
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
    setError(null);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "Successfully logged out." });
      router.push('/login');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Logout Failed", description: e.message, variant: "destructive" });
      console.error("Logout error:", e);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, firstName: string, lastName: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;

      if (newUser) {
        // Update Firebase Auth profile
        try {
          await updateProfile(newUser, { displayName: `${firstName} ${lastName}` });
        } catch (profileError: any) {
          console.warn("Failed to update Firebase Auth profile displayName:", profileError);
          // Non-critical, so just warn and continue.
        }

        // Store additional user info in Firestore
        try {
          const userDocRef = doc(db, 'users', newUser.uid);
          await setDoc(userDocRef, {
            uid: newUser.uid,
            email: newUser.email,
            firstName: firstName,
            lastName: lastName,
            role: 'User', // Default role
            isActive: true,
            permissions: ROLE_PERMISSIONS['User'], // Store default permissions
            // lastLogin will be updated by specific login events or backend logic
          });
        } catch (firestoreError: any) {
          console.error("Error creating user document in Firestore after Auth user creation:", firestoreError);
          // This is a critical failure if the user profile can't be saved.
          // Consider how to handle this - e.g., inform the user, attempt to delete the auth user (complex).
          // For now, we'll let the signup fail overall.
          throw new Error(`User authenticated, but failed to save profile to database. ${firestoreError.message}`);
        }
        
        toast({ title: "Account Created", description: "Successfully signed up and logged in." });
        router.push('/dashboard');
      } else {
        // This case should ideally not happen if createUserWithEmailAndPassword succeeds.
        throw new Error("User object not found after account creation.");
      }
    } catch (e: any) {
      setError(e.message); // This will catch errors from createUserWithEmailAndPassword or the re-thrown error from Firestore setDoc failure
      toast({ title: "Signup Failed", description: e.message, variant: "destructive" });
      console.error("Signup process error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, signup }}>
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
