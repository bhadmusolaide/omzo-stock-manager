'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/Auth/AuthContext';
import Button from '@/components/ui/Button';

export function UserRoles() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return <p>Loading authentication status...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Roles & Access Control</CardTitle>
          <CardDescription>
            Manage team members and their access levels. Admin integration with Supabase Auth coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100 transition-colors duration-300">
                    {user.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 transition-colors duration-300">
                    Role: {user.user_metadata?.role || 'User'} {/* Placeholder for actual role */}
                  </p>
                </div>
                <Button onClick={signOut}>Logout</Button>
              </div>
            </div>
          ) : (
            <p>You are not logged in. Please log in to manage user roles.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Overview of permissions for each role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2 transition-colors duration-300">Admin</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-1 transition-colors duration-300">
                <li>✓ Full access to all features</li>
                <li>✓ Create, edit, delete batches</li>
                <li>✓ Manage transactions and orders</li>
                <li>✓ Access reports and analytics</li>
                <li>✓ Configure settings</li>
                <li>✓ Manage user roles</li>
              </ul>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2 transition-colors duration-300">Worker</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-1 transition-colors duration-300">
                <li>✓ View batches and transactions</li>
                <li>✓ Create orders and feed purchases</li>
                <li>✓ Record mortality and feed usage</li>
                <li>✗ Cannot delete records</li>
                <li>✗ Cannot access settings</li>
                <li>✗ Cannot manage users</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

