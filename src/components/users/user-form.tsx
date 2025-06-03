
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User, UserRole, PermissionKey } from '@/types';
import { USER_ROLES, ROLE_PERMISSIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(USER_ROLES as [UserRole, ...UserRole[]]),
  isActive: z.boolean(),
  // Permissions are not directly editable in this form version,
  // but will be derived from the role.
});

// This type will be used for form submission, then permissions are added.
export type UserFormData = Omit<z.infer<typeof userFormSchema>, 'permissions'>;


interface UserFormProps {
  user?: User; // Existing user data for editing
  onSubmit: (data: Omit<User, 'id' | 'lastLogin' | 'permissions'> & { permissions: PermissionKey[] }) => void;
  onClose?: () => void;
}

export function UserForm({ user, onSubmit, onClose }: UserFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user ? {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    } : {
      firstName: '',
      lastName: '',
      email: '',
      role: 'User', // Default role
      isActive: true, // Default status
    },
  });

  const handleSubmit = (data: UserFormData) => {
    const permissions = ROLE_PERMISSIONS[data.role] || [];
    onSubmit({ ...data, permissions });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value as UserRole);
                  // Permissions will be re-calculated on submit based on new role
                }} 
                defaultValue={field.value}
              >
                <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                <SelectContent>
                  {USER_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Status</FormLabel>
              <div className="flex items-center space-x-2 mt-2.5">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <Label htmlFor="isActive" className="text-sm">
                  {field.value ? 'Active' : 'Inactive'}
                </Label>
              </div>
              <FormDescription>Inactive users cannot log in.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Future: UI for managing permissions could go here */}
        {/* For now, permissions are derived from role on submit */}

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{user ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </form>
    </Form>
  );
}
