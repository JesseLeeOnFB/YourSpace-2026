import { auth, db, storage } from "./firestore.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    // DOM Elements
    const bioInput = document.getElementById("bioInput");
    const locationInput = document.getElementById("locationInput");
    const usernameInput = document.getElementById("usernameInput");
    const profilePicInput = document.getElementById("profilePicInput");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const profilePhoto = document.getElementById("profilePhoto");

    const musicInput = document.getElementById("musicInput");
    const saveMusicBtn = document.getElementById("saveMusicBtn");
    const musicPlayerContainer = document.getElementById("musicPlayerContainer");

    const themeSelect = document.getElementById("themeSelect");
    const saveThemeBtn = document.getElementById("saveThemeBtn");

    const topFriendsList = document.getElementById("topFriendsList");
    const friendSearchInput = document.getElementById("friendSearchInput");
    const searchFriendBtn = document.getElementById("searchFriendBtn");

    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const userDocRef = doc(db, "users", auth.currentUser.uid);

    // NAVIGATION BUTTONS
    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        await auth.signOut();
        window.location.href = "index.html";
    });

    // Load existing profile info
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            bioInput.value = data.bio || "";
            locationInput.value = data.location || "";
            usernameInput.value = data.username || "";
            profilePhoto.src = data.profilePic || "defaultProfile.png";
            musicInput.value = data.music || "";
            themeSelect.value = data.theme || "";
            renderTopFriends(data.topFriends || []);
            loadMusicPlayer(data.music || "");
            applyTheme(data.theme || "");
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
    }

    // Save profile info
    saveProfileBtn.addEventListener("click", async () => {
        try {
            let profilePicURL = profilePhoto.src;
            if (profilePicInput.files[0]) {
                const file = profilePicInput.files[0];
                const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                profilePicURL = await getDownloadURL(snapshot.ref);
            }

            await setDoc(userDocRef, {
                bio: bioInput.value,
                location: locationInput.value,
                username: usernameInput.value,
                profilePic: profilePicURL
            }, { merge: true });

            profilePhoto.src = profilePicURL;
            alert("Profile saved!");
        } catch (err) {
            console.error(err);
            alert("Failed to save profile.");
        }
    });

    // Music
    saveMusicBtn.addEventListener("click", async () => {
        try {
            await updateDoc(userDocRef, { music: musicInput.value });
            loadMusicPlayer(musicInput.value);
            alert("Music saved!");
        } catch (err) {
            console.error(err);
            alert("Failed to save music.");
        }
    });

    function loadMusicPlayer(url) {
        if (!url) {
            musicPlayerContainer.innerHTML = "";
            return;
        }
        // Extract YouTube video ID
        const idMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (idMatch) {
            const videoId = idMatch[1];
            musicPlayerContainer.innerHTML = `<iframe width="300" height="80" src="https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&playlist=${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
    }

    // Theme
    saveThemeBtn.addEventListener("click", async () => {
        const theme = themeSelect.value;
        await updateDoc(userDocRef, { theme });
        applyTheme(theme);
        alert("Theme saved!");
    });

    function applyTheme(theme) {
        document.body.className = theme || "default";
    }

    // Top friends
    function renderTopFriends(friendsArray) {
        topFriendsList.innerHTML = "";
        friendsArray.forEach(friend => {
            const li = document.createElement("li");
            li.textContent = friend;
            topFriendsList.appendChild(li);
        });
    }

    searchFriendBtn.addEventListener("click", async () => {
        const username = friendSearchInput.value.trim();
        if (!username) return;

        const usersQuery = doc(db, "users", username);
        try {
            const userSnap = await getDoc(usersQuery);
            if (userSnap.exists()) {
                const friendData = userSnap.data();
                alert(`Found ${friendData.username}. Add as friend functionality here.`);
                // Implement friend request logic if desired
            } else {
                alert("User not found.");
            }
        } catch (err) {
            console.error(err);
            alert("Error searching user.");
        }
    });
});
