
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { UserTable } from '@/components/users/user-table';
import { UserDialog } from '@/components/users/user-dialog';
import type { User } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'users'), 
      (snapshot) => {
        const fetchedUsers: User[] = [];
        snapshot.forEach((doc) => {
          fetchedUsers.push({ id: doc.id, ...doc.data() } as User);
        });
        setUsers(fetchedUsers);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching users: ", error);
        toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);

  const handleSaveUser = async (userToSave: User) => {
    // In a real app, creating/updating Firebase Auth user is complex from client-side.
    // This example focuses on updating the Firestore user document.
    // A Firebase Function would be needed to securely manage Auth users.
    const { id, ...userData } = userToSave;

    // Create a copy to modify for Firestore, ensuring no 'undefined' values.
    const dataToSave: Omit<User, 'id'> = { ...userData };
    if (dataToSave.lastLogin === undefined) {
      delete (dataToSave as Partial<User>).lastLogin;
    }

    try {
      const userDocRef = doc(db, 'users', id);
      await setDoc(userDocRef, dataToSave, { merge: true });
      toast({
        title: "User Saved",
        description: `User ${userToSave.firstName} ${userToSave.lastName} has been saved.`,
      });
    } catch (error) {
      console.error("Error saving user:", error);
      toast({ title: "Error", description: "Could not save user data.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Deleting a user from Firestore.
    // IMPORTANT: This does NOT delete the user from Firebase Authentication.
    // A Firebase Function is required for that.
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast({
        title: "User Deleted",
        description: "The user document has been removed from Firestore.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting user document:", error);
      toast({
        title: "Error",
        description: "Could not delete user document.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <PageHeader title="User Management" description="Loading user data...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="User Management" description="Manage user accounts, roles, and permissions.">
         <UserDialog 
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add User
              </Button>
            }
            onSave={handleSaveUser}
          />
      </PageHeader>
      <UserTable users={users} onSave={handleSaveUser} onDelete={handleDeleteUser} />
    </>
  );
}
