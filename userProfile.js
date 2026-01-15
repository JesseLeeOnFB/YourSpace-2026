import { getAuth, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

document.addEventListener("DOMContentLoaded", async () => {

    // === Elements ===
    const profilePhoto = document.getElementById("profilePhoto");
    const profilePicInput = document.getElementById("profilePicInput");
    const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
    const usernameInput = document.getElementById("usernameInput");
    const locationInput = document.getElementById("locationInput");
    const bioInput = document.getElementById("bioInput");
    const musicInput = document.getElementById("musicInput");
    const themeSelect = document.getElementById("themeSelect");
    const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
    const addFriendInput = document.getElementById("addFriendInput");
    const addFriendBtn = document.getElementById("addFriendBtn");
    const topFriendsList = document.getElementById("topFriendsList");
    const musicPlayer = document.getElementById("musicPlayer");

    const homeBtn = document.getElementById("homeBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const userDocRef = doc(db, "users", auth.currentUser.uid);

    // === Load Profile Info ===
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        profilePhoto.src = data.profilePic || "";
        usernameInput.value = data.username || "";
        locationInput.value = data.location || "";
        bioInput.value = data.bio || "";
        musicInput.value = data.music || "";
        themeSelect.value = data.theme || "default";
        document.body.className = data.theme || "default";

        // Top Friends List
        topFriendsList.innerHTML = "";
        (data.topFriends || []).forEach(f => {
            const li = document.createElement("li");
            li.textContent = f;
            topFriendsList.appendChild(li);
        });

        // Music Player
        if (data.music) {
            musicPlayer.src = data.music;
        }
    }

    // === Navigation Buttons ===
    homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    logoutBtn.addEventListener("click", async () => {
        await auth.signOut();
        window.location.href = "index.html";
    });

    // === Save Profile Picture ===
    saveProfilePicBtn.addEventListener("click", async () => {
        const file = profilePicInput.files[0];
        if (!file) return alert("Select a photo first");

        const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        await updateDoc(userDocRef, { profilePic: downloadURL });
        profilePhoto.src = downloadURL;
        alert("Profile picture updated!");
    });

    // === Save Profile Info ===
    saveProfileInfoBtn.addEventListener("click", async () => {
        try {
            await updateDoc(userDocRef, {
                username: usernameInput.value,
                location: locationInput.value,
                bio: bioInput.value,
                music: musicInput.value,
                theme: themeSelect.value
            });
            document.body.className = themeSelect.value;
            if (musicInput.value) musicPlayer.src = musicInput.value;
            alert("Profile info saved!");
        } catch(e) {
            alert("Failed to save profile info");
            console.error(e);
        }
    });

    // === Add Friend ===
    addFriendBtn.addEventListener("click", async () => {
        const searchUsername = addFriendInput.value.trim();
        if (!searchUsername) return alert("Enter a username");
        
        // Query user by username
        const usersRef = doc(db, "users");
        // Simple getDoc for demonstration; replace with actual query for production
        const searchedSnap = await getDoc(doc(db, "users", searchUsername));
        if (!searchedSnap.exists()) return alert("User not found");

        // Add to current user's topFriends for now (friend system pending)
        await updateDoc(userDocRef, { topFriends: arrayUnion(searchUsername) });
        const li = document.createElement("li");
        li.textContent = searchUsername;
        topFriendsList.appendChild(li);
        alert(`Added ${searchUsername} to top friends`);
    });
});
