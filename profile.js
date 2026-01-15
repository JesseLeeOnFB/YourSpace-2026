// profile.js

document.addEventListener("DOMContentLoaded", () => {
  // NAVIGATION BUTTONS
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => { window.location.href = "feed.html"; });
  if (profileBtn) profileBtn.addEventListener("click", () => { window.location.href = "profile.html"; });
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut(); // Assuming you have auth defined in your JS context
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to logout.");
    }
  });

  // PROFILE ELEMENTS
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const profilePhotoImg = document.getElementById("profilePhoto");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const saveMusicBtn = document.getElementById("saveMusicBtn");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const topFriendsInputs = document.querySelectorAll(".topFriendInput");
  const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");
  const addFriendInput = document.getElementById("addFriendInput");
  const addFriendBtn = document.getElementById("addFriendBtn");

  // Function to load profile data
  async function loadProfile() {
    try {
      const userDoc = await db.collection("users").doc(auth.currentUser.uid).get();
      if (!userDoc.exists) return;

      const data = userDoc.data();

      // Load bio, location, music
      bioInput.value = data.bio || "";
      locationInput.value = data.location || "";
      musicInput.value = data.music || "";

      // Load profile picture
      profilePhotoImg.src = data.profilePic || "default.png";

      // Load top friends
      topFriendsInputs.forEach((input, index) => {
        input.value = (data.topFriends && data.topFriends[index]) || "";
      });

    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }

  // SAVE PROFILE BUTTON
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      try {
        await db.collection("users").doc(auth.currentUser.uid).update({
          bio: bioInput.value
