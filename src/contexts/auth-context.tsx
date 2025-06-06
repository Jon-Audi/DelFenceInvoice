
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
import { auth as firebaseAuthInstance, db } from '@/lib/firebase'; // Renamed imported auth to firebaseAuthInstance
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from '@/lib/constants';
// import type { User } from '@/types'; // This type seems unused here directly

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
    if (!firebaseAuthInstance) {
      console.error("[AuthContext] Firebase Auth instance is not available. Firebase might not have initialized correctly. Check server logs and .env file.");
      setLoading(false);
      setError("Firebase Auth service is not available. Please check configuration.");
      return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);

    if (!firebaseAuthInstance) {
      const errMsg = "Firebase Auth service is not available for login. Check configuration.";
      setError(errMsg);
      toast({ title: "Login Failed", description: errMsg, variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
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
    if (!firebaseAuthInstance) {
      const errMsg = "Firebase Auth service is not available for logout. Check configuration.";
      setError(errMsg);
      toast({ title: "Logout Failed", description: errMsg, variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
      await firebaseSignOut(firebaseAuthInstance);
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

    if (!firebaseAuthInstance) {
      const errMsg = "Firebase Auth service is not available for signup. Check configuration.";
      setError(errMsg);
      toast({ title: "Signup Failed", description: errMsg, variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, pass);
      const newUser = userCredential.user;

      if (newUser) {
        try {
          await updateProfile(newUser, { displayName: `${firstName} ${lastName}` });
        } catch (profileError: any) {
          console.warn("Failed to update Firebase Auth profile displayName:", profileError);
        }

        if (!db) {
            const firestoreErrMsg = "Firestore service is not available. Cannot save user profile.";
            console.error("[AuthContext] " + firestoreErrMsg);
            setError(firestoreErrMsg);
            toast({ title: "Signup Incomplete", description: firestoreErrMsg, variant: "destructive" });
            setLoading(false);
            return;
        }

        try {
          const userDocRef = doc(db, 'users', newUser.uid);
          await setDoc(userDocRef, {
            uid: newUser.uid,
            email: newUser.email,
            firstName: firstName,
            lastName: lastName,
            role: 'User', 
            isActive: true,
            permissions: ROLE_PERMISSIONS['User'], 
          });
        } catch (firestoreError: any) {
          console.error("Error creating user document in Firestore after Auth user creation:", firestoreError);
          throw new Error(`User authenticated, but failed to save profile to database. ${firestoreError.message}`);
        }
        
        toast({ title: "Account Created", description: "Successfully signed up and logged in." });
        router.push('/dashboard');
      } else {
        throw new Error("User object not found after account creation.");
      }
    } catch (e: any) {
      setError(e.message); 
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
