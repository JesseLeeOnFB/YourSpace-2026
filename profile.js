document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- NAV ---------------- */
  document.getElementById("homeBtn")?.addEventListener("click", () => {
    window.location.href = "feed.html";
  });

  document.getElementById("profileBtn")?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });

  /* ---------------- ELEMENTS ---------------- */
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");

  const profilePicInput = document.getElementById("profilePicInput");
  const profilePicDisplay = document.getElementById("profilePicDisplay");
  const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

  const topFriendsInput = document.getElementById("topFriendsInput");
  const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");

  /* ---------------- LOAD SAVED DATA ---------------- */
  bioInput.value = localStorage.getItem("bio") || "";
  locationInput.value = localStorage.getItem("location") || "";
  musicInput.value = localStorage.getItem("music") || "";
  topFriendsInput.value = localStorage.getItem("topFriends") || "";

  const savedPic = localStorage.getItem("profilePic");
  if (savedPic) {
    profilePicDisplay.src = savedPic;
    profilePicDisplay.style.display = "block";
  }

  /* ---------------- SAVE PROFILE INFO ---------------- */
  saveProfileBtn.addEventListener("click", () => {
    localStorage.setItem("bio", bioInput.value);
    localStorage.setItem("location", locationInput.value);
    localStorage.setItem("music", musicInput.value);
    alert("Profile saved!");
  });

  /* ---------------- PROFILE PIC PREVIEW ---------------- */
  profilePicInput.addEventListener("change", () => {
    const file = profilePicInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      profilePicDisplay.src = e.target.result;
      profilePicDisplay.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  /* ---------------- SAVE PROFILE PIC ---------------- */
  saveProfilePicBtn.addEventListener("click", () => {
    const file = profilePicInput.files[0];
    if (!file) {
      alert("Please choose a photo first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      localStorage.setItem("profilePic", e.target.result);
      alert("Profile picture saved!");
    };
    reader.readAsDataURL(file);
  });

  /* ---------------- TOP FRIENDS ---------------- */
  saveTopFriendsBtn.addEventListener("click", () => {
    localStorage.setItem("topFriends", topFriendsInput.value);
    alert("Top friends saved!");
  });

});
