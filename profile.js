import { auth, db, storage } from './firestore.js';
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "index.html"; // redirect if not logged in
        return;
    }

    const profileDocRef = doc(db, "users", user.uid);
    const profileDataSnap = await getDoc(profileDocRef);

    // Elements
    const usernameInput = document.getElementById("usernameInput");
    const bioInput = document.getElementById("bioInput");
    const locationInput = document.getElementById("locationInput");
    const musicInput = document.getElementById("musicInput");
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicImg = document.getElementById("profilePicImg");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const saveThemeBtn = document.getElementById("saveThemeBtn");

    // NAVIGATION BUTTONS
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try {
            await auth.signOut();
            alert("Logged out successfully.");
            window.location.href = "index.html";
        } catch (err) {
            console.error("Logout failed:", err);
            alert("Failed to logout. Check console.");
        }
    });

    // Load existing data
    if (profileDataSnap.exists()) {
        const data = profileDataSnap.data();
        usernameInput.value = data.username || "";
        bioInput.value = data.bio || "";
        locationInput.value = data.location || "";
        musicInput.value = data.music || "";
        if (data.profilePic) profilePicImg.src = data.profilePic;
        if (data.theme) document.body.className = data.theme;
    }

    // Save profile info (username, bio, location, music)
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            try {
                await updateDoc(profileDocRef, {
                    username: usernameInput.value,
                    bio: bioInput.value,
                    location: locationInput.value,
                    music: musicInput.value,
                    updatedAt: serverTimestamp()
                });
                alert("Profile info saved!");
            } catch (err) {
                console.error("Failed to save profile:", err);
                alert("Failed to save profile.");
            }
        });
    }

    // Save theme
    if (saveThemeBtn) {
        saveThemeBtn.addEventListener("click", async () => {
            const selectedTheme = document.getElementById("themeSelect").value;
            document.body.className = selectedTheme;
            try {
                await updateDoc(profileDocRef, { theme: selectedTheme });
                alert("Theme updated!");
            } catch (err) {
                console.error("Failed to save theme:", err);
                alert("Failed to save theme.");
            }
        });
    }

    // Profile picture upload
    if (profilePicInput) {
        profilePicInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
            try {
                await uploadBytes(storageRef, file, { contentType: file.type });
                const downloadURL = await getDownloadURL(storageRef);
                profilePicImg.src = downloadURL;
                await updateDoc(profileDocRef, { profilePic: downloadURL });
                alert("Profile picture updated!");
            } catch (err) {
                console.error("Failed to upload profile picture:", err);
                alert("Failed to upload profile picture.");
            }
        });
    }
});
