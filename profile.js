document.addEventListener("DOMContentLoaded", () => {

    // NAV BUTTONS (keep working)
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    homeBtn?.addEventListener("click", () => { window.location.href = "feed.html"; });
    profileBtn?.addEventListener("click", () => { window.location.href = "profile.html"; });
    logoutBtn?.addEventListener("click", async () => {
        // replace with your auth logout method if needed
        alert("Logged out.");
        window.location.href = "index.html";
    });

    // PROFILE ELEMENTS
    const profilePhoto = document.getElementById("profilePhoto");
    const profilePhotoInput = document.getElementById("profilePhotoInput");
    const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
    const usernameInput = document.getElementById("usernameInput");
    const displayNameInput = document.getElementById("displayNameInput");
    const bioInput = document.getElementById("bioInput");
    const locationInput = document.getElementById("locationInput");
    const musicInput = document.getElementById("musicInput");
    const saveProfileBtn = document.getElementById("saveProfileBtn");

    const topFriendsInput = document.getElementById("topFriendsInput");
    const addTopFriendBtn = document.getElementById("addTopFriendBtn");
    const topFriendsList = document.getElementById("topFriendsList");

    const themeSelect = document.getElementById("themeSelect");
    const saveThemeBtn = document.getElementById("saveThemeBtn");

    // MOCK USER DATA STORE (replace with your storage/firestore calls)
    let userData = {
        username: "DanielleW",
        displayName: "Anonymous",
        bio: "Hello, I’m Danielle",
        location: "Ohio, USA",
        music: "",
        profilePic: "", // store as file path or URL
        topFriends: [],
        theme: ""
    };

    // LOAD PROFILE
    function loadProfile() {
        usernameInput.value = userData.username;
        displayNameInput.value = userData.displayName;
        bioInput.value = userData.bio;
        locationInput.value = userData.location;
        musicInput.value = userData.music;
        profilePhoto.src = userData.profilePic || "defaultAvatar.png";
        topFriendsList.innerHTML = "";
        userData.topFriends.forEach(f => {
            const li = document.createElement("li");
            li.textContent = f;
            topFriendsList.appendChild(li);
        });
        if(userData.theme) document.body.className = userData.theme;
        themeSelect.value = userData.theme || "";
    }

    loadProfile();

    // SAVE PROFILE INFO
    saveProfileBtn.addEventListener("click", () => {
        userData.displayName = displayNameInput.value;
        userData.bio = bioInput.value;
        userData.location = locationInput.value;
        userData.music = musicInput.value;
        alert("Profile info saved!");
    });

    // SAVE PROFILE PHOTO
    saveProfilePhotoBtn.addEventListener("click", () => {
        if (profilePhotoInput.files[0]) {
            const file = profilePhotoInput.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                userData.profilePic = reader.result;
                profilePhoto.src = reader.result;
                alert("Profile photo updated!");
            };
            reader.readAsDataURL(file);
        } else {
            alert("No file selected.");
        }
    });

    // ADD TOP FRIEND
    addTopFriendBtn.addEventListener("click", () => {
        const friendName = topFriendsInput.value.trim();
        if(friendName && userData.topFriends.length < 10) {
            userData.topFriends.push(friendName);
            const li = document.createElement("li");
            li.textContent = friendName;
            topFriendsList.appendChild(li);
            topFriendsInput.value = "";
        } else alert("Invalid or max 10 friends reached");
    });

    // SAVE THEME
    saveThemeBtn.addEventListener("click", () => {
        const selectedTheme = themeSelect.value;
        document.body.className = selectedTheme;
        userData.theme = selectedTheme;
        alert("Theme updated!");
    });

    // STOP ZOOM ON MOBILE for Top Friends input
    topFriendsInput.style.fontSize = "16px";
});
