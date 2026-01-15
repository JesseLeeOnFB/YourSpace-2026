import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const signupForm = document.getElementById("signupForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Create user document in Firestore
    await setDoc(doc(db, "users", uid), {
      username: email.split("@")[0],
      displayName: "Anonymous",
      bio: "",
      location: "",
      theme: "default",
      profilePic: "",
      music: "",
      topFriends: [],
      friendRequests: [],
      friends: [],
      createdAt: serverTimestamp()
    });

    alert("Account created! Redirecting to feed...");
    window.location.replace("feed.html");
  } catch (err) {
    console.error("Sign up error:", err);
    alert("Sign up failed: " + err.message);
  }
});
