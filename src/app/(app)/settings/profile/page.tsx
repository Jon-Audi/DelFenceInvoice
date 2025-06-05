
"use client";

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <>
        <PageHeader title="Profile" description="View and manage your profile details." />
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4 mb-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-8 w-40 mb-1" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32 mt-2" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (!authUser) {
    // This case should ideally be handled by AppLayout redirecting to login
    return (
      <>
        <PageHeader title="Profile" description="Not logged in." />
        <p>Please log in to view your profile.</p>
      </>
    );
  }

  const userInitial = authUser.displayName?.charAt(0)?.toUpperCase() || authUser.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <>
      <PageHeader title="User Profile" description="View and manage your personal details." />
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={authUser.photoURL || `https://placehold.co/80x80.png`} 
                alt="User Profile Picture"
                data-ai-hint="profile avatar" 
              />
              <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{authUser.displayName || "User Profile"}</CardTitle>
              <CardDescription className="text-md">{authUser.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" value={authUser.displayName || ''} readOnly className="bg-muted/50"/>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={authUser.email || ''} readOnly className="bg-muted/50"/>
                </div>
                 {authUser.metadata.lastSignInTime && (
                  <div>
                    <Label>Last Sign In</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(authUser.metadata.lastSignInTime).toLocaleString()}
                    </p>
                  </div>
                 )}
                 {authUser.metadata.creationTime && (
                    <div>
                    <Label>Account Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(authUser.metadata.creationTime).toLocaleDateString()}
                    </p>
                  </div>
                 )}
              </div>
            </div>

            {/* Placeholder for future profile editing form & password change */}
            <div className="pt-6 border-t">
                <h3 className="text-lg font-medium mb-3">More Actions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                Profile editing features (like changing your name or password) will be available here in the future.
                </p>
                <Button variant="outline" disabled>Change Password (Soon)</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
