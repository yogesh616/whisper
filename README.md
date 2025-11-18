# Whisper

**A modern React and Firebase-powered real-time chat application engineered for fast, secure messaging, live user status, and immersive UI customization. Ideal as a showcase for junior/full-stack developer skills or SaaS prototype work.**

***

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [App Structure](#app-structure)
- [Setup & Running](#setup--running)
- [Demo & Screenshots](#demo--screenshots)
- [Limitations](#limitations)
- [Lessons Learned](#lessons-learned)
- [Author](#author)

***

## Project Overview

Whisper delivers a full-featured real-time chat app using React for SPA architecture and Firebase (auth + Firestore) for rapid, reliable, scalable messaging. Core features include user authentication, live status indication, dynamic chat room switching, custom UI themes/fonts, profile editing, and responsive mobile-first design. All code is modular for reuse and extension.

***

## Tech Stack

- **React 18**: SPA architecture, hooks, modular components
- **Firebase Auth**: Email/password, Google login, secure signup
- **Firebase Firestore**: Real-time chat storage, user/chat state
- **CSS (modular, custom)**: login.css/index.css, themes, responsive styles
- **Third-party libraries**: Material UI icons, emoji picker, type indicator

***

## Features

- **User Authentication**
  - Sign up/login with email/password or Google.
  - Firebase Auth for secure sessions.

- **Real-Time Messaging**
  - Instant delivery via Firestore’s real-time updates.
  - Chat rooms, DMs, group threads.

- **Live User Status**
  - Active/away indication on profile/chatlist.

- **Typing Indicators**
  - See who’s currently typing in active threads.

- **Custom Themes & Fonts**
  - User-selectable color schemes, dark/light mode, and font choices.

- **Profile Management**
  - View/edit user info, avatar support.

- **Mobile-Friendly SPA**
  - Adaptive layouts, floating buttons, and responsive page routing.

***

## App Structure

```
whisper/
├── src/
│   ├── main.jsx                   # App entry, router/context setup
│   ├── index.css                  # Global/app-level styling
│   ├── firebase_config.js         # Firebase initialization
│   ├── components/
│   │   ├── Chat.jsx               # Main chat UI and logic
│   │   ├── ChatList.jsx           # Conversation sidebar/inbox
│   │   ├── FloatingButton.jsx     # Mobile/utility access
│   │   ├── Header.jsx             # Top nav/header bar
│   │   ├── Login.jsx              # Auth forms, Google/Email login
│   │   ├── Profile.jsx            # User profile management
│   │   ├── login.css              # Auth form-specific styling
├── package.json                   # App/dependencies/scripts
```

***

## Setup & Running

1. **Clone repo**
   ```
   git clone https://github.com/yogesh616/whisper.git
   cd whisper
   ```
2. **Install dependencies**
   ```
   npm install
   ```
3. **Configure Firebase**
   - Set up a Firebase project, enable Auth and Firestore.
   - Fill in credentials in `src/firebase_config.js` (see Firebase docs).
   - Add allowed sign-in methods (Google, Email/Password).

4. **Start App**
   ```
   npm run dev
   ```
   Runs SPA locally; ensure Firebase config is correct.

***

## Demo & Screenshots


***

## Limitations

- App is demo-ready, not production hardened.
- No backend API (all logic/serverless in Firebase).
- Rate limits and auth rules depend on Firebase tier.
- Advanced features (group chat, message encryption, file sharing) are not included yet.

***

## Lessons Learned

- Real-time data design with Firestore and React hooks.
- User session management and auth flows.
- Handling async status/typing indicators with backendless state.
- Modular SPA scaling and UI/UX customization.
- Deploying for mobile and desktop users.

***

## Author

[Yogesh Saini](https://github.com/yogesh616)

Solo engineered for learning, technical breadth, and SaaS prototyping.

***

