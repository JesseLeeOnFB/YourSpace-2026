<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YourSpace Profile</title>
  <link rel="stylesheet" href="style.css">
</head>
<body class="default">

  <!-- NAVIGATION BAR -->
  <nav class="navbar">
    <button id="homeBtn">Home</button>
    <button id="profileBtn">Profile</button>
    <button id="logoutBtn">Logout</button>
  </nav>

  <!-- PROFILE SECTION -->
  <section class="profileSection">
    <h2>Your Profile</h2>

    <!-- PROFILE PICTURE -->
    <div class="profilePicContainer">
      <img id="profilePicImg" src="default_profile.png" alt="Profile Picture">
      <input type="file" id="profilePicInput" accept="image/*">
    </div>

    <!-- BASIC INFO -->
    <label>Display Name:</label>
    <input type="text" id="displayName" placeholder="Your display name">

    <label>Username:</label>
    <input type="text" id="username" placeholder="Your username">

    <label>Bio:</label>
    <textarea id="bio" rows="3" placeholder="Tell people about yourself"></textarea>

    <label>Location:</label>
    <input type="text" id="location" placeholder="Where are you?">

    <!-- MUSIC -->
    <label>Music Player (YouTube link):</label>
    <input type="text" id="music" placeholder="YouTube link">
    <button id="saveMusicBtn">Save Music</button>

    <!-- THEME SELECT -->
    <label>Theme:</label>
    <select id="themeSelect">
      <option value="default">Default</option>
      <option value="dark">Dark</option>
      <option value="neon">Neon</option>
      <option value="animated">Animated</option>
    </select>
    <button id="saveThemeBtn">Save Theme</button>

    <!-- TOP FRIENDS -->
    <label>Top 10 Friends (comma-separated usernames):</label>
    <input type="text" id="topFriendsInput" placeholder="DanielleW, JohnD, ...">

    <!-- SAVE PROFILE INFO -->
    <button id="saveProfileBtn">Save Profile</button>
  </section>

  <script type="module" src="profile.js"></script>
</body>
</html>
