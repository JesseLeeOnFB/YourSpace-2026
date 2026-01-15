// profile.js
import { auth, db, storage } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
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

    // PROFILE INPUTS & BUTTONS
    const usernameInput = document.getElementById("usernameInput");
    const locationInput = document.getElementById("locationInput");
    const bioInput = document.getElementById("bioInput");
    const musicInput = document.getElementById("musicInput");
    const themeSelect = document.getElementById("themeSelect");
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicPreview = document.getElementById("profilePicPreview");
    const topFriendsList = document.getElementById("topFriendsList");
    const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
    const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
    const saveThemeBtn = document.getElementById("saveThemeBtn");

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let data;
        if (!userSnap.exists()) {
            // Create default user doc if missing
            await setDoc(userRef, {
                username: user.email.split("@")[0],
                bio: "",
                location: "",
                music: "",
                profilePic: "",
                theme: "default",
                topFriends: [],
                createdAt: serverTimestamp()
            });
            data = {
                username: user.email.split("@")[0],
                bio: "",
                location: "",
                music: "",
                profilePic: "",
                theme: "default",
                topFriends: []
            };
        } else {
            data = userSnap.data();
        }

        // Populate inputs
        if (usernameInput) usernameInput.value = data.username || "";
        if (locationInput) locationInput.value = data.location || "";
        if (bioInput) bioInput.value = data.bio || "";
        if (musicInput) musicInput.value = data.music || "";
        if (themeSelect) themeSelect.value = data.theme || "default";
        if (profilePicPreview) profilePicPreview.src = data.profilePic || "";
        if (topFriendsList) {
            topFriendsList.innerHTML = (data.topFriends || []).map(f => `<div>${f}</div>`).join("");
        }

        // SAVE PROFILE PHOTO
        if (saveProfilePicBtn) saveProfilePicBtn.onclick = async () => {
            const file = profilePicInput.files[0];
            if (!file) return alert("Select a photo first.");
            const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                await updateDoc(userRef, { profilePic: downloadURL });
                if (profilePicPreview) profilePicPreview.src = downloadURL;
                alert("Profile photo updated!");
            } catch (err) {
                console.error(err);
                alert("Failed to upload profile photo.");
            }
        };

        // SAVE PROFILE INFO
        if (saveProfileInfoBtn) saveProfileInfoBtn.onclick = async () => {
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
        };

        // SAVE THEME
        if (saveThemeBtn) saveThemeBtn.onclick = async () => {
            try {
                await updateDoc(userRef, { theme: themeSelect.value });
                document.body.className = themeSelect.value;
                alert("Theme saved!");
            } catch (err) {
                console.error(err);
                alert("Failed to save theme.");
            }
        };
    });
});
