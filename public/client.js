const socket = io();

// ELEMENTS
const signinScreen = document.getElementById("signinScreen");
const signinName = document.getElementById("signinName");
const signinAvatar = document.getElementById("signinAvatar");
const signinRoomName = document.getElementById("signinRoomName");
const signinRoomPassword = document.getElementById("signinRoomPassword");
const signinGoogleOnly = document.getElementById("signinGoogleOnly");
const signinGoogleVerified = document.getElementById("signinGoogleVerified");
const signinCreateRoomBtn = document.getElementById("signinCreateRoomBtn");
const signinJoinRoomBtn = document.getElementById("signinJoinRoomBtn");
const signinSignOutBtn = document.getElementById("signinSignOutBtn");
const signinError = document.getElementById("signinError");
const githubBtn = document.getElementById("githubBtn");
const discordBtn = document.getElementById("discordBtn");

const roomTitle = document.getElementById("roomTitle");
const userStatus = document.getElementById("userStatus");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

const userDrawer = document.getElementById("userDrawer");
const dmDrawer = document.getElementById("dmDrawer");
const profileModal = document.getElementById("profileModal");
const roomInfoModal = document.getElementById("roomInfoModal");

const openUsersBtn = document.getElementById("openUsersBtn");
const openDMsBtn = document.getElementById("openDMsBtn");
const openProfileBtn = document.getElementById("openProfileBtn");
const openRoomInfoBtn = document.getElementById("openRoomInfoBtn");

const usersEl = document.getElementById("users");

const hostControlsEl = document.getElementById("hostControls");
const hostTargetId = document.getElementById("hostTargetId");
const hostMuteBtn = document.getElementById("hostMuteBtn");
const hostUnmuteBtn = document.getElementById("hostUnmuteBtn");
const hostKickBtn = document.getElementById("hostKickBtn");
const hostBanBtn = document.getElementById("hostBanBtn");
const hostTransferBtn = document.getElementById("hostTransferBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const lockRoomBtn = document.getElementById("lockRoomBtn");
const unlockRoomBtn = document.getElementById("unlockRoomBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const toggleGoogleOnlyBtn = document.getElementById("toggleGoogleOnlyBtn");
const toggleGoogleVerifiedBtn = document.getElementById("toggleGoogleVerifiedBtn");

const adminControlsEl = document.getElementById("adminControls");
const adminTargetId = document.getElementById("adminTargetId");
const makeAdminBtn = document.getElementById("makeAdminBtn");
const removeAdminBtn = document.getElementById("removeAdminBtn");
const globalKickBtn = document.getElementById("globalKickBtn");

const dmTargetId = document.getElementById("dmTargetId");
const dmText = document.getElementById("dmText");
const sendDMBtn = document.getElementById("sendDMBtn");
const dmMessagesEl = document.getElementById("dmMessages");
const addFriendBtn = document.getElementById("addFriendBtn");
const removeFriendBtn = document.getElementById("removeFriendBtn");

const profileName = document.getElementById("profileName");
const profileAvatar = document.getElementById("profileAvatar");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileInfo = document.getElementById("profileInfo");

const roomInfoContent = document.getElementById("roomInfoContent");

const emojiBtn = document.getElementById("emojiBtn");
const fileBtn = document.getElementById("fileBtn");

const themeLightBtn = document.getElementById("themeLightBtn");
const themeDarkBtn = document.getElementById("themeDarkBtn");
const themeBlueBtn = document.getElementById("themeBlueBtn");

// STATE
let currentRoomName = null;
let mySocketId = null;
let isHost = false;
let isGlobalAdmin = false;
let currentRoomFlags = { googleOnly: false, googleVerified: false };
window.googleUser = null;
window.oauthUser = null;

// GOOGLE SIGN-IN
window.onload = async function () {
  // Google
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: "37880690107-orfv60c36b5f5qh0d9sm7cr6ncn2kq21.apps.googleusercontent.com",
      callback: handleGoogleLogin
    });
    google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large" }
    );
  }

  // GitHub/Discord OAuth profile
  try {
    const res = await fetch("/auth/me");
    const data = await res.json();
    if (data) {
      window.oauthUser = data;
      signinName.value = data.username;
      signinAvatar.value = data.avatar;
      profileInfo.innerHTML = `<p>Signed in with ${data.provider}: ${data.email || "no email"}</p>`;
    }
  } catch (e) {
    console.log("No OAuth user");
  }
};

function handleGoogleLogin(response) {
  const data = jwt_decode(response.credential);
  window.googleUser = {
    name: data.name,
    avatar: data.picture,
    email: data.email,
    googleId: data.sub
  };
  signinName.value = data.name;
  signinAvatar.value = data.picture;
  profileInfo.innerHTML = `<p>Signed in with Google: ${data.email}</p>`;
}

// OAuth buttons
githubBtn.onclick = () => {
  window.location.href = "/auth/github";
};
discordBtn.onclick = () => {
  window.location.href = "/auth/discord";
};

signinSignOutBtn.onclick = () => {
  window.googleUser = null;
  window.oauthUser = null;
  signinName.value = "";
  signinAvatar.value = "";
  profileInfo.innerHTML = "<p>Manual sign-in</p>";
};

// DRAWERS
openUsersBtn.onclick = () => userDrawer.classList.toggle("open");
openDMsBtn.onclick = () => dmDrawer.classList.toggle("open");

// MODALS
openProfileBtn.onclick = () => {
  profileModal.style.display = "flex";
  profileName.value = signinName.value.trim();
  profileAvatar.value = signinAvatar.value.trim();
  if (window.googleUser) {
    profileInfo.innerHTML = `<p>Google: ${window.googleUser.email}</p>`;
  } else if (window.oauthUser) {
    profileInfo.innerHTML = `<p>${window.oauthUser.provider}: ${window.oauthUser.email || "no email"}</p>`;
  } else {
    profileInfo.innerHTML = "<p>Manual sign-in</p>";
  }
};
openRoomInfoBtn.onclick = () => {
  roomInfoModal.style.display = "flex";
};

document.querySelectorAll(".closeModal").forEach(btn => {
  btn.onclick = () => btn.closest(".modal").style.display = "none";
});

// THEMES
themeLightBtn.onclick = () => {
  document.body.classList.remove("theme-dark","theme-blue");
  document.body.classList.add("theme-light");
};
themeDarkBtn.onclick = () => {
  document.body.classList.remove("theme-light","theme-blue");
  document.body.classList.add("theme-dark");
};
themeBlueBtn.onclick = () => {
  document.body.classList.remove("theme-light","theme-dark");
  document.body.classList.add("theme-blue");
};

// SIGN-IN
signinCreateRoomBtn.onclick = () => {
  const roomName = signinRoomName.value.trim();
  const password = signinRoomPassword.value.trim();
  const googleOnly = signinGoogleOnly.checked;
  const googleVerified = signinGoogleVerified.checked;
  if (!roomName) {
    signinError.textContent = "Room name required.";
    return;
  }
  socket.emit("createRoom", { roomName, password, googleOnly, googleVerified });
  socket.once("roomCreated", () => {
    joinRoom(roomName, password);
  });
};

signinJoinRoomBtn.onclick = () => {
  const roomName = signinRoomName.value.trim();
  const password = signinRoomPassword.value.trim();
  if (!roomName) {
    signinError.textContent = "Room name required.";
    return;
  }
  joinRoom(roomName, password);
};

function joinRoom(roomName, password) {
  let name = signinName.value.trim() || "Guest";
  let avatar = signinAvatar.value.trim();
  let googleId = null;
  let googleEmail = null;
  let oauth = null;

  if (window.googleUser) {
    name = window.googleUser.name;
    avatar = window.googleUser.avatar;
    googleId = window.googleUser.googleId;
    googleEmail = window.googleUser.email;
  }

  if (window.oauthUser) {
    name = window.oauthUser.username;
    avatar = window.oauthUser.avatar;
    oauth = window.oauthUser;
  }

  socket.emit("joinRoom", {
    roomName,
    password,
    name,
    avatar,
    googleId,
    googleEmail,
    oauth
  });
}

socket.on("roomError", (msg) => {
  signinError.textContent = msg;
});

socket.on("joinedRoom", ({ roomName, isHost: hostFlag, yourId, googleOnly, googleVerified }) => {
  currentRoomName = roomName;
  mySocketId = yourId;
  isHost = hostFlag;
  currentRoomFlags.googleOnly = googleOnly;
  currentRoomFlags.googleVerified = googleVerified;

  signinScreen.style.display = "none";

  roomTitle.textContent = `Room: ${roomName}${googleOnly ? " (Google-only)" : ""}${googleVerified ? " (Google-verified)" : ""}`;
  userStatus.textContent = `You: ${yourId}`;

  hostControlsEl.style.display = isHost ? "block" : "none";

  addSystemMessage(`Joined room ${roomName}${isHost ? " as HOST" : ""}`);
});

socket.on("roomFlags", ({ googleOnly, googleVerified }) => {
  currentRoomFlags.googleOnly = googleOnly;
  currentRoomFlags.googleVerified = googleVerified;
  roomTitle.textContent = `Room: ${currentRoomName}${googleOnly ? " (Google-only)" : ""}${googleVerified ? " (Google-verified)" : ""}`;
});

socket.on("userList", (users) => {
  usersEl.innerHTML = "";
  Object.entries(users).forEach(([id, u]) => {
    const div = document.createElement("div");
    div.className = "userItem";
    const googleTag = u.googleId ? `<span class="googleBadge">Google ✓</span>` : "";
    const hostTag = id === mySocketId && isHost ? `<span class="hostBadge">HOST</span>` : "";
    const adminTag = isGlobalAdmin && id === mySocketId ? `<span class="adminBadge">ADMIN</span>` : "";
    const oauthTag = u.oauthProvider ? `<span class="googleBadge">${u.oauthProvider}</span>` : "";
    div.innerHTML = `
      <img class="avatar" src="${u.avatar}">
      <span>${u.name} ${hostTag} ${adminTag} ${googleTag} ${oauthTag}</span>
      <span class="id">${id.slice(0,5)}</span>
      <button onclick="navigator.clipboard.writeText('${id}')">Copy ID</button>
    `;
    usersEl.appendChild(div);
  });

  roomInfoContent.innerHTML = `
    <p>Users: ${Object.keys(users).length}</p>
    <p>Google-only: ${currentRoomFlags.googleOnly ? "Yes" : "No"}</p>
    <p>Google-verified: ${currentRoomFlags.googleVerified ? "Yes" : "No"}</p>
    ${window.googleUser ? `<p>Google: ${window.googleUser.email}</p>` : ""}
    ${window.oauthUser ? `<p>${window.oauthUser.provider}: ${window.oauthUser.email || "no email"}</p>` : ""}
  `;
});

socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  div.className = "msg";
  const googleTag = msg.googleId ? `<span class="googleBadge">Google</span>` : "";
  const emailTag = msg.googleEmail ? ` <span style="font-size:10px;color:#aaa;">${msg.googleEmail}</span>` : "";
  const oauthTag = msg.oauthProvider ? `<span class="googleBadge">${msg.oauthProvider}</span>` : "";
  const oauthEmailTag = msg.oauthEmail ? ` <span style="font-size:10px;color:#aaa;">${msg.oauthEmail}</span>` : "";
  div.innerHTML = `
    <div class="msg-sender">${msg.from} ${msg.isHost ? "(HOST)" : ""} ${googleTag}${emailTag} ${oauthTag}${oauthEmailTag}</div>
    <div>${msg.text}</div>
    <div class="msg-time">${msg.time}</div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

socket.on("clearChat", () => {
  messagesEl.innerHTML = "";
  addSystemMessage("Host cleared the chat.");
});

socket.on("roomStatus", ({ locked }) => {
  roomTitle.textContent = `Room: ${currentRoomName}${locked ? " (Locked)" : ""}${currentRoomFlags.googleOnly ? " (Google-only)" : ""}${currentRoomFlags.googleVerified ? " (Google-verified)" : ""}`;
});

socket.on("muted", (status) => {
  addSystemMessage(status ? "You have been muted by the host." : "You have been unmuted by the host.");
});
socket.on("kicked", () => {
  addSystemMessage("You were kicked by the host.");
});
socket.on("banned", () => {
  addSystemMessage("You were banned by the host.");
});

socket.on("hostStatus", (status) => {
  isHost = status;
  hostControlsEl.style.display = status ? "block" : "none";
  addSystemMessage(status ? "You are now the host." : "You are no longer the host.");
});

socket.on("globalAdmin", (status) => {
  isGlobalAdmin = status;
  adminControlsEl.style.display = status ? "block" : "none";
  addSystemMessage(status ? "You are a global admin." : "You are no longer a global admin.");
});

socket.on("kickedGlobal", () => {
  alert("You were kicked by a global admin.");
  location.reload();
});

// SEND MESSAGE
sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit("sendMessage", text);
  msgInput.value = "";
};

msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

msgInput.addEventListener("input", () => {
  socket.emit("typing");
});

socket.on("typing", (name) => {
  userStatus.textContent = `${name} is typing…`;
  setTimeout(() => {
    userStatus.textContent = `You: ${mySocketId}`;
  }, 1500);
});

// EMOJI
emojiBtn.onclick = () => {
  const emoji = prompt("Enter emoji:");
  if (emoji) msgInput.value += " " + emoji;
};

// FILE
fileBtn.onclick = () => {
  const url = prompt("File URL:");
  const name = prompt("File name:");
  if (!url || !name || !currentRoomName) return;
  socket.emit("shareFile", {
    roomName: currentRoomName,
    fileUrl: url,
    fileName: name
  });
};

socket.on("fileShared", (file) => {
  const div = document.createElement("div");
  div.className = "msg";
  const googleTag = file.googleId ? `<span class="googleBadge">Google</span>` : "";
  const emailTag = file.googleEmail ? ` <span style="font-size:10px;color:#aaa;">${file.googleEmail}</span>` : "";
  const oauthTag = file.oauthProvider ? `<span class="googleBadge">${file.oauthProvider}</span>` : "";
  const oauthEmailTag = file.oauthEmail ? ` <span style="font-size:10px;color:#aaa;">${file.oauthEmail}</span>` : "";
  div.innerHTML = `
    <div class="msg-sender">${file.from} shared a file ${googleTag}${emailTag} ${oauthTag}${oauthEmailTag}</div>
    <div><a href="${file.fileUrl}" target="_blank">${file.fileName}</a></div>
    <div class="msg-time">${file.time}</div>
  `;
  messagesEl.appendChild(div);
});

// HOST CONTROLS
hostMuteBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostAction", { action: "mute", targetId: hostTargetId.value.trim() });
};
hostUnmuteBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostAction", { action: "unmute", targetId: hostTargetId.value.trim() });
};
hostKickBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostAction", { action: "kick", targetId: hostTargetId.value.trim() });
};
hostBanBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostAction", { action: "ban", targetId: hostTargetId.value.trim() });
};
hostTransferBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostAction", { action: "transferHost", targetId: hostTargetId.value.trim() });
};
clearChatBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostRoomControl", { action: "clearChat" });
};
lockRoomBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostRoomControl", { action: "lockRoom" });
};
unlockRoomBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostRoomControl", { action: "unlockRoom" });
};
changePasswordBtn.onclick = () => {
  if (!isHost) return;
  const newPass = prompt("New room password (blank for none):");
  socket.emit("hostRoomControl", { action: "changePassword", value: newPass });
};
toggleGoogleOnlyBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostRoomControl", { action: "toggleGoogleOnly" });
};
toggleGoogleVerifiedBtn.onclick = () => {
  if (!isHost) return;
  socket.emit("hostRoomControl", { action: "toggleGoogleVerified" });
};

// ADMIN CONTROLS
makeAdminBtn.onclick = () => {
  if (!isGlobalAdmin) return;
  const id = adminTargetId.value.trim();
  if (id) socket.emit("globalAdminAction", { action: "makeAdmin", targetId: id });
};
removeAdminBtn.onclick = () => {
  if (!isGlobalAdmin) return;
  const id = adminTargetId.value.trim();
  if (id) socket.emit("globalAdminAction", { action: "removeAdmin", targetId: id });
};
globalKickBtn.onclick = () => {
  if (!isGlobalAdmin) return;
  const id = adminTargetId.value.trim();
  if (id) socket.emit("globalAdminAction", { action: "globalKick", targetId: id });
};

// DM
sendDMBtn.onclick = () => {
  const toId = dmTargetId.value.trim();
  const text = dmText.value.trim();
  if (!toId || !text) return;
  socket.emit("sendDM", { toId, text });
  const div = document.createElement("div");
  div.textContent = `[You -> ${toId.slice(0,5)}] ${text}`;
  dmMessagesEl.appendChild(div);
  dmText.value = "";
};

socket.on("dmMessage", (msg) => {
  const googleTag = msg.googleId ? " (Google)" : "";
  const emailTag = msg.googleEmail ? ` [${msg.googleEmail}]` : "";
  const oauthTag = msg.oauthProvider ? ` (${msg.oauthProvider})` : "";
  const oauthEmailTag = msg.oauthEmail ? ` [${msg.oauthEmail}]` : "";
  const div = document.createElement("div");
  div.textContent = `[DM from ${msg.fromName}${googleTag}${emailTag}${oauthTag}${oauthEmailTag}] ${msg.text} (${msg.time})`;
  dmMessagesEl.appendChild(div);
});

// FRIENDS
addFriendBtn.onclick = () => {
  const id = prompt("Socket ID to add as friend:");
  if (id) socket.emit("addFriend", id.trim());
};
removeFriendBtn.onclick = () => {
  const id = prompt("Socket ID to remove from friends:");
  if (id) socket.emit("removeFriend", id.trim());
};

socket.on("friendsList", (friends) => {
  addSystemMessage("Friends: " + friends.map(id => id.slice(0,5)).join(", "));
});

// PROFILE SAVE
saveProfileBtn.onclick = () => {
  const name = profileName.value.trim();
  const avatar = profileAvatar.value.trim();
  if (name) socket.emit("changeName", name);
  if (avatar) socket.emit("changeAvatar", avatar);
  profileModal.style.display = "none";
};

// RTC stub
socket.on("rtcSignal", ({ fromId, data }) => {
  console.log("RTC signal from", fromId, data);
});

// HELPERS
function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `
    <div class="msg-sender">System</div>
    <div>${text}</div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
