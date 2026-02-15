# Role-Based Access Control (RBAC) Documentation

This document outlines the role-based access control system implemented in the HomiCareplus Admin Dashboard.

## Roles & Permissions

### 1. **Super Admin** (`super_admin`)
Full access to all pages and features.

**Accessible Pages:**
- ✅ Dashboard
- ✅ Users Management
- ✅ Providers Management
- ✅ Verifications
- ✅ Appointments
- ✅ Financial
- ✅ Analytics
- ✅ **Settings** (Admin & Service Configuration)

**Capabilities:**
- Manage admin users (Add, Edit, Delete)
- Configure service types
- Platform-wide settings
- View all analytics

---

### 2. **Admin** (`admin`)
Access to most operational pages, but **no access to Settings**.

**Accessible Pages:**
- ✅ Dashboard
- ✅ Users Management
- ✅ Providers Management
- ✅ Verifications
- ✅ Appointments
- ✅ Financial
- ✅ Analytics
- ❌ Settings (Restricted)

**Capabilities:**
- Manage users and providers
- Process verifications
- Manage appointments
- View financial reports
- View analytics

---

### 3. **Moderator** (`moderator`)
Limited access to basic operational pages.

**Accessible Pages:**
- ✅ Dashboard
- ✅ Users Management
- ✅ Verifications
- ❌ Providers Management (Restricted)
- ❌ Appointments (Restricted)
- ❌ Financial (Restricted)
- ❌ Analytics (Restricted)
- ❌ Settings (Restricted)

**Capabilities:**
- View dashboard metrics
- Manage users
- Process verifications

---

## Implementation

### Key Files

1. **`src/utils/permissions.ts`** - Permission definitions and utility functions
   - `canAccessPage(user, page)` - Check if user can access a page
   - `getAccessiblePages(role)` - Get all pages accessible to a role
   - `isSuperAdmin(user)` - Check if user is super admin
   - `isAdmin(user)` - Check if user is admin or super admin

2. **`src/components/RoleBasedRoute.tsx`** - Role-based route guard
   - Applied to routes that require specific roles
   - Shows "Access Denied" message if user lacks permissions

3. **`src/components/Sidebar.tsx`** - Dynamic navigation
   - Filters navigation items based on user role
   - Only shows accessible pages to the user

4. **`src/App.tsx`** - Route definitions
   - Settings route uses `<RoleBasedRoute>` with `requiredPage="settings"`
   - Other routes use standard `<ProtectedRoute>`

### Adding Role-Based Access to New Pages

To restrict a page to specific roles:

1. Update `src/utils/permissions.ts`:
   ```typescript
   export type PagePath = 
     | 'existing_page'
     | 'new_page';  // Add new page here

   const rolePermissions: Record<UserRole, PagePath[]> = {
     super_admin: [..., 'new_page'],
     admin: [..., 'new_page'],
     moderator: [...], // Don't add if moderator shouldn't access
   };
   ```

2. Update route in `src/App.tsx`:
   ```tsx
   <Route
     path="/new-page"
     element={
       <RoleBasedRoute requiredPage="new_page">
         <NewPage />
       </RoleBasedRoute>
     }
   />
   ```

3. Update `src/components/Sidebar.tsx` (if adding to navigation):
   ```typescript
   const navItems: NavItem[] = [
     ...,
     { label: 'New Page', path: '/new-page', icon: '📄', requiredPage: 'new_page' },
   ];
   ```

### Checking Role Within Components

To conditionally render content based on role:

```tsx
import { useAdminAuth } from '@hooks/useAdminAuth';
import { isSuperAdmin, isAdmin } from '@utils/permissions';

export const MyComponent: React.FC = () => {
  const { user } = useAdminAuth();

  return (
    <>
      {isSuperAdmin(user) && (
        <div>This is only for super admins</div>
      )}
      
      {isAdmin(user) && (
        <div>This is for admins and super admins</div>
      )}
    </>
  );
};
```

---

## Access Denied Flow

When a user without proper permissions tries to access a restricted page:

1. The `RoleBasedRoute` component checks `canAccessPage(user, requiredPage)`
2. If the user lacks access, a friendly "Access Denied" page is shown with:
   - User's current role
   - Link back to dashboard
3. The restricted page is never loaded

---

## Security Notes

- Role validation happens both on the frontend (for UX) and should be enforced on the backend
- The `AdminUser` role is determined from the `admin_users` table in Supabase
- Roles cannot be escalated through the frontend
- Settings page is exclusively for `super_admin` to prevent unauthorized configuration changes
