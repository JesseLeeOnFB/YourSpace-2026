import { auth, db, storage, doc, getDoc, setDoc, updateDoc, ref, uploadBytes, getDownloadURL, onAuthStateChanged, signOut } from './firebase.js';

let currentUser;

onAuthStateChanged(auth, async user => {
    if (!user) {
        alert('You must be logged in');
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        await loadProfile();
    }
});

// NAVIGATION BUTTONS
document.getElementById('homeBtn')?.addEventListener('click', () => window.location.href = 'feed.html');
document.getElementById('profileBtn')?.addEventListener('click', () => window.location.href = 'profile.html');
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});

// LOAD PROFILE DATA
async function loadProfile() {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();

        document.getElementById('bioInput').value = data.bio || '';
        document.getElementById('locationInput').value = data.location || '';
        document.getElementById('topFriendInput').value = '';
        document.getElementById('topFriendsContainer').innerHTML = (data.topFriends || []).map(f => `<div>${f}</div>`).join('');

        // PROFILE PICTURE
        if (data.profilePic) {
            document.getElementById('profilePic').src = data.profilePic;
        }

        // MUSIC
        if (data.music) {
            loadMusicPlayer(data.music);
        }
    }
}

// SAVE PROFILE INFO
document.getElementById('saveProfileInfo')?.addEventListener('click', async () => {
    const bio = document.getElementById('bioInput').value;
    const location = document.getElementById('locationInput').value;

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { bio, location });
    alert('Profile info saved!');
});

// SAVE PROFILE PICTURE
document.getElementById('saveProfilePic')?.addEventListener('click', async () => {
    const file = document.getElementById('profilePicInput').files[0];
    if (!file) return alert('Select an image first');

    const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { profilePic: url });

    document.getElementById('profilePic').src = url;
    alert('Profile picture updated!');
});

// TOP FRIENDS
document.getElementById('saveTopFriends')?.addEventListener('click', async () => {
    const input = document.getElementById('topFriendInput').value.trim();
    if (!input) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    const data = userSnap.data();
    const topFriends = data.topFriends || [];

    if (!topFriends.includes(input)) topFriends.push(input);
    await updateDoc(userRef, { topFriends });
    document.getElementById('topFriendsContainer').innerHTML = topFriends.map(f => `<div>${f}</div>`).join('');
    document.getElementById('topFriendInput').value = '';
});

// MUSIC
document.getElementById('saveMusic')?.addEventListener('click', async () => {
    const link = document.getElementById('musicInput').value.trim();
    if (!link) return;

    const embed = convertToEmbed(link);
    await updateDoc(doc(db, 'users', currentUser.uid), { music: embed });
    loadMusicPlayer(embed);
});

// MUSIC PLAYER
function loadMusicPlayer(embedHtml) {
    const playerDiv = document.getElementById('musicPlayer');
    playerDiv.innerHTML = embedHtml;
}

// Convert shared links to embeddable HTML
function convertToEmbed(link) {
    // YouTube
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
        const videoId = link.split('v=')[1] || link.split('/').pop();
        return `<iframe width="300" height="150" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
    // SoundCloud
    if (link.includes('soundcloud.com')) {
        return `<iframe width="300" height="150" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${link}"></iframe>`;
    }
    // Spotify
    if (link.includes('spotify.com')) {
        return `<iframe src="https://open.spotify.com/embed/track/${link.split('/').pop()}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    }
    return link;
}
