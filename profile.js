// profile.js
document.addEventListener("DOMContentLoaded", async () => {
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
        } catch(err) {
            console.error("Logout failed:", err);
            alert("Failed to logout. Check console.");
        }
    });

    // PROFILE ELEMENTS
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicImg = document.getElementById("profilePicImg");
    const displayNameInput = document.getElementById("displayName");
    const usernameInput = document.getElementById("username");
    const bioInput = document.getElementById("bio");
    const locationInput = document.getElementById("location");
    const musicInput = document.getElementById("music");
    const themeSelect = document.getElementById("themeSelect");
    const topFriendsInput = document.getElementById("topFriendsInput");

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const saveMusicBtn = document.getElementById("saveMusicBtn");

    if (!auth.currentUser) {
        alert("You must be logged in to view your profile.");
        window.location.href = "index.html";
        return;
    }

    const userRef = doc(db, "users", auth.currentUser.uid);

    // LOAD PROFILE DATA
    const loadProfile = async () => {
        try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                displayNameInput.value = data.displayName || "";
                usernameInput.value = data.username || "";
                bioInput.value = data.bio || "";
                locationInput.value = data.location || "";
                musicInput.value = data.music || "";
                themeSelect.value = data.theme || "default";
                topFriendsInput.value = (data.topFriends || []).join(", ");

                if (data.profilePic) profilePicImg.src = data.profilePic;
                else profilePicImg.src = "default_profile.png"; // fallback
            }
        } catch(err) {
            console.error("Failed to load profile:", err);
        }
    };

    await loadProfile();

    // SAVE PROFILE DATA
    if (saveProfileBtn) saveProfileBtn.addEventListener("click", async () => {
        try {
            const topFriendsArray = topFriendsInput.value.split(",").map(f => f.trim()).filter(f => f);
            await setDoc(userRef, {
                displayName: displayNameInput.value,
                username: usernameInput.value,
                bio: bioInput.value,
                location: locationInput.value,
                topFriends: topFriendsArray
            }, { merge: true });
            alert("Profile saved successfully!");
        } catch(err) {
            console.error("Failed to save profile:", err);
            alert("Failed to save profile. Check console.");
        }
    });

    // SAVE THEME
    if (saveThemeBtn) saveThemeBtn.addEventListener("click", async () => {
        try {
            await setDoc(userRef, { theme: themeSelect.value }, { merge: true });
            document.body.className = themeSelect.value;
            alert("Theme saved!");
        } catch(err) {
            console.error("Failed to save theme:", err);
            alert("Failed to save theme. Check console.");
        }
    });

    // SAVE MUSIC
    if (saveMusicBtn) saveMusicBtn.addEventListener("click", async () => {
        try {
            await setDoc(userRef, { music: musicInput.value }, { merge: true });
            alert("Music saved!");
            // Optionally, update player here
        } catch(err) {
            console.error("Failed to save music:", err);
            alert("Failed to save music. Check console.");
        }
    });

    // UPLOAD PROFILE PICTURE
    if (profilePicInput) profilePicInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            profilePicImg.src = downloadURL;
            await setDoc(userRef, { profilePic: downloadURL }, { merge: true });
            alert("Profile picture updated!");
        } catch(err) {
            console.error("Failed to upload profile picture:", err);
            alert("Failed to upload profile picture. Check console.");
        }
    });
});
