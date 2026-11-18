// Nursery Log settings
//
// In the Firebase console, open Project settings (the gear) > General > Your apps,
// and copy the "const firebaseConfig = { ... };" block. Paste it between the two
// marker lines below, replacing the example. Copy only that block, not the
// "import" lines above it or "initializeApp" below it.

// ===== Paste your firebaseConfig block below this line =====
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.firebasestorage.app",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
// ===== Paste your firebaseConfig block above this line =====

// Don't change anything below.
window.NURSERY_LOG_FIREBASE = firebaseConfig;
