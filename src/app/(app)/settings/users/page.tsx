
"use client";

import React, { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { UserTable } from '@/components/users/user-table';
import { UserDialog } from '@/components/users/user-dialog';
import type { User } from '@/types';
import { ROLE_PERMISSIONS } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";

// Initial mock data for users
const initialMockUsers: User[] = [
  { 
    id: 'user_1', 
    firstName: 'Alice', 
    lastName: 'Admin', 
    email: 'alice.admin@example.com', 
    role: 'Admin',
    isActive: true,
    lastLogin: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    permissions: ROLE_PERMISSIONS['Admin'],
  },
  { 
    id: 'user_2', 
    firstName: 'Bob', 
    lastName: 'User', 
    email: 'bob.user@example.com', 
    role: 'User',
    isActive: true,
    lastLogin: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    permissions: ROLE_PERMISSIONS['User'],
  },
  { 
    id: 'user_3', 
    firstName: 'Charlie', 
    lastName: 'Inactive', 
    email: 'charlie.inactive@example.com', 
    role: 'User',
    isActive: false,
    permissions: ROLE_PERMISSIONS['User'],
    lastLogin: undefined, 
  },
];

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>(initialMockUsers);
  const { toast } = useToast();

  const handleSaveUser = (userToSave: User) => {
    setUsers(prevUsers => {
      const index = prevUsers.findIndex(u => u.id === userToSave.id);
      if (index !== -1) {
        // Edit existing user
        const updatedUsers = [...prevUsers];
        updatedUsers[index] = userToSave;
        toast({
          title: "User Updated",
          description: `User ${userToSave.firstName} ${userToSave.lastName} has been updated.`,
        });
        return updatedUsers;
      } else {
        // Add new user
        toast({
          title: "User Added",
          description: `User ${userToSave.firstName} ${userToSave.lastName} has been added.`,
        });
        return [...prevUsers, { ...userToSave, id: userToSave.id || crypto.randomUUID() }];
      }
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    toast({
      title: "User Deleted",
      description: "The user has been removed from the list.",
      variant: "default",
    });
  };

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
