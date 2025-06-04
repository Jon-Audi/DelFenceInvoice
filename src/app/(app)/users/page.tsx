
"use client";

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { UserTable } from '@/components/users/user-table';
import { UserDialog } from '@/components/users/user-dialog';
import type { User } from '@/types';
import { ROLE_PERMISSIONS } from '@/lib/constants';

// Mock data for users - ensuring it includes permissions based on role
const mockUsers: User[] = [
  { 
    id: 'user_1', 
    firstName: 'Alice', 
    lastName: 'Admin', 
    email: 'alice.admin@example.com', 
    role: 'Admin',
    isActive: true,
    lastLogin: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    permissions: ROLE_PERMISSIONS['Admin'] 
  },
  { 
    id: 'user_2', 
    firstName: 'Bob', 
    lastName: 'User', 
    email: 'bob.user@example.com', 
    role: 'User',
    isActive: true,
    lastLogin: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    permissions: ROLE_PERMISSIONS['User']
  },
  { 
    id: 'user_3', 
    firstName: 'Charlie', 
    lastName: 'Inactive', 
    email: 'charlie.inactive@example.com', 
    role: 'User',
    isActive: false,
    permissions: ROLE_PERMISSIONS['User'],
    lastLogin: undefined
  },
];

export default function UsersPage() {
  // In a real app, you'd fetch users and handle saving here or in a global state/context
  // For now, we'll just log the save action.
  const handleSaveUser = (user: User) => {
    console.log("Saving user (from /users page):", user);
    // Here you would update your user list, possibly by refetching or updating local state.
    // For mock purposes, you might find and update the user in mockUsers or add a new one.
  };

  const handleDeleteUser = (userId: string) => {
    console.log("Deleting user (from /users page):", userId);
    // Here you would delete the user, possibly by refetching or updating local state.
  };

  return (
    <>
      <PageHeader title="Users (Legacy)" description="Manage user accounts and roles. (Access via /settings/users)">
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
 <UserTable users={mockUsers} onSave={handleSaveUser} onDelete={handleDeleteUser} />
    </>
  );
}
