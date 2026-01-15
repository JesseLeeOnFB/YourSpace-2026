// profile.js
document.addEventListener("DOMContentLoaded", () => {

  // --------------------
  // NAVIGATION BUTTONS
  // --------------------
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      window.location.href = "feed.html";
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Replace with your authentication sign-out logic
      alert("Logged out (placeholder)");
      window.location.href = "index.html";
    });
  }

  // --------------------
  // ELEMENTS
  // --------------------
  const bioInput = document.getElementById("bio");
  const locationInput = document.getElementById("location");
  const musicInput = document.getElementById("music");
  const topFriendsInput = document.getElementById("topFriends");
  const themeSelect = document.getElementById("themeSelect");
  const profilePicInput = document.getElementById("profilePicInput");
  const profilePicDisplay = document.getElementById("profilePicDisplay");

  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const saveThemeBtn = document.getElementById("saveThemeBtn");

  // --------------------
  // LOAD PROFILE DATA (mock)
  // --------------------
  let currentProfile = JSON.parse(localStorage.getItem("userProfile")) || {
    bio: "Hello, I’m Jesse",
    location: "Ohio, USA",
    music: "",
    topFriends: "",
    theme: "default",
    profilePic: ""
  };

  function loadProfile() {
    bioInput.value = currentProfile.bio;
    locationInput.value = currentProfile.location;
    musicInput.value = currentProfile.music;
    topFriendsInput.value = currentProfile.topFriends;
    themeSelect.value = currentProfile.theme;

    document.body.className = currentProfile.theme;

    if (currentProfile.profilePic) {
      profilePicDisplay.src = currentProfile.profilePic;
      profilePicDisplay.style.display = "block";
    } else {
      profilePicDisplay.style.display = "none";
    }
  }

  loadProfile();

  // --------------------
  // SAVE PROFILE INFO
  // --------------------
  saveProfileBtn.addEventListener("click", () => {
    currentProfile.bio = bioInput.value;
    currentProfile.location = locationInput.value;
    currentProfile.music = musicInput.value;
    currentProfile.topFriends = topFriendsInput.value;

    localStorage.setItem("userProfile", JSON.stringify(currentProfile));
    alert("Profile saved successfully!");
    loadProfile();
  });

  // --------------------
  // SAVE THEME
  // --------------------
  saveThemeBtn.addEventListener("click", () => {
    const selectedTheme = themeSelect.value;
    currentProfile.theme = selectedTheme;
    document.body.className = selectedTheme;
    localStorage.setItem("userProfile", JSON.stringify(currentProfile));
    alert(`Theme changed to ${selectedTheme}`);
  });

  // --------------------
  // PROFILE PICTURE UPLOAD
  // --------------------
  profilePicInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      currentProfile.profilePic = event.target.result;
      profilePicDisplay.src = event.target.result;
      profilePicDisplay.style.display = "block";
      localStorage.setItem("userProfile", JSON.stringify(currentProfile));
      alert("Profile picture updated!");
    };
    reader.readAsDataURL(file);
  });

});
