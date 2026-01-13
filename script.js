console.log("🔥 script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  alert("JS IS RUNNING");

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  if (!loginBtn || !signupBtn) {
    alert("Buttons not found in DOM");
    return;
  }

  loginBtn.addEventListener("click", () => {
    alert("LOGIN BUTTON CLICKED");
  });

  signupBtn.addEventListener("click", () => {
    alert("SIGNUP BUTTON CLICKED");
  });
});
