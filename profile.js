// profile.js

document.addEventListener("DOMContentLoaded", () => {
    // ======================
    // NAVIGATION BUTTONS
    // ======================
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) {
        homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    }
    if (profileBtn) {
        profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    }
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await auth.signOut();
                window.location.href = "index.html";
            } catch (err) {
                console.error("Logout failed:", err);
                alert("Logout failed. Check console.");
            }
        });
    }

    // ======================
    // ELEMENTS
    // ======================
    const bioInput = document.getElementById("bioInput");
    const locationInput = document.getElementById("locationInput");
    const musicInput = document.getElementById("musicInput");
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicDisplay = document.getElementById("profilePicDisplay");
    const themeSelect = document.getElementById("themeSelect");
    const topFriendsInput = document.getElementById("topFriendsInput");

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const saveMusicBtn = document.getElementById("saveMusicBtn");

    // ======================
    // LOAD PROFILE DATA
    // ======================
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId);

    async function loadProfile() {
        try {
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) return;

            const data = docSnap.data();

            bioInput.value = data.bio || "";
            locationInput.value = data.location || "";
            musicInput.value = data.music || "";
            themeSelect.value = data.theme || "default";
            topFriendsInput.value = data.topFriends || "";

            if (data.profilePic) {
                profilePicDisplay.src = data.profilePic;
            } else {
                profilePicDisplay.src = "defaultProfile.png"; // placeholder
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
        }
    }

    loadProfile();

    // ======================
    // SAVE PROFILE INFO
    // ======================
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            try {
                await setDoc(userDocRef, {
                    bio: bioInput.value,
                    location: locationInput.value,
                    topFriends: topFriendsInput.value
                }, { merge: true });
                alert("Profile saved!");
            } catch (err) {
                console.error("Failed to save profile:", err);
                alert("Failed to save profile.");
            }
        });
    }

    // ======================
    // SAVE THEME
    // ======================
    if (saveThemeBtn) {
        saveThemeBtn.addEventListener("click", async () => {
            try {
                await setDoc(userDocRef, { theme: themeSelect.value }, { merge: true });
                document.body.className = themeSelect.value;
                alert("Theme saved!");
            } catch (err) {
                console.error("Failed to save theme:", err);
                alert("Failed to save theme.");
            }
        });
    }

    // ======================
    // SAVE MUSIC
    // ======================
    if (saveMusicBtn) {
        saveMusicBtn.addEventListener("click", async () => {
            try {
                await setDoc(userDocRef, { music: musicInput.value }, { merge: true });
                alert("Music link saved!");
                // Optional: update iframe or embedded player
                const musicPlayer = document.getElementById("musicPlayer");
                if (musicPlayer) musicPlayer.src = musicInput.value;
            } catch (err) {
                console.error("Failed to save music:", err);
                alert("Failed to save music.");
            }
        });
    }

    // ======================
    // PROFILE PICTURE UPLOAD
    // ======================
    if (profilePicInput) {
        profilePicInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const storageRef = ref(storage, `profileImages/${userId}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                profilePicDisplay.src = downloadURL;

                await setDoc(userDocRef, { profilePic: downloadURL }, { merge: true });
                alert("Profile picture updated!");
            } catch (err) {
                console.error("Failed to upload profile picture:", err);
                alert("Profile picture upload failed.");
            }
        });
    }
});
