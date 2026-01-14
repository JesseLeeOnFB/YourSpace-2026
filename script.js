// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* -------------------- Firebase Init -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* -------------------- DOM -------------------- */
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username");

/* -------------------- SIGNUP -------------------- */
signupBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const displayName = usernameInput.value.trim();

  if (!email || !password || !displayName) return alert("Fill all fields!");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName });

    // Create Firestore profile
    await setDoc(doc(db, "users", userCred.user.uid), {
      displayName,
      bio: "",
      location: "",
      profileHTML: "",
      profileTheme: "",
      profileMusicURL: "",
      createdAt: serverTimestamp()
    });

    alert("Account created! Redirecting to feed...");
    window.location.href = "feed.html";

  } catch (err) {
    console.error("Signup failed:", err);
    alert(err.message);
  }
};

/* -------------------- LOGIN -------------------- */
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert("Enter email and password!");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "feed.html";
  } catch (err) {
    console.error("Login failed:", err);
    alert(err.message);
  }
};
