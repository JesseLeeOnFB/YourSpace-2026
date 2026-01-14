// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Sign Up
document.getElementById("signupBtn").addEventListener("click", async () => {
  const username = document.getElementById("signupUsername").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!username || !email || !password) return alert("All fields are required");

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection("users").doc(user.uid).set({
      username: username,
      bio: "",
      location: "",
      music: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Sign up successful!");
    window.location.href = "feed.html";
  } catch (err) {
    console.error(err);
    alert("Sign up failed: " + err.message);
  }
});

// Log In
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) return alert("Please enter both email and password");

  try {
    await auth.signInWithEmailAndPassword(email, password);
    alert("Login successful!");
    window.location.href = "feed.html";
  } catch (err) {
    console.error(err);
    alert("Login failed: " + err.message);
  }
});
