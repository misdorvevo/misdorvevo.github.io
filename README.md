# Co-Drop

**Drop your sounds, find new ones, and build songs together with producers everywhere.**

Co-Drop is a social network for music producers built around sharing samples. Instead of sample libraries living behind paywalls, producers upload their own sample packs under a royalty-free license, discover each other's sounds, and show off the tracks they make with them.

## What it's aiming to do

- **Share samples freely.** Upload packs of one-shots and loops, tag them (genre, type, key, BPM, emotion), and let anyone preview and download them.
- **Make music from them, together.** Share finished songs made with a pack, comment, like, and message other producers.
- **Compete for fun with Beat Battles.** Create a challenge with a hand-picked set of samples, gather people in a lobby, and race a shared timer to make the best beat.
- **Keep it safe.** Sign-in is through Google or GitHub only, so Co-Drop never stores passwords.

## Features

- **Sample packs:** upload, browse, filter, preview with waveforms, and apply live pitch/FX when auditioning.
- **Songs:** post tracks made with a pack, with likes and comments.
- **Beat Battles (`/challenges`):**
  - Anyone signed in can create a challenge with a title, prompt, timer length and samples chosen from any packs.
  - Lobby / waiting room where people join before the battle starts.
  - The timer starts when the creator starts the battle, using a server timestamp so everyone sees the same countdown.
  - Samples download and submissions open only while the timer runs; one submission per person.
- **Profiles and messaging:** bios, links, avatars, privacy controls and direct messages.
- **Journey map:** a guided path through the site's sound-making ideas.
- **Google and GitHub sign-in** with a sample-license agreement at signup.

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind CSS, and Firebase (Authentication, Firestore, Storage).

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Firebase project, then copy `env.example` to `.env.local` and fill in your web app config.

3. In the Firebase Console, enable **Google** and **GitHub** under Authentication > Sign-in method (GitHub needs an OAuth app; use the callback URL Firebase shows), and add your domains under Authorized domains.

4. Deploy the security rules:

   ```bash
   firebase deploy --only firestore:rules,storage
   ```

5. Run the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Deploying to Vercel

This repository contains one Next.js app at the repository root. Firebase Authentication, Firestore, and Storage are external services; they are not deployed as Vercel functions. Firebase Hosting configuration is separate from the Vercel deployment.

1. Import the Git repository into Vercel. Set the **Root Directory** to the repository root (`.`) and use the detected **Next.js** framework preset. Leave the install, build, and output directory overrides disabled: Vercel detects npm from `package-lock.json`, runs the Next.js build script, and handles the `.next` output and routing. No `vercel.json` or catch-all rewrite is needed.
2. In Vercel **Settings > Environment Variables**, add the Firebase web app configuration values listed in `env.example` for Production and any Preview environments you use. `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is optional; the remaining values should match your Firebase web app configuration. These `NEXT_PUBLIC_` values are included in browser bundles and must not contain secrets. Redeploy after changing them because Next.js embeds them at build time.
3. Use a Node.js version supported by both Vercel and Next.js; Vercel's default Node.js LTS setting is suitable. Deploy the project and, if desired, configure a custom domain in Vercel.
4. In Firebase Authentication, enable Google and GitHub sign-in and add the Vercel production domain, custom domain, and any preview domains used for sign-in to **Authorized domains**. Keep the Firebase `authDomain` from the web app configuration and configure GitHub's OAuth callback URL as shown in the Firebase console.
5. Deploy `firestore.rules` and `storage.rules` to the intended Firebase project separately, as described above. Verify sign-in, data access, and uploads against that project after deployment.

The homepage is `/`; Next.js also serves routes such as `/browse`, `/challenges`, `/packs/[id]`, and `/users/[uid]`. Dynamic routes require the normal Next.js deployment rather than a static export.

## Project structure

- `src/app/`: pages and routes (packs, browse, challenges, profiles, messages, account)
- `src/components/`: shared UI (header, waveform, FX controls, comments, sign-in buttons)
- `src/lib/`: Firebase setup and data helpers (`battles.ts`, `songs.ts`, `profile.ts`, `socialAuth.ts`)
- `firestore.rules`, `storage.rules`: security rules for the database and file storage

## Contributing

Issues and pull requests are welcome.
