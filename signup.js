import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

const emailInput = document.getElementById("signupEmail");
const passwordInput = document.getElementById("signupPassword");
const usernameInput = document.getElementById("signupUsername");
const signupBtn = document.getElementById("signupBtn");

signupBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const username = usernameInput.value.trim();

    if (!email || !password || !username) {
        alert("Please fill out all fields.");
        return;
    }

    if (username.length < 3) {
        alert("Username must be at least 3 characters.");
        return;
    }

    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create Firestore user profile
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            username: username,
            bio: "",
            location: "",
            photoURL: "",
            theme: "default",
            music: "",
            friends: [],
            friendRequests: [],
            topFriends: [],
            createdAt: serverTimestamp()
        });

        console.log("Account created:", user.uid);

        alert("Account created! Welcome to YourSpace 🎉");
        window.location.href = "feed.html";

    } catch (error) {
        console.error("Signup failed:", error);
        alert("Signup failed: " + error.message);
    }
});
