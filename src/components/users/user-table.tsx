
"use client";

import type { User } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { UserDialog } from './user-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';

interface UserTableProps {
  users: User[];
  onSave: (user: User) => void; // Callback for when a user is saved via the dialog
}

export function UserTable({ users, onSave }: UserTableProps) {
  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell><Badge variant={user.role === 'Admin' ? "default" : "secondary"}>{user.role}</Badge></TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "outline" : "destructive"} className={user.isActive ? "border-green-500 text-green-700" : ""}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                {user.lastLogin ? `${formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}` : 'Never'}
              </TableCell>
              <TableCell>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Icon name="MoreHorizontal" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <UserDialog 
                      user={user}
                      triggerButton={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                           <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit User
                        </DropdownMenuItem>
                      }
                      onSave={onSave}
                    />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
