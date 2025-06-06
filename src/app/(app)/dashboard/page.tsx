
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Simplified Dashboard" description="This is a basic dashboard test page." />
      <Card>
        <CardHeader>
          <CardTitle>Test Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">If you can see this, the simplified dashboard page is rendering.</p>
          <p className="mb-4">
            The previous complex dashboard might have runtime errors, possibly due to Firebase
            initialization or data fetching issues related to a project ID mismatch.
          </p>
          <p className="font-bold mb-2">Next Steps:</p>
          <ul className="list-disc list-inside mb-4">
            <li>VERY IMPORTANT: Check your Firebase project linking for App Hosting. The build logs show a `FIREBASE_CONFIG` for project `dfs-invoicing` while your `NEXT_PUBLIC_` variables are for `delfenceinvoice`. This mismatch is the most likely cause of runtime failures.</li>
            <li>Ensure `firebase use` is set to `delfenceinvoice` when deploying.</li>
            <li>Verify in Firebase Console &gt; App Hosting that `delfenceinvbackend` is linked to `delfenceinvoice`.</li>
            <li>Check runtime logs for `delfenceinvbackend` in Google Cloud Console (Cloud Run) for any errors.</li>
          </ul>
          <Link href="/products" passHref>
            <Button variant="outline">
              <Icon name="Package" className="mr-2 h-4 w-4" />
              Test Link to Products
            </Button>
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
