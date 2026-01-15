document.addEventListener("DOMContentLoaded", () => {
    // ================= FIRESTORE / STORAGE REFERENCES =================
    // Assuming firebase initialized elsewhere (firebase.js if you kept it)
    const db = firebase.firestore();
    const storage = firebase.storage();
    const auth = firebase.auth();

    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to view your profile.");
        window.location.href = "index.html";
        return;
    }

    const uid = user.uid;

    // ================= DOM ELEMENTS =================
    const profilePhotoImg = document.getElementById("profilePhotoDisplay");
    const profilePhotoInput = document.getElementById("profilePhotoInput");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const bioInput = document.getElementById("bioInput");
    const locationInput = document.getElementById("locationInput");
    const musicInput = document.getElementById("musicInput");
    const usernameInput = document.getElementById("usernameInput");
    const topFriendsInput = document.getElementById("topFriendInput");
    const addTopFriendBtn = document.getElementById("addTopFriendBtn");
    const topFriendsList = document.getElementById("topFriendsList");
    const themeSelect = document.getElementById("themeSelect");

    // ================= LOAD PROFILE DATA =================
    async function loadProfile() {
        try {
            const doc = await db.collection("users").doc(uid).get();
            if (!doc.exists) return;

            const data = doc.data();

            // Load text fields
            bioInput.value = data.bio || "";
            locationInput.value = data.location || "";
            musicInput.value = data.music || "";
            usernameInput.value = data.username || "";

            // Load theme
            if (data.theme) document.body.className = data.theme;
            if (themeSelect) themeSelect.value = data.theme || "default";

            // Load top friends
            topFriendsList.innerHTML = "";
            if (data.topFriends && data.topFriends.length > 0) {
                data.topFriends.forEach(friend => {
                    const li = document.createElement("li");
                    li.textContent = friend;
                    topFriendsList.appendChild(li);
                });
            }

            // Load profile photo
            if (data.profilePic) profilePhotoImg.src = data.profilePic;
        } catch (err) {
            console.error("Failed to load profile:", err);
            alert("Error loading profile. Check console.");
        }
    }

    loadProfile();

    // ================= NAVIGATION BUTTONS =================
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => { window.location.href = "feed.html"; });
    if (profileBtn) profileBtn.addEventListener("click", () => { window.location.href = "profile.html"; });
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "index.html";
        } catch (err) {
            console.error("Logout failed:", err);
            alert("Failed to logout.");
        }
    });

    // ================= SAVE PROFILE INFO =================
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            try {
                await db.collection("users").doc(uid).update({
                    bio: bioInput.value,
                    location: locationInput.value,
                    music: musicInput.value,
                    username: usernameInput.value
                });
                alert("Profile saved successfully!");
            } catch (err) {
                console.error("Failed to save profile info:", err);
                alert("Failed to save profile info.");
            }
        });
    }

    // ================= SAVE THEME =================
    if (saveThemeBtn) {
        saveThemeBtn.addEventListener("click", async () => {
            try {
                const selectedTheme = themeSelect.value || "default";
                document.body.className = selectedTheme;

                await db.collection("users").doc(uid).update({
                    theme: selectedTheme
                });
                alert("Theme updated!");
            } catch (err) {
                console.error("Failed to save theme:", err);
                alert("Failed to save theme.");
            }
        });
    }

    // ================= CHANGE PROFILE PHOTO =================
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener("change", async () => {
            const file = profilePhotoInput.files[0];
            if (!file) return;

            const storageRef = storage.ref(`profileImages/${uid}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();

                await db.collection("users").doc(uid).update({
                    profilePic: downloadURL
                });

                profilePhotoImg.src = downloadURL;
                alert("Profile picture updated!");
            } catch (err) {
                console.error("Failed to upload profile picture:", err);
                alert("Failed to update profile picture.");
            }
        });
    }

    // ================= ADD TOP FRIEND =================
    if (addTopFriendBtn) {
        addTopFriendBtn.addEventListener("click", async () => {
            const friendName = topFriendsInput.value.trim();
            if (!friendName) return;

            try {
                const docRef = db.collection("users").doc(uid);
                await docRef.update({
                    topFriends: firebase.firestore.FieldValue.arrayUnion(friendName)
                });

                const li = document.createElement("li");
                li.textContent = friendName;
                topFriendsList.appendChild(li);
                topFriendsInput.value = "";
            } catch (err) {
                console.error("Failed to add top friend:", err);
                alert("Failed to add top friend.");
            }
        });
    }
});
