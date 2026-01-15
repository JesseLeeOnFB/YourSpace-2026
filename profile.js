import { auth, db, storage } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {

    // NAVIGATION BUTTONS
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try { await auth.signOut(); window.location.href = "index.html"; }
        catch(err){ console.error(err); alert("Logout failed"); }
    });

    // WAIT FOR AUTH STATE
    auth.onAuthStateChanged(async (user) => {
        if (!user) return window.location.href = "index.html";

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) return console.error("User doc not found");

        const userData = userSnap.data();

        // PROFILE ELEMENTS
        const profilePic = document.getElementById("profilePic");
        const profilePicInput = document.getElementById("profilePicInput");
        const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
        const usernameInput = document.getElementById("usernameInput");
        const locationInput = document.getElementById("locationInput");
        const bioInput = document.getElementById("bioInput");
        const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
        const musicInput = document.getElementById("musicInput");
        const saveMusicBtn = document.getElementById("saveMusicBtn");
        const musicPlayer = document.getElementById("musicPlayer");
        const themeSelect = document.getElementById("themeSelect");
        const saveThemeBtn = document.getElementById("saveThemeBtn");
        const topFriendsList = document.getElementById("topFriendsList");

        // LOAD USER DATA
        profilePic.src = userData.profilePic || "";
        usernameInput.value = userData.username || "";
        locationInput.value = userData.location || "";
        bioInput.value = userData.bio || "";
        musicInput.value = userData.music || "";
        themeSelect.value = userData.theme || "";
        if(userData.topFriends) {
            topFriendsList.innerHTML = "";
            userData.topFriends.split(",").forEach(f => {
                if(f) topFriendsList.innerHTML += `<li>${f}</li>`;
            });
        }

        // MUSIC PLAYER
        if(userData.music) {
            musicPlayer.innerHTML = `<iframe width="300" height="80" src="${userData.music}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }

        // SAVE PROFILE INFO
        saveProfileInfoBtn.addEventListener("click", async () => {
            try {
                await updateDoc(userDocRef, {
                    username: usernameInput.value,
                    location: locationInput.value,
                    bio: bioInput.value
                });
                alert("Profile info saved!");
            } catch(err) { console.error(err); alert("Failed to save profile info"); }
        });

        // SAVE PROFILE PIC
        saveProfilePicBtn.addEventListener("click", async () => {
            const file = profilePicInput.files[0];
            if(!file) return alert("No file selected");
            const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                await updateDoc(userDocRef, { profilePic: downloadURL });
                profilePic.src = downloadURL;
                alert("Profile picture updated!");
            } catch(err){ console.error(err); alert("Failed to upload profile picture"); }
        });

        // SAVE MUSIC
        saveMusicBtn.addEventListener("click", async () => {
            try {
                await updateDoc(userDocRef, { music: musicInput.value });
                musicPlayer.innerHTML = `<iframe width="300" height="80" src="${musicInput.value}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                alert("Music saved!");
            } catch(err){ console.error(err); alert("Failed to save music"); }
        });

        // SAVE THEME
        saveThemeBtn.addEventListener("click", async () => {
            try {
                await updateDoc(userDocRef, { theme: themeSelect.value });
                document.body.className = themeSelect.value;
                alert("Theme updated!");
            } catch(err){ console.error(err); alert("Failed to save theme"); }
        });
    });
});
