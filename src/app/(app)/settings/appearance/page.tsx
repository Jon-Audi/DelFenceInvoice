
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/contexts/theme-context';
import { Icon } from '@/components/icons'; // Assuming you have an Icon component

type ThemeOption = "light" | "dark" | "system";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Icon name="Sun" className="mr-2 h-5 w-5" /> },
    { value: "dark", label: "Dark", icon: <Icon name="Moon" className="mr-2 h-5 w-5" /> },
    { value: "system", label: "System", icon: <Icon name="Settings" className="mr-2 h-5 w-5" /> }, // Using Settings icon as a placeholder
  ];

  return (
    <>
      <PageHeader title="Appearance" description="Customize the look and feel of your application." />
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Select your preferred theme for the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={(value: string) => setTheme(value as ThemeOption)}
            className="space-y-2"
          >
            {themeOptions.map((option) => (
              <Label
                key={option.value}
                htmlFor={`theme-${option.value}`}
                className="flex items-center space-x-3 rounded-md border p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <RadioGroupItem value={option.value} id={`theme-${option.value}`} />
                {option.icon}
                <span>{option.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </>
  );
}
