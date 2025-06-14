
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase'; // Import auth directly
import { updateProfile } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editableDisplayName, setEditableDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false); // For future use

  useEffect(() => {
    if (authUser?.displayName) {
      setEditableDisplayName(authUser.displayName);
    } else if (authUser?.email) {
      setEditableDisplayName('');
    }
  }, [authUser]);

  const handleEditName = () => {
    setEditableDisplayName(authUser?.displayName || '');
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditableDisplayName(authUser?.displayName || '');
  };

  const handleSaveName = async () => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "Not logged in.", variant: "destructive" });
      return;
    }
    if (editableDisplayName.trim() === (authUser?.displayName || '')) {
        setIsEditingName(false);
        toast({ title: "No Changes", description: "Display name is the same.", variant: "default" });
        return;
    }

    setIsSavingName(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editableDisplayName.trim() === '' ? null : editableDisplayName.trim(),
      });
      toast({ title: "Profile Updated", description: "Your display name has been updated." });
      setIsEditingName(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      console.error("Error updating display name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePhotoButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // console.log("Selected photo:", file.name, file.type);
      toast({
        title: "Photo Selected (Simulation)",
        description: `File: ${file.name}. Next step would be to upload and update profile.`,
      });
      // Placeholder for actual upload logic
      // setIsUploadingPhoto(true);
      // await uploadPhotoAndSetUrl(file);
      // setIsUploadingPhoto(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    }
  };


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
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-3">
                <AvatarImage
                  src={authUser.photoURL || `https://placehold.co/96x96.png`}
                  alt="User Profile Picture"
                  data-ai-hint="profile avatar"
                />
                <AvatarFallback className="text-3xl">{userInitial}</AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelected}
                accept="image/png, image/jpeg, image/gif"
                style={{ display: 'none' }}
                disabled={isUploadingPhoto}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePhotoButtonClick}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icon name="Edit" className="mr-2 h-4 w-4" />
                )}
                Change Photo
              </Button>
            </div>

            <div className="mt-4 sm:mt-0 flex-grow">
              {isEditingName ? (
                <div className="space-y-2">
                  <Label htmlFor="editableDisplayName" className="text-xs text-muted-foreground">Edit Display Name</Label>
                  <Input
                    id="editableDisplayName"
                    value={editableDisplayName}
                    onChange={(e) => setEditableDisplayName(e.target.value)}
                    className="text-3xl font-semibold p-1 h-auto"
                    placeholder="Your Name"
                  />
                  <div className="flex gap-2 mt-1">
                    <Button onClick={handleSaveName} size="sm" disabled={isSavingName}>
                      {isSavingName && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                    <Button onClick={handleCancelEditName} size="sm" variant="outline" disabled={isSavingName}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-1">
                  <CardTitle className="text-3xl">{authUser.displayName || <span className="italic text-muted-foreground">No display name</span>}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleEditName} className="h-8 w-8">
                    <Icon name="Edit" className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <CardDescription className="text-md mt-1">{authUser.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={authUser.email || ''} readOnly className="bg-muted/50" />
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

            <div className="pt-6 border-t">
              <h3 className="text-lg font-medium mb-3">More Actions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Profile editing features (like changing your password) will be available here in the future.
              </p>
              <Button variant="outline" disabled>Change Password (Soon)</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
