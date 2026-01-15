// profile.js - Standalone for YourSpace Profile Page
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

// =====================
// CONFIG
// =====================
const firebaseConfig = {
    apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
    authDomain: "yourspace-2026.firebaseapp.com",
    projectId: "yourspace-2026",
    storageBucket: "yourspace-2026.firebasestorage.app",
    messagingSenderId: "72667267302",
    appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
    measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =====================
// DOM ELEMENTS
// =====================
const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const themeSelect = document.getElementById("themeSelect");

// NAV buttons
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// =====================
// NAVIGATION
// =====================
if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (err) {
        console.error("Logout failed:", err);
        alert("Failed to logout. Check console.");
    }
});

// =====================
// LOAD PROFILE DATA
// =====================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("You must be signed in.");
        window.location.href = "index.html";
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();

        usernameInput.value = data.username || "";
        bioInput.value = data.bio || "";
        locationInput.value = data.location || "";
        musicInput.value = data.music || "";
        themeSelect.value = data.theme || "default";

        if (data.profilePic) {
            profilePicPreview.src = data.profilePic;
        }
    }
});

// =====================
// SAVE PROFILE INFO
// =====================
if (saveProfileBtn) saveProfileBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not signed in");

    const userDocRef = doc(db, "users", user.uid);

    try {
        await setDoc(userDocRef, {
            username: usernameInput.value,
            bio: bioInput.value,
            location: locationInput.value,
            music: musicInput.value,
            theme: themeSelect.value,
            updatedAt: serverTimestamp()
        }, { merge: true });

        alert("Profile updated successfully!");
    } catch (err) {
        console.error("Failed to save profile:", err);
        alert("Failed to save profile. Check console.");
    }
});

// =====================
// SAVE THEME
// =====================
if (saveThemeBtn) saveThemeBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not signed in");

    const userDocRef = doc(db, "users", user.uid);

    try {
        await updateDoc(userDocRef, {
            theme: themeSelect.value
        });

        document.body.className = themeSelect.value;
        alert("Theme updated!");
    } catch (err) {
        console.error("Failed to save theme:", err);
        alert("Failed to save theme. Check console.");
    }
});

// =====================
// UPLOAD PROFILE PIC
// =====================
if (profilePicInput) profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return alert("Not signed in");

    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        profilePicPreview.src = downloadURL;

        // Save URL to Firestore
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { profilePic: downloadURL });

        alert("Profile picture updated!");
    } catch (err) {
        console.error("Profile pic upload failed:", err);
        alert("Failed to upload profile picture. Check console.");
    }
});
