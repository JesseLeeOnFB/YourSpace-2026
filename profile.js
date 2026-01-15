// profile.js
import { auth, db, storage } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    // --- NAVIGATION BUTTONS ---
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "index.html";
        } catch (err) {
            console.error("Logout failed:", err);
        }
    });

    // --- ELEMENTS ---
    const usernameInput = document.getElementById("usernameInput");
    const locationInput = document.getElementById("locationInput");
    const bioInput = document.getElementById("bioInput");
    const musicInput = document.getElementById("musicInput");
    const profilePicInput = document.getElementById("profilePicInput");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const themeSelect = document.getElementById("themeSelect");
    const profileImage = document.getElementById("profileImage");

    // --- CHECK AUTH ---
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("You must be logged in to view your profile.");
            window.location.href = "index.html";
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            usernameInput.value = data.username || "";
            locationInput.value = data.location || "";
            bioInput.value = data.bio || "";
            musicInput.value = data.music || "";
            themeSelect.value = data.theme || "default";

            // Load profile picture
            if (data.profilePic) {
                profileImage.src = data.profilePic;
            }
        }
    });

    // --- SAVE PROFILE INFO ---
    if (saveProfileBtn) saveProfileBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) return alert("Not logged in.");

        const userRef = doc(db, "users", user.uid);

        try {
            await updateDoc(userRef, {
                username: usernameInput.value,
                location: locationInput.value,
                bio: bioInput.value,
                music: musicInput.value,
                updatedAt: serverTimestamp()
            });
            alert("Profile info saved!");
        } catch (err) {
            console.error("Save profile failed:", err);
            alert("Failed to save profile info.");
        }
    });

    // --- SAVE THEME ---
    if (saveThemeBtn) saveThemeBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) return alert("Not logged in.");

        const userRef = doc(db, "users", user.uid);
        try {
            await updateDoc(userRef, { theme: themeSelect.value });
            document.body.className = themeSelect.value;
            alert("Theme saved!");
        } catch (err) {
            console.error("Save theme failed:", err);
            alert("Failed to save theme.");
        }
    });

    // --- UPLOAD PROFILE PICTURE ---
    if (profilePicInput) profilePicInput.addEventListener("change", async () => {
        const user = auth.currentUser;
        if (!user) return alert("Not logged in.");
        const file = profilePicInput.files[0];
        if (!file) return;

        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

        try {
            const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update Firestore
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { profilePic: downloadURL });

            // Show new profile picture
            profileImage.src = downloadURL;
            alert("Profile picture updated!");
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload profile picture.");
        }
    });
});
