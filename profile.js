import { auth, db, storage } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {

    // NAV BUTTONS
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
            alert("Logout failed. Check console.");
        }
    });

    // PROFILE ELEMENTS
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicPreview = document.getElementById("profilePicPreview");
    const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
    const usernameInput = document.getElementById("usernameInput");
    const locationInput = document.getElementById("locationInput");
    const bioInput = document.getElementById("bioInput");
    const musicInput = document.getElementById("musicInput");
    const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
    const themeSelect = document.getElementById("themeSelect");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const topFriendsList = document.getElementById("topFriendsList");

    // Wait for auth state
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            usernameInput.value = data.username || "";
            locationInput.value = data.location || "";
            bioInput.value = data.bio || "";
            musicInput.value = data.music || "";
            themeSelect.value = data.theme || "default";
            profilePicPreview.src = data.profilePic || "";
            topFriendsList.innerHTML = (data.topFriends || []).map(f => `<div>${f}</div>`).join("");
        }

        // SAVE PROFILE PHOTO
        saveProfilePicBtn.addEventListener("click", async () => {
            const file = profilePicInput.files[0];
            if (!file) return alert("Select a photo first.");
            const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                await updateDoc(userRef, { profilePic: downloadURL });
                profilePicPreview.src = downloadURL;
                alert("Profile photo updated!");
            } catch (err) {
                console.error(err);
                alert("Failed to upload profile photo.");
            }
        });

        // SAVE PROFILE INFO
        saveProfileInfoBtn.addEventListener("click", async () => {
            try {
                await updateDoc(userRef, {
                    username: usernameInput.value,
                    location: locationInput.value,
                    bio: bioInput.value,
                    music: musicInput.value
                });
                alert("Profile info updated!");
            } catch (err) {
                console.error(err);
                alert("Failed to save profile info.");
            }
        });

        // SAVE THEME
        saveThemeBtn.addEventListener("click", async () => {
            try {
                await updateDoc(userRef, { theme: themeSelect.value });
                document.body.className = themeSelect.value;
                alert("Theme saved!");
            } catch (err) {
                console.error(err);
                alert("Failed to save theme.");
            }
        });
    });
});
