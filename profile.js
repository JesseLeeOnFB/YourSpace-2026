// profile.js
document.addEventListener("DOMContentLoaded", () => {

    // ---------------------
    // NAVIGATION BUTTONS
    // ---------------------
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try {
            await firebase.auth().signOut();
            window.location.href = "index.html";
        } catch (err) {
            alert("Failed to logout: " + err.message);
        }
    });

    // ---------------------
    // PROFILE ELEMENTS
    // ---------------------
    const bioInput = document.getElementById("bio");
    const locationInput = document.getElementById("location");
    const topFriendsInput = document.getElementById("topFriends");
    const musicInput = document.getElementById("music");
    const profilePicInput = document.getElementById("profilePicInput");
    const profilePicDisplay = document.getElementById("profilePicDisplay");

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");
    const saveMusicBtn = document.getElementById("saveMusicBtn");

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("You must be logged in!");
        window.location.href = "index.html";
        return;
    }

    const db = firebase.firestore();
    const storage = firebase.storage();

    const userRef = db.collection("users").doc(user.uid);

    // ---------------------
    // LOAD SAVED PROFILE DATA
    // ---------------------
    userRef.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            bioInput.value = data.bio || "";
            locationInput.value = data.location || "";
            topFriendsInput.value = data.topFriends || "";
            musicInput.value = data.music || "";
            if (data.profilePic) {
                profilePicDisplay.src = data.profilePic;
            }
        }
    }).catch(err => console.error("Error fetching user data:", err));

    // ---------------------
    // SAVE PROFILE INFO
    // ---------------------
    saveProfileBtn.addEventListener("click", () => {
        userRef.update({
            bio: bioInput.value,
            location: locationInput.value
        }).then(() => alert("Profile info saved!"))
        .catch(err => alert("Failed to save profile info: " + err.message));
    });

    // ---------------------
    // SAVE TOP FRIENDS
    // ---------------------
    saveTopFriendsBtn.addEventListener("click", () => {
        userRef.update({ topFriends: topFriendsInput.value })
        .then(() => alert("Top friends updated!"))
        .catch(err => alert("Failed to update top friends: " + err.message));
    });

    // ---------------------
    // SAVE MUSIC LINK
    // ---------------------
    saveMusicBtn.addEventListener("click", () => {
        let link = musicInput.value.trim();
        if (!link) return alert("Enter a valid music link!");

        // Convert YouTube / Spotify / SoundCloud links to embedded HTML if needed
        if (link.includes("youtube.com") || link.includes("youtu.be")) {
            const videoId = link.split("v=")[1] || link.split("/").pop();
            link = `https://www.youtube.com/embed/${videoId}`;
        }
        userRef.update({ music: link })
        .then(() => alert("Music link saved!"))
        .catch(err => alert("Failed to save music link: " + err.message));
    });

    // ---------------------
    // PROFILE PICTURE UPLOAD
    // ---------------------
    profilePicInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const storageRef = storage.ref().child(`profileImages/${user.uid}/${file.name}`);
        const uploadTask = storageRef.put(file);

        uploadTask.on("state_changed",
            null,
            error => alert("Upload failed: " + error.message),
            () => {
                uploadTask.snapshot.ref.getDownloadURL().then(url => {
                    userRef.update({ profilePic: url })
                    .then(() => {
                        profilePicDisplay.src = url;
                        alert("Profile picture updated!");
                    })
                    .catch(err => alert("Failed to save profile picture: " + err.message));
                });
            }
        );
    });

});
