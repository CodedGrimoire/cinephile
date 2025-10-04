# Firestore Setup Guide

## Issues Fixed
1. **"Missing or insufficient permissions"** - Firestore security rules blocking access
2. **"The query requires an index"** - Missing composite index for friendRequests collection

## Solution

### Step 1: Deploy Simplified Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cinephile-e1055`
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with this simplified version:
   ```javascript
   rules_version = '2';
   
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow all authenticated users to read/write for development
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
5. Click **Publish**

### Step 2: Create Required Index

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cinephile-e1055`
3. Go to **Firestore Database** → **Indexes**
4. Click **Create Index**
5. Set up the composite index:
   - **Collection ID**: `friendRequests`
   - **Fields**:
     - `status` (Ascending)
     - `toUserEmail` (Ascending) 
     - `createdAt` (Descending)
6. Click **Create**

### Step 3: Deploy Indexes (Optional - via CLI)

If you have Firebase CLI set up:

```bash
cd /Users/tazkia/Documents/GitHub/cinephile
firebase deploy --only firestore:indexes
```

## What These Changes Do

### Security Rules
- **Simplified**: Allows all authenticated users to read/write
- **Development-friendly**: No complex permission checks
- **TODO**: Implement proper security rules for production

### Composite Index
- **Required for**: Friend requests queries with multiple where clauses
- **Fields**: status + toUserEmail + createdAt
- **Purpose**: Enables efficient querying of friend requests

## After Setup

Once both the rules and index are deployed, your friends system should work:

✅ Send friend requests  
✅ Accept/decline friend requests  
✅ View friends list  
✅ See movie matches  
✅ Receive notifications  

## Production Security (Future)

For production, implement proper security rules that:
- Restrict users to their own data
- Validate friend relationships
- Secure notification access
- Protect user privacy
