# Creating the first admin

There's no Firebase Admin SDK / service account key in this project, so there's no
programmatic way to create the very first admin — it's a one-time manual step. After
that, further admins are promoted in-app (see `/admin/administratorer`, added in
Phase 2) and this doc is no longer needed.

1. Firebase Console → Authentication → Users → **Add user**. Enter an email and
   password. Once created, copy the **User UID** shown in the users list.
2. Firebase Console → Firestore Database → **Start collection**.
   - Collection ID: `users`
   - Document ID: paste the exact UID from step 1 (do **not** let it auto-generate
     one — the doc ID has to be the uid, since that's what the security rules and
     the Cloudinary signing route rely on).
   - Fields:
     - `email` (string) — same email as the auth account
     - `role` (string) — exactly `admin`
     - `createdAt` (timestamp) — current time
3. Save. That account can now log in at `/admin/login` and will resolve as an admin.

# Deploying Firestore rules

```
pnpm exec firebase login      # one-time, opens a browser to authenticate
pnpm exec firebase use --add  # one-time, links this repo to the Firebase project
pnpm exec firebase deploy --only firestore:rules
```
