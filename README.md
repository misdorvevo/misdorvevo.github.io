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

## Project structure

- `src/app/`: pages and routes (packs, browse, challenges, profiles, messages, account)
- `src/components/`: shared UI (header, waveform, FX controls, comments, sign-in buttons)
- `src/lib/`: Firebase setup and data helpers (`battles.ts`, `songs.ts`, `profile.ts`, `socialAuth.ts`)
- `firestore.rules`, `storage.rules`: security rules for the database and file storage

## Contributing

Issues and pull requests are welcome.
