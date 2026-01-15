import { auth, db, storage } from "./firestore.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";

// Wait until auth state is ready
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "index.html"; // not logged in
        return;
    }

    const userId = user.uid;

    // ---------------- DOM ELEMENTS ----------------
    const profilePhoto = document.getElementById("profilePhoto");
    const profilePicInput = document.getElementById("profilePicInput");
    const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
    const usernameInput = document.getElementById("usernameInput");
    const locationInput = document.getElementById("locationInput");
    const bioInput = document.getElementById("bioInput");
    const musicInput = document.getElementById("musicInput");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const themeSelect = document.getElementById("themeSelect");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const topFriendsList = document.getElementById("topFriendsList");
    const editTopFriendInput = document.getElementById("editTopFriendInput");
    const saveTopFriendBtn = document.getElementById("saveTopFriendBtn");
    const searchUserInput = document.getElementById("searchUserInput");
    const searchUserBtn = document.getElementById("searchUserBtn");
    const searchResults = document.getElementById("searchResults");
    const musicPlayer = document.getElementById("musicPlayer");

    // ---------------- LOAD USER DATA ----------------
    async function loadUserProfile() {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (!userDoc.exists()) return;

            const data = userDoc.data();
            usernameInput.value = data.username || "";
            locationInput.value = data.location || "";
            bioInput.value = data.bio || "";
            themeSelect.value = data.theme || "";
            editTopFriendInput.value = "";
            musicInput.value = data.music || "";
            topFriendsList.innerHTML = (data.topFriends || []).map(u => `<div>${u}</div>`).join("");
            profilePhoto.src = data.profilePic || "defaultProfile.png";
            musicPlayer.src = data.music || "";
            if (data.theme) document.body.className = data.theme;
        } catch (err) {
            console.error("Error loading profile:", err);
        }
    }

    loadUserProfile();

    // ---------------- NAV BUTTONS ----------------
    document.getElementById("homeBtn")?.addEventListener("click", () => window.location.href = "feed.html");
    document.getElementById("profileBtn")?.addEventListener("click", () => window.location.href = "profile.html");
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "index.html";
        } catch (err) {
            console.error(err);
        }
    });

    // ---------------- SAVE PROFILE INFO ----------------
    saveProfileBtn.addEventListener("click", async () => {
        try {
            await updateDoc(doc(db, "users", userId), {
                username: usernameInput.value,
                location: locationInput.value,
                bio: bioInput.value,
                music: musicInput.value,
                updatedAt: serverTimestamp()
            });
            alert("Profile info saved!");
            loadUserProfile();
        } catch (err) {
            console.error(err);
            alert("Failed to save profile info.");
        }
    });

    // ---------------- SAVE THEME ----------------
    saveThemeBtn.addEventListener("click", async () => {
        const selectedTheme = themeSelect.value;
        try {
            await updateDoc(doc(db, "users", userId), { theme: selectedTheme });
            document.body.className = selectedTheme;
            alert("Theme saved!");
        } catch (err) {
            console.error(err);
            alert("Failed to save theme.");
        }
    });

    // ---------------- SAVE PROFILE PIC ----------------
    saveProfilePicBtn.addEventListener("click", async () => {
        const file = profilePicInput.files[0];
        if (!file) return alert("Select a file first.");

        const storageRef = ref(storage, `profileImages/${userId}_${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            await updateDoc(doc(db, "users", userId), { profilePic: downloadURL });
            profilePhoto.src = downloadURL;
            alert("Profile picture updated!");
        } catch (err) {
            console.error(err);
            alert("Failed to upload profile picture.");
        }
    });

    // ---------------- TOP FRIENDS ----------------
    saveTopFriendBtn.addEventListener("click", async () => {
        const friendName = editTopFriendInput.value.trim();
        if (!friendName) return;
        try {
            await updateDoc(doc(db, "users", userId), {
                topFriends: arrayUnion(friendName)
            });
            loadUserProfile();
            alert("Top friend added!");
        } catch (err) {
            console.error(err);
            alert("Failed to add top friend.");
        }
    });

    // ---------------- SEARCH USERS ----------------
    searchUserBtn.addEventListener("click", async () => {
        const searchVal = searchUserInput.value.trim();
        if (!searchVal) return;

        try {
            const userRef = doc(db, "users", searchVal); // assuming doc id = username
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const u = userSnap.data();
                searchResults.innerHTML = `<div>
                    <strong>${u.username}</strong> - <button onclick="window.location.href='userProfile.html?uid=${searchVal}'">View Profile</button>
                </div>`;
            } else {
                searchResults.innerHTML = "User not found.";
            }
        } catch (err) {
            console.error(err);
            searchResults.innerHTML = "Error searching user.";
        }
    });

});
