import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const displayName = document.getElementById("displayName").value.trim();

  if (!email || !password || !displayName) {
    alert("All fields are required.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: displayName });

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      displayName,
      bio: "",
      location: "",
      music: "",
      profilePic: "",
      topFriends: [],
      username: displayName.replace(/\s+/g, ''),
      createdAt: serverTimestamp(),
      friendRequests: [],
      friends: []
    });

    alert("Account created successfully!");
    window.location.href = "feed.html";
  } catch (error) {
    console.error("Signup error:", error);
    alert("Failed to create account. Check console.");
  }
});
