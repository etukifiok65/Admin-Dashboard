# Dashboard Architecture & Structuring

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                             │
│                      (React 19 + TypeScript)                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌─────────────┐ ┌──────────┐ ┌──────────┐
            │  Pages      │ │Components│ │  Hooks   │
            │ (8 views)   │ │ (UI)     │ │ (useAuth)│
            └─────────────┘ └──────────┘ └──────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Services Layer         │
                    ├──────────────────────────┤
                    │ • adminAuth.service      │
                    │ • adminDashboard.service │
                    │ • supabase.ts (client)   │
                    └──────────────┬────────────┘
                                   │
         ┌─────────────────────────┼──────────────────────────┐
         │                         │                          │
         ▼                         ▼                          ▼
    ┌────────────┐         ┌───────────────┐        ┌──────────────┐
    │ Supabase   │         │  PostgreSQL   │        │  Edge Func   │
    │   Auth     │         │     Database  │        │  (Optional)  │
    │            │         │               │        │              │
    │ • JWT      │         │ • admin_users │        │ • Custom     │
    │ • Sessions │         │ • RLS Policies│        │   Logic      │
    │ • Users    │         │ • Constraints │        └──────────────┘
    └────────────┘         └───────────────┘
```

---

## 🗂️ Directory Structure

```
Admin-Dashboard/
│
├── 📄 .env (✨ NEW)            ← Environment variables
├── 📄 .env.example             ← Template
├── 📄 package.json             ← Dependencies & scripts
├── 📄 vite.config.ts           ← Build configuration
├── 📄 tsconfig.json            ← TypeScript config
├── 📄 tailwind.config.js       ← CSS framework config
│
├── 📁 public/                  ← Static assets
│   ├── _headers
│   └── _redirects
│
├── 📁 src/                     ← Application source
│   │
│   ├── 📄 App.tsx              ← Root component
│   ├── 📄 index.tsx            ← Entry point
│   │
│   ├── 📁 pages/               ← Page components (8 total)
│   │   ├── LoginPage.tsx       ← Public: Login form
│   │   ├── DashboardPage.tsx   ← Protected: Main dashboard
│   │   ├── UsersPage.tsx       ← Protected: User management
│   │   ├── AnalyticsPage.tsx   ← Protected: Analytics
│   │   ├── SettingsPage.tsx    ← Protected: Settings
│   │   ├── AppointmentsPage.tsx ← Optional
│   │   ├── ProvidersPage.tsx   ← Optional
│   │   ├── FinancialPage.tsx   ← Optional
│   │   ├── VerificationsPage.tsx ← Optional
│   │   └── index.ts            ← Exports
│   │
│   ├── 📁 components/          ← Reusable UI components
│   │   ├── Header.tsx          ← Top navigation
│   │   ├── Sidebar.tsx         ← Left menu
│   │   ├── DashboardLayout.tsx ← Layout wrapper
│   │   ├── TopNavTabs.tsx      ← Tab navigation
│   │   ├── ProtectedRoute.tsx  ← Auth check
│   │   ├── RoleBasedRoute.tsx  ← Role check
│   │   ├── AddAdminModal.tsx   ← Modal forms
│   │   ├── EditAdminModal.tsx
│   │   ├── EditServiceModal.tsx
│   │   ├── ConfirmModal.tsx
│   │   └── index.ts            ← Exports
│   │
│   ├── 📁 services/            ← Backend integration
│   │   ├── supabase.ts         ← Supabase client init
│   │   ├── adminAuth.service.ts ← Login/logout logic
│   │   └── adminDashboard.service.ts ← Dashboard data
│   │
│   ├── 📁 hooks/               ← React hooks
│   │   └── useAdminAuth.ts     ← Auth state hook
│   │
│   ├── 📁 types/               ← TypeScript types
│   │   └── index.ts            ← Type definitions
│   │
│   ├── 📁 utils/               ← Helper functions
│   │   └── permissions.ts      ← Role checking
│   │
│   └── 📁 styles/              ← Stylesheets
│       └── index.css           ← Tailwind styles
│
├── 📁 supabase/                ← Backend setup
│   └── 📁 functions/           ← Edge functions
│       ├── create-admin-user/
│       └── list-admin-users/
│
└── 📁 docs/                    ← Documentation
    ├── DASHBOARD_STATUS.md     ← Status report
    ├── QUICKSTART_FINAL.md     ← Getting started
    ├── ADMIN_ROLES_GUIDE.md    ← Role explanations
    └── ...
```

---

## 🔄 Authentication Flow

```
User Action          System Process           Database Query
─────────────────────────────────────────────────────────────

LOGIN PAGE
  ↓ Enter credentials
  ├─ Email validation
  └─ Password validation
       ↓
  SUPABASE AUTH
  ├─ Authenticate user
  ├─ Generate JWT token
  └─ Return session
       ↓
  ADMIN CHECK SERVICE
  ├─ Query: SELECT * FROM admin_users 
  │         WHERE auth_id = ?
  ├─ Check is_active = true
  ├─ Validate role (admin/super_admin/moderator)
  └─ Return admin profile
       ↓
  DASHBOARD
  ├─ Load pages based on role
  ├─ Apply RLS policies
  └─ Display content
       ↓
  SESSION STORED
  ├─ JWT token in memory
  ├─ User profile in state
  └─ Ready for API calls
```

---

## 🔐 Role-Based Access Control (RBAC)

```
┌──────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                             │
└──────────────────────────────────────────────────────────────┘

SUPER_ADMIN (Level 3)
├── All dashboard pages: ✅
├── User management:     ✅
├── Settings:            ✅
├── System admin:        ✅
└── Can create admins:   ✅

ADMIN (Level 2)
├── All dashboard pages: ✅
├── User management:     ✅
├── Settings:            ✅
├── System admin:        ❌
└── Can create admins:   ❌

MODERATOR (Level 1)
├── Dashboard homepage:  ✅
├── Analytics:           ✅
├── User management:     ❌
├── Settings:            ❌
└── Can create admins:   ❌

NORMAL USER (Level 0)
├── Dashboard:           ❌ (Redirected to login)
└── Any feature:         ❌
```

---

## 📊 Database Schema

```
ADMIN_USERS TABLE
┌─────────────────────────────────────────────────┐
│ Column          │ Type        │ Constraints     │
├─────────────────┼─────────────┼─────────────────┤
│ id              │ UUID        │ PRIMARY KEY     │
│ auth_id         │ UUID        │ FOREIGN KEY ↔   │
│ email           │ TEXT        │ UNIQUE, NOT NULL│
│ name            │ TEXT        │ NOT NULL        │
│ role            │ TEXT        │ CHECK ✅        │
│ is_active       │ BOOLEAN     │ Default: true   │
│ created_at      │ TIMESTAMP   │ NOT NULL        │
│ updated_at      │ TIMESTAMP   │ NOT NULL        │
│ last_login_at   │ TIMESTAMP   │ Nullable        │
└─────────────────────────────────────────────────┘

CONSTRAINTS:
• role IN ('super_admin', 'admin', 'moderator')
• FOREIGN KEY (auth_id) → auth.users
• UNIQUE (email, auth_id)
```

```
AUTH.USERS TABLE (Supabase)
┌─────────────────────────────────────┐
│ Column    │ Type   │ Description     │
├───────────┼────────┼─────────────────┤
│ id        │ UUID   │ Primary key     │
│ email     │ TEXT   │ Login email     │
│ password  │ TEXT   │ Hashed password │
│ role      │ TEXT   │ Auth role       │
│ metadata  │ JSON   │ Custom data     │
└─────────────────────────────────────┘
```

---

## 🛡️ Security Layers

```
LAYER 1: AUTHENTICATION
├── Supabase Auth (built-in)
├── JWT token validation
└── Secure password hashing

LAYER 2: AUTHORIZATION
├── Row Level Security (RLS)
├── Role-based access control
└── Protected route components

LAYER 3: DATABASE
├── CHECK constraints
├── FOREIGN KEY constraints
├── UNIQUE constraints
└── NOT NULL constraints

LAYER 4: FRONTEND
├── Protected routes
├── Role-based routes
├── Token validation
└── Session management
```

---

## 🔄 Data Flow

```
Component → Hook (useAdminAuth)
     ↓
Service (adminAuth.service)
     ↓
Supabase Client
     ↓
PostgreSQL Database
     ↓
RLS Policy Check
     ↓
Return Data / Error
     ↓
Hook updates state
     ↓
Component re-renders
```

---

## 📡 API Endpoints (Supabase)

```
Authentication
├── POST /auth/v1/signup          ← Register new user
├── POST /auth/v1/token           ← Login
└── POST /auth/v1/logout          ← Logout

Admin Users Table
├── GET /rest/v1/admin_users      ← Read admins
├── POST /rest/v1/admin_users     ← Create admin
├── PATCH /rest/v1/admin_users    ← Update admin
└── DELETE /rest/v1/admin_users   ← Delete admin

(All requests must pass:)
├── JWT token validation
├── RLS policy checks
└── Permission validation
```

---

## 🎯 Component Hierarchy

```
App
├── LoginPage          (Public route)
│   └── Login form
│
├── ProtectedRoute     (Auth check)
│   └── DashboardLayout
│       ├── Header
│       ├── Sidebar
│       └── Page Component
│           ├── DashboardPage
│           ├── UsersPage
│           ├── AnalyticsPage
│           ├── SettingsPage
│           └── ...
│
└── RoleBasedRoute     (Role check)
    └── Limited pages (moderators)
```

---

## 📝 State Management

```
APPLICATION STATES

useAdminAuth Hook
├── user: AdminUser | null
├── isAuthenticated: boolean
├── isLoading: boolean
├── error: string | null
├── login(): Promise<boolean>
├── logout(): Promise<boolean>
└── clearError(): void

LOCAL STORAGE
├── Supabase session
└── JWT token
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│            DEVELOPMENT                          │
├─────────────────────────────────────────────────┤
│ npm run dev → Vite Dev Server (localhost:5173)  │
└─────────────────────────────────────────────────┘
                    │
                    ↓ (npm run build)
┌─────────────────────────────────────────────────┐
│            PRODUCTION                           │
├─────────────────────────────────────────────────┤
│ • Vite builds dist/                             │
│ • TypeScript compiled to JavaScript             │
│ • Assets optimized                              │
│ • Deployed to hosting (Netlify/Vercel/etc)      │
└─────────────────────────────────────────────────┘
```

---

## 📊 Current Status

```
✅ CONFIGURED
├── Environment variables
├── Supabase project
├── Database schema
├── RLS policies
├── Admin accounts
└── Frontend code

✅ READY TO USE
├── Login system
├── Protected routes
├── Role-based access
├── Dashboard pages
└── Services integrated

🟢 PRODUCTION READY
├── TypeScript compiled
├── Security hardened
├── Performance optimized
└── Documentation complete
```

---

## 🎓 Quick Reference

### To Start Development
```bash
npm install
npm run dev
```

### To Add Admin
```bash
npm run provision-admin email@example.com super_admin
```

### To Check Admin
```bash
npm run diagnose-login
```

### To Build for Production
```bash
npm run build
npm run preview
```

---

**Generated:** February 18, 2026  
**Status:** 🟢 Production Ready
