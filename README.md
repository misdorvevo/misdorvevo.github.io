# SampleShare - Music Sample Social Network

A modern web application for sharing and discovering music samples, inspired by Splice. Built with Next.js, TypeScript, Tailwind CSS, and Firebase.

## Features

- User authentication (sign up/login)
- Upload and share sample packs
- Browse and preview samples
- Download functionality
- Modern dark UI design

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password
3. Enable Firestore Database:
   - Go to Firestore Database > Create database
   - Choose "Start in test mode" for development
4. Enable Storage:
   - Go to Storage > Get started
   - Choose "Start in test mode" for development
5. Get your Firebase config:
   - Go to Project settings > General > Your apps
   - Click "Add app" > Web app
   - Copy the config object
6. Update `src/lib/firebase.ts` with your actual config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2. Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Using the Application

- **Sign Up/Login**: Create an account or log in
- **Upload Samples**: Go to /upload, select audio files, add pack details
- **Browse Samples**: View uploaded packs at /browse, download individual files
- **View Packs**: See pack overview at /packs

### Features Implemented

- ✅ User authentication (Firebase Auth)
- ✅ File upload to Firebase Storage
- ✅ Metadata storage in Firestore
- ✅ Browse and download samples
- ✅ Responsive modern UI

### Security Notes

- Currently in test mode - update Firestore and Storage rules for production
- Add proper error handling and validation as needed
- Consider adding file type/size limits

## Project Structure

- `src/app/` - Next.js app router pages
- `src/components/` - Reusable React components
- `src/lib/` - Firebase configuration and utilities

## Technologies Used

- Next.js 16
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Storage)

## Contributing

Feel free to contribute to this project by opening issues or submitting pull requests.

## License

This project is open source and available under the [MIT License](LICENSE).
