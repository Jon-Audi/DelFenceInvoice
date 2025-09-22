
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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth as firebaseAuthInstance, db } from '@/lib/firebase'; // Renamed imported auth to firebaseAuthInstance
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from '@/lib/constants';
import type { User } from '@/types'; 

interface AppUser extends FirebaseUser {
  role?: User['role'];
  permissions?: User['permissions'];
}

interface AuthContextType {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseAuthInstance) {
      console.error("[AuthContext] Firebase Auth instance is not available.");
      setLoading(false);
      setError("Firebase Auth service is not available.");
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          const appUser: AppUser = {
            ...firebaseUser,
            role: userData.role,
            permissions: userData.permissions,
          };
          setUser(appUser);
        } else {
          // Fallback if firestore doc doesn't exist, though it should.
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuthInstance, email, pass);
      toast({ title: "Logged In", description: "Successfully logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Login Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(firebaseAuthInstance);
      toast({ title: "Logged Out", description: "Successfully logged out." });
      router.push('/login');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Logout Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, firstName: string, lastName: string) => {
    setLoading(true);
    setError(null);

    // This function is intended for initial user signup. For creating users as an admin,
    // a secure backend (like a Firebase Function) is strongly recommended.
    // This client-side implementation is for demonstration.
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, pass);
      const newUser = userCredential.user;

      await updateProfile(newUser, { displayName: `${firstName} ${lastName}` });
      
      const userDocRef = doc(db, 'users', newUser.uid);
      const newUserProfile: User = {
        id: newUser.uid,
        email: newUser.email!,
        firstName: firstName,
        lastName: lastName,
        role: 'User', // New users default to 'User' role
        isActive: true,
        permissions: ROLE_PERMISSIONS['User'],
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newUserProfile);
      
      toast({ title: "Account Created", description: "Successfully signed up and logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Signup Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, login, logout, signup }}>
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
