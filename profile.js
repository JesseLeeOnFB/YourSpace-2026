// profile.js
import { auth, db, storage } from './firebase.js'; // your firebase.js module

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
            window.location.href = "index.html";
        } catch (err) {
            alert("Failed to logout. Check console.");
            console.error(err);
        }
    });

    // PROFILE ELEMENTS
    const profilePic = document.getElementById("profilePic");
    const displayNameInput = document.getElementById("displayName");
    const bioInput = document.getElementById("bio");
    const locationInput = document.getElementById("location");
    const topFriendsInput = document.getElementById("topFriendsInput");
    const topFriendsList = document.getElementById("topFriendsList");
    const wallCommentInput = document.getElementById("wallCommentInput");
    const wallCommentsList = document.getElementById("wallCommentsList");
    const musicLinkInput = document.getElementById("musicLink");
    const musicPlayerDiv = document.getElementById("musicPlayer");

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const pfpInput = document.getElementById("pfpInput");
    const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
    const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");
    const postWallCommentBtn = document.getElementById("postWallCommentBtn");
    const saveMusicBtn = document.getElementById("saveMusicBtn");

    let currentUser;

    // LOAD USER DATA
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }
        currentUser = user;
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            displayNameInput.value = data.displayName || "";
            bioInput.value = data.bio || "";
            locationInput.value = data.location || "";
            musicLinkInput.value = data.music || "";
            // Load top friends
            if (data.topFriends) {
                topFriendsList.innerHTML = "";
                const friendsArray = data.topFriends.split(",").map(f => f.trim()).filter(f => f);
                friendsArray.forEach(f => {
                    const div = document.createElement("div");
                    div.textContent = f;
                    topFriendsList.appendChild(div);
                });
            }
            // Load profile picture
            if (data.profilePic) {
                profilePic.src = data.profilePic;
            }

            // Load wall comments
            if (data.wallComments) {
                wallCommentsList.innerHTML = "";
                data.wallComments.forEach(comment => {
                    const div = document.createElement("div");
                    div.classList.add("wallComment");
                    div.textContent = `${comment.username}: ${comment.text}`;
                    wallCommentsList.appendChild(div);
                });
            }

            // Load music player
            if (data.music) {
                setMusicPlayer(data.music);
            }
        }
    });

    // SAVE PROFILE INFO
    saveProfileBtn.addEventListener("click", async () => {
        if (!currentUser) return;
        await db.collection("users").doc(currentUser.uid).update({
            displayName: displayNameInput.value,
            bio: bioInput.value,
            location: locationInput.value
        });
        alert("Profile info saved!");
    });

    // SAVE PROFILE PIC
    saveProfilePicBtn.addEventListener("click", async () => {
        if (!currentUser || !pfpInput.files[0]) return;
        const file = pfpInput.files[0];
        const storageRef = storage.ref(`profileImages/${currentUser.uid}/${file.name}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();
        await db.collection("users").doc(currentUser.uid).update({
            profilePic: url
        });
        profilePic.src = url;
        alert("Profile picture saved!");
    });

    // SAVE TOP FRIENDS
    saveTopFriendsBtn.addEventListener("click", async () => {
        if (!currentUser) return;
        const friendsString = topFriendsInput.value;
        await db.collection("users").doc(currentUser.uid).update({
            topFriends: friendsString
        });
        const friendsArray = friendsString.split(",").map(f => f.trim()).filter(f => f);
        topFriendsList.innerHTML = "";
        friendsArray.forEach(f => {
            const div = document.createElement("div");
            div.textContent = f;
            topFriendsList.appendChild(div);
        });
        alert("Top friends saved!");
    });

    // POST WALL COMMENT
    postWallCommentBtn.addEventListener("click", async () => {
        if (!currentUser || !wallCommentInput.value) return;
        const comment = {
            username: currentUser.displayName || currentUser.email,
            text: wallCommentInput.value
        };
        const userRef = db.collection("users").doc(currentUser.uid);
        await userRef.update({
            wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
        });
        const div = document.createElement("div");
        div.classList.add("wallComment");
        div.textContent = `${comment.username}: ${comment.text}`;
        wallCommentsList.appendChild(div);
        wallCommentInput.value = "";
    });

    // SAVE MUSIC LINK
    saveMusicBtn.addEventListener("click", async () => {
        if (!currentUser || !musicLinkInput.value) return;
        await db.collection("users").doc(currentUser.uid).update({
            music: musicLinkInput.value
        });
        setMusicPlayer(musicLinkInput.value);
        alert("Music link saved!");
    });

    function setMusicPlayer(link) {
        if (!link) return;
        let embedHtml = "";
        if (link.includes("youtube.com") || link.includes("youtu.be")) {
            const videoId = link.split("v=")[1] || link.split("/").pop();
            embedHtml = `<iframe width="300" height="150" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
        // TODO: SoundCloud, Spotify, Pandora conversion if needed
        musicPlayerDiv.innerHTML = embedHtml;
    }

});
