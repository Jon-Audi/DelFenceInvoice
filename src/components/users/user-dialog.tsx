
"use client";

import React from 'react'; // Added React import
import type { User, PermissionKey } from '@/types';
import { UserForm } from './user-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROLE_PERMISSIONS } from '@/lib/constants';

interface UserDialogProps {
  user?: User;
  triggerButton: React.ReactElement;
  onSave?: (user: User) => void;
}

export function UserDialog({ user, triggerButton, onSave }: UserDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: Omit<User, 'id' | 'lastLogin' | 'permissions'> & { id?: string; permissions: PermissionKey[] }) => {
    const userToSave: User = {
      ...data,
      id: user?.id || crypto.randomUUID(),
      permissions: data.permissions, // Permissions are now passed from the form submission logic
      // lastLogin is usually managed by the backend, so we don't set it here
      // If creating a new user, lastLogin would be undefined
      lastLogin: user?.lastLogin 
    };
    if (onSave) {
      onSave(userToSave);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {user ? 'Update the details for this user.' : 'Fill in the details for the new user.'}
          </DialogDescription>
        </DialogHeader>
        <UserForm user={user} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
