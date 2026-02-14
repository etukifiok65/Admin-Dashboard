# Admin Dashboard Development Guide

## Project Overview

The HomiCare Admin Dashboard is built with React, TypeScript, Vite, and TailwindCSS. It communicates with the same Supabase backend as the mobile app while providing administrative capabilities.

## Architecture

### Component Structure

```
components/
├── Header.tsx           # Top navigation bar
├── Sidebar.tsx          # Navigation menu
├── DashboardLayout.tsx  # Main layout wrapper
├── ProtectedRoute.tsx   # Authentication guard
└── index.ts            # Barrel export
```

### Pages Structure

```
pages/
├── LoginPage.tsx        # Admin login
├── DashboardPage.tsx    # Main dashboard with metrics
├── UsersPage.tsx        # Patient management
├── ProvidersPage.tsx    # Provider management
├── AppointmentsPage.tsx # Appointment management
├── FinancialPage.tsx    # Revenue & payouts
├── AnalyticsPage.tsx    # Analytics & reports
├── SettingsPage.tsx     # Platform settings
└── index.ts            # Barrel export
```

### Services Structure

```
services/
├── supabase.ts                   # Supabase client setup
├── adminAuth.service.ts          # Admin authentication
├── adminDashboard.service.ts     # Dashboard data fetching
└── (future) admin*.service.ts   # Domain-specific services
```

## Development Workflow

### 1. Adding a New Page

Create a new feature page:

```typescript
// src/pages/MyFeaturePage.tsx
import React from 'react';
import { DashboardLayout } from '@components/DashboardLayout';

export const MyFeaturePage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Feature</h1>
          <p className="text-gray-600 mt-2">Description</p>
        </div>
        
        {/* Page content */}
      </div>
    </DashboardLayout>
  );
};
```

Add to pages/index.ts:
```typescript
export * from './MyFeaturePage';
```

Add route in App.tsx:
```typescript
<Route
  path="/my-feature"
  element={
    <ProtectedRoute>
      <MyFeaturePage />
    </ProtectedRoute>
  }
/>
```

Update Sidebar.tsx:
```typescript
const navItems: NavItem[] = [
  // ...
  { label: 'My Feature', path: '/my-feature', icon: '✨' },
];
```

### 2. Creating a Service

Services handle API communication:

```typescript
// src/services/myFeature.service.ts
import { supabase } from './supabase';
import { MyFeatureItem } from '@types/index';

class MyFeatureService {
  async getItems(): Promise<MyFeatureItem[] | null> {
    try {
      const { data, error } = await supabase
        .from('my_table')
        .select('*');

      if (error) throw error;
      return data as MyFeatureItem[];
    } catch (err) {
      console.error('Error fetching items:', err);
      return null;
    }
  }

  async createItem(item: MyFeatureItem): Promise<MyFeatureItem | null> {
    try {
      const { data, error } = await supabase
        .from('my_table')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data as MyFeatureItem;
    } catch (err) {
      console.error('Error creating item:', err);
      return null;
    }
  }
}

export const myFeatureService = new MyFeatureService();
```

### 3. Adding Types

Add new types to types/index.ts:

```typescript
export interface MyFeatureItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}
```

### 4. Using Hooks

Create custom hooks for state management:

```typescript
// src/hooks/useMyFeature.ts
import { useState, useEffect } from 'react';
import { MyFeatureItem } from '@types/index';
import { myFeatureService } from '@services/myFeature.service';

export const useMyFeature = () => {
  const [items, setItems] = useState<MyFeatureItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    const result = await myFeatureService.getItems();
    if (result) {
      setItems(result);
    } else {
      setError('Failed to load items');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { items, isLoading, error, refetch: fetchItems };
};
```

## Common Patterns

### Data Fetching with Loading State

```typescript
const [data, setData] = useState<DataType | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await myService.getData();
      if (result) {
        setData(result);
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, []);
```

### Pagination

```typescript
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 10;

const { data: response } = await myService.getItems({
  page,
  pageSize: ITEMS_PER_PAGE,
});

const handleNextPage = () => {
  if (response && page * ITEMS_PER_PAGE < response.total) {
    setPage(page + 1);
  }
};
```

### Form Handling

```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
});
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrors({});

  // Validate
  if (!formData.name) {
    setErrors(prev => ({ ...prev, name: 'Name required' }));
    return;
  }

  // Submit
  const result = await myService.create(formData);
  if (result) {
    // Success
  }
};
```

### Table Component

```typescript
<table className="w-full">
  <thead className="bg-gray-50 border-b">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
        Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
        Status
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
        Actions
      </th>
    </tr>
  </thead>
  <tbody className="divide-y">
    {items.map((item) => (
      <tr key={item.id} className="hover:bg-gray-50">
        <td className="px-6 py-4">{item.name}</td>
        <td className="px-6 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {item.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <button className="text-blue-600 hover:text-blue-800">Edit</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

## Styling Guidelines

### Color Scheme

Use TailwindCSS color utilities:

```typescript
// Primary (Blue)
<div className="bg-blue-600 text-white">Primary</div>

// Success (Green)
<div className="bg-green-100 text-green-800">Success</div>

// Warning (Yellow)
<div className="bg-yellow-100 text-yellow-800">Warning</div>

// Error (Red)
<div className="bg-red-100 text-red-800">Error</div>

// Neutral (Gray)
<div className="bg-gray-100 text-gray-800">Neutral</div>
```

### Responsive Design

```typescript
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
</div>
```

### Spacing

Use consistent spacing:

```typescript
<div className="space-y-6">  {/* Large vertical gap */}
  <div className="space-y-4"> {/* Medium vertical gap */}
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
</div>
```

## Testing

### Running Type Checks

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Debugging

### Browser DevTools

1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for API requests
4. Check Application > Local Storage for auth token

### React DevTools

Install React DevTools extension to inspect component tree and state.

### Supabase Logs

View logs in Supabase Dashboard:
1. Go to Supabase > Logs > Database Queries
2. Check for RLS policy errors
3. Monitor slow queries

## Performance Tips

1. **Lazy load pages**: Use React.lazy() for route-based code splitting
2. **Memoize expensive computations**: Use useMemo()
3. **Avoid inline functions**: Define handlers outside render
4. **Use pagination**: Don't load all data at once
5. **Optimize images**: Use appropriate formats and sizes

## Security Best Practices

1. **Never hardcode secrets**: Use environment variables
2. **Validate input**: Check user input before sending to API
3. **Use HTTPS**: Always use secure connections
4. **Rotate credentials**: Change admin passwords periodically
5. **Monitor activity**: Review admin action logs regularly

## Troubleshooting Common Issues

### "Admin user not found" error
1. Check admin_users table has correct auth_id
2. Verify is_active = TRUE
3. Check Supabase auth logs

### RLS policy violations
1. Check policy syntax
2. Verify auth.uid() returns correct user ID
3. Test with simpler query first

### Styling not applying
1. Check TailwindCSS is compiled
2. Verify class names are correct
3. Clear browser cache
4. Check for conflicting styles

### Data not loading
1. Check Supabase connection
2. Verify RLS policies allow access
3. Check browser console for errors
4. Verify table exists in database
