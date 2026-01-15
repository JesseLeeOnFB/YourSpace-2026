// profile.js
import { auth, db, storage } from './firebase.js'; // your Firebase setup
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

document.addEventListener("DOMContentLoaded", () => {

    // NAVIGATION BUTTONS
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try { await auth.signOut(); window.location.href = "index.html"; } 
        catch (err) { console.error(err); alert("Logout failed"); }
    });

    // WAIT UNTIL USER IS AUTHENTICATED
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("You must be logged in.");
            window.location.href = "index.html";
            return;
        }

        const userId = user.uid;
        const userDocRef = doc(db, "users", userId);

        // Load user data
        try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const data = userSnap.data();

                // Populate profile info safely
                document.getElementById("bioInput").value = data.bio || "";
                document.getElementById("locationInput").value = data.location || "";
                document.getElementById("usernameDisplay").textContent = data.username || "Anonymous";
                document.getElementById("topFriendsInput").value = (data.topFriends || []).join(", ");
                document.getElementById("musicInput").value = data.music || "";

                // Load profile picture
                if (data.profilePic) {
                    const pfpImg = document.getElementById("profilePicDisplay");
                    pfpImg.src = data.profilePic;
                    pfpImg.style.display = "block";
                }

                // Load wall comments container if exists
                if (data.wallComments && Array.isArray(data.wallComments)) {
                    const wallContainer = document.getElementById("wallCommentsContainer");
                    wallContainer.innerHTML = "";
                    data.wallComments.forEach(comment => {
                        const div = document.createElement("div");
                        div.className = "wallComment";
                        div.textContent = `${comment.author}: ${comment.text}`;
                        wallContainer.appendChild(div);
                    });
                }
            }
        } catch (err) {
            console.error("Error loading profile:", err);
        }

        // EVENT LISTENERS FOR BUTTONS
        const saveProfileBtn = document.getElementById("saveProfileBtn");
        const savePfpBtn = document.getElementById("savePfpBtn");
        const saveMusicBtn = document.getElementById("saveMusicBtn");

        // Save profile info
        if (saveProfileBtn) saveProfileBtn.addEventListener("click", async () => {
            try {
                await updateDoc(userDocRef, {
                    bio: document.getElementById("bioInput").value,
                    location: document.getElementById("locationInput").value,
                    topFriends: document.getElementById("topFriendsInput").value.split(",").map(s => s.trim())
                });
                alert("Profile info saved!");
            } catch (err) {
                console.error(err);
                alert("Failed to save profile info");
            }
        });

        // Save profile picture
        if (savePfpBtn) savePfpBtn.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const storageRef = ref(storage, `profileImages/${userId}/${file.name}`);
            try {
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                await updateDoc(userDocRef, { profilePic: url });
                document.getElementById("profilePicDisplay").src = url;
                alert("Profile picture updated!");
            } catch (err) {
                console.error(err);
                alert("Failed to upload profile picture");
            }
        });

        // Save music
        if (saveMusicBtn) saveMusicBtn.addEventListener("click", async () => {
            try {
                const musicUrl = document.getElementById("musicInput").value;
                await updateDoc(userDocRef, { music: musicUrl });
                alert("Music link saved!");
            } catch (err) {
                console.error(err);
                alert("Failed to save music link");
            }
        });

    }); // end onAuthStateChanged

}); // end DOMContentLoaded
