import { auth, db, storage } from './firebase.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';

document.addEventListener("DOMContentLoaded", async () => {

    if (!auth.currentUser) {
        alert("You must be logged in.");
        window.location.href = "index.html";
        return;
    }

    const userId = auth.currentUser.uid;

    // NAV BUTTONS
    document.getElementById("homeBtn")?.addEventListener("click", () => window.location.href = "feed.html");
    document.getElementById("profileBtn")?.addEventListener("click", () => window.location.href = "profile.html");
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        try {
            await auth.signOut();
            alert("Logged out successfully.");
            window.location.href = "index.html";
        } catch(err) {
            console.error(err);
            alert("Logout failed.");
        }
    });

    // ELEMENT REFERENCES
    const profilePhoto = document.getElementById("profilePhoto");
    const profilePhotoInput = document.getElementById("profilePhotoInput");
    const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
    const usernameInput = document.getElementById("usernameInput");
    const bioInput = document.getElementById("bioInput");
    const locationInput = document.getElementById("locationInput");
    const musicInput = document.getElementById("musicInput");
    const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
    const themeSelect = document.getElementById("themeSelect");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const topFriendsList = document.getElementById("topFriendsList");
    const addTopFriendInput = document.getElementById("addTopFriendInput");
    const addTopFriendBtn = document.getElementById("addTopFriendBtn");

    // LOAD PROFILE DATA
    async function loadProfile() {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            usernameInput.value = data.username || "";
            bioInput.value = data.bio || "";
            locationInput.value = data.location || "";
            musicInput.value = data.music || "";
            themeSelect.value = data.theme || "";
            profilePhoto.src = data.profilePic || "default-avatar.png";

            // Load Top Friends
            topFriendsList.innerHTML = "";
            if (data.topFriends) {
                data.topFriends.split(",").forEach(friend => {
                    if(friend.trim() !== "") {
                        const li = document.createElement("li");
                        li.textContent = friend;
                        topFriendsList.appendChild(li);
                    }
                });
            }
        }
    }

    await loadProfile();

    // SAVE PROFILE PHOTO
    saveProfilePhotoBtn.addEventListener("click", async () => {
        const file = profilePhotoInput.files[0];
        if (!file) return alert("Select a photo first.");
        const storageRef = ref(storage, `profileImages/${userId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { profilePic: downloadURL });
        profilePhoto.src = downloadURL;
        alert("Profile photo updated!");
    });

    // SAVE PROFILE INFO
    saveProfileInfoBtn.addEventListener("click", async () => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            username: usernameInput.value,
            bio: bioInput.value,
            location: locationInput.value,
            music: musicInput.value
        });
        alert("Profile info updated!");
    });

    // SAVE THEME
    saveThemeBtn.addEventListener("click", async () => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { theme: themeSelect.value });
        document.body.className = themeSelect.value || "default";
        alert("Theme saved!");
    });

    // ADD TOP FRIEND
    addTopFriendBtn.addEventListener("click", async () => {
        const friendUsername = addTopFriendInput.value.trim();
        if (!friendUsername) return;

        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);
        let currentTopFriends = docSnap.data().topFriends || "";
        currentTopFriends = currentTopFriends ? currentTopFriends.split(",") : [];
        if (!currentTopFriends.includes(friendUsername)) {
            currentTopFriends.push(friendUsername);
        }
        await updateDoc(userRef, { topFriends: currentTopFriends.join(",") });
        addTopFriendInput.value = "";
        loadProfile(); // reload list
    });
});
