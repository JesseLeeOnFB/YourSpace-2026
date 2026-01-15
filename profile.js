document.addEventListener("DOMContentLoaded", () => {
  // --- NAVIGATION BUTTONS ---
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
      alert("Logged out successfully.");
      window.location.href = "index.html";
    });
  }

  // --- PROFILE PICTURE ---
  const profilePicPreview = document.getElementById("profilePicPreview");
  const profilePicInput = document.getElementById("profilePicInput");

  const savedPic = localStorage.getItem("profilePic");
  if (savedPic) profilePicPreview.src = savedPic;

  profilePicInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      profilePicPreview.src = event.target.result;
      localStorage.setItem("profilePic", event.target.result);
    };
    reader.readAsDataURL(file);
  });

  // --- LOAD SAVED PROFILE DATA ---
  const usernameInput = document.getElementById("usernameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const themeSelect = document.getElementById("themeSelect");

  usernameInput.value = localStorage.getItem("username") || "";
  bioInput.value = localStorage.getItem("bio") || "";
  locationInput.value = localStorage.getItem("location") || "";
  musicInput.value = localStorage.getItem("music") || "";
  themeSelect.value = localStorage.getItem("theme") || "default";
  document.body.className = themeSelect.value;

  // --- SAVE PROFILE BUTTON ---
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  saveProfileBtn.addEventListener("click", () => {
    localStorage.setItem("username", usernameInput.value);
    localStorage.setItem("bio", bioInput.value);
    localStorage.setItem("location", locationInput.value);
    localStorage.setItem("music", musicInput.value);
    alert("Profile saved!");
  });

  // --- SAVE THEME BUTTON ---
  const saveThemeBtn = document.getElementById("saveThemeBtn");
  saveThemeBtn.addEventListener("click", () => {
    const selectedTheme = themeSelect.value;
    localStorage.setItem("theme", selectedTheme);
    document.body.className = selectedTheme;
    alert("Theme saved!");
  });

  // --- TOP FRIENDS INPUT ---
  const addTopFriendInput = document.getElementById("addTopFriendInput");
  const addTopFriendBtn = document.getElementById("addTopFriendBtn");
  const topFriendsList = document.getElementById("topFriendsList");

  // Load saved top friends
  let savedTopFriends = JSON.parse(localStorage.getItem("topFriends") || "[]");
  savedTopFriends.forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    topFriendsList.appendChild(li);
  });

  addTopFriendBtn.addEventListener("click", () => {
    const friendName = addTopFriendInput.value.trim();
    if (!friendName) return;
    savedTopFriends.push(friendName);
    localStorage.setItem("topFriends", JSON.stringify(savedTopFriends));
    const li = document.createElement("li");
    li.textContent = friendName;
    topFriendsList.appendChild(li);
    addTopFriendInput.value = "";
  });
});
