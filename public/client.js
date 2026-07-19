const socket = io();

// SIGN-IN ELEMENTS
const signinScreen = document.getElementById("signinScreen");
const signinName = document.getElementById("signinName");
const signinAvatar = document.getElementById("signinAvatar");
const signinRoomName = document.getElementById("signinRoomName");
const signinRoomPassword = document.getElementById("signinRoomPassword");
const signinCreateRoomBtn = document.getElementById("signinCreateRoomBtn");
const signinJoinRoomBtn = document.getElementById("signinJoinRoomBtn");
const signinError = document.getElementById("signinError");

// TOP/BOTTOM
const roomTitle = document.getElementById("roomTitle");
const userStatus = document.getElementById("userStatus");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

// DRAWERS & MODALS
const userDrawer = document.getElementById("userDrawer");
const dmDrawer = document.getElementById("dmDrawer");
const profileModal = document.getElementById("profileModal");
const roomInfoModal = document.getElementById("roomInfoModal");

const openUsersBtn = document.getElementById("openUsersBtn");
const openDMsBtn = document.getElementById("openDMsBtn");
const openProfileBtn = document.getElementById("openProfileBtn");
const openRoomInfoBtn = document.getElementById("openRoomInfoBtn");

const usersEl = document.getElementById("users");

// Host controls
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

// Admin controls
const adminControlsEl = document.getElementById("adminControls");
const adminTargetId = document.getElementById("adminTargetId");
const makeAdminBtn = document.getElementById("makeAdminBtn");
const removeAdminBtn = document.getElementById("removeAdminBtn");
const globalKickBtn = document.getElementById("globalKickBtn");

// DM & friends
const dmTargetId = document.getElementById("dmTargetId");
const dmText = document.getElementById("dmText");
const sendDMBtn = document.getElementById("sendDMBtn");
const dmMessagesEl = document.getElementById("dmMessages");
const addFriendBtn = document.getElementById("addFriendBtn");
const removeFriendBtn = document.getElementById("removeFriendBtn");

// Profile modal
const profileName = document.getElementById("profileName");
const profileAvatar = document.getElementById("profileAvatar");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileInfo = document.getElementById("profileInfo");

// Room info modal
const roomInfoContent = document.getElementById("roomInfoContent");

// Emoji & file
const emojiBtn = document.getElementById("emojiBtn");
const fileBtn = document.getElementById("fileBtn");

// STATE
let currentRoomName = null;
let mySocketId = null;
let isHost = false;
let isGlobalAdmin = false;
window.googleUser = null;

// GOOGLE SIGN-IN INIT
window.onload = function () {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: "YOUR_GOOGLE_CLIENT_ID_HERE",
      callback: handleGoogleLogin
    });

    google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large" }
    );
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
}

// DRAWER TOGGLES
openUsersBtn.onclick = () => userDrawer.classList.toggle("open");
openDMsBtn.onclick = () => dmDrawer.classList.toggle("open");

// MODAL TOGGLES
openProfileBtn.onclick = () => {
  profileModal.style.display = "flex";
  profileName.value = signinName.value.trim();
  profileAvatar.value = signinAvatar.value.trim();
  profileInfo.innerHTML = window.googleUser ? "<p>Signed in with Google</p>" : "<p>Manual sign-in</p>";
};
openRoomInfoBtn.onclick = () => roomInfoModal.style.display = "flex";

document.querySelectorAll(".closeModal").forEach(btn => {
  btn.onclick = () => btn.closest(".modal").style.display = "none";
});

// SIGN-IN LOGIC
signinCreateRoomBtn.onclick = () => {
  const roomName = signinRoomName.value.trim();
  const password = signinRoomPassword.value.trim();
  if (!roomName) {
    signinError.textContent = "Room name required.";
    return;
  }
  socket.emit("createRoom", { roomName, password });
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

  if (window.googleUser) {
    name = window.googleUser.name;
    avatar = window.googleUser.avatar;
  }

  socket.emit("joinRoom", {
    roomName,
    password,
    name,
    avatar,
    googleId: window.googleUser ? window.googleUser.googleId : null
  });
}

socket.on("roomError", (msg) => {
  signinError.textContent = msg;
});

socket.on("joinedRoom", ({ roomName, isHost: hostFlag, yourId }) => {
  currentRoomName = roomName;
  mySocketId = yourId;
  isHost = hostFlag;

  signinScreen.style.display = "none";

  roomTitle.textContent = `Room: ${roomName}`;
  userStatus.textContent = `You: ${yourId}`;

  hostControlsEl.style.display = isHost ? "block" : "none";

  addSystemMessage(`Joined room ${roomName}${isHost ? " as HOST" : ""}`);
});

// ROOM LIST (optional)
socket.on("roomList", (rooms) => {
  console.log("Rooms:", rooms);
});

// USER LIST
socket.on("userList", (users) => {
  usersEl.innerHTML = "";
  Object.entries(users).forEach(([id, u]) => {
    const div = document.createElement("div");
    div.className = "userItem";
    const googleTag = u.googleId ? `<span class="googleBadge">Google ✓</span>` : "";
    div.innerHTML = `
      <img class="avatar" src="${u.avatar}">
      <span>${u.name} ${googleTag}</span>
      <span class="id">${id.slice(0,5)}</span>
      <button onclick="navigator.clipboard.writeText('${id}')">Copy ID</button>
    `;
    usersEl.appendChild(div);
  });

  roomInfoContent.innerHTML = `
    <p>Users: ${Object.keys(users).length}</p>
    <p>Host: ${Object.entries(users).find(([id]) => id === mySocketId && isHost) ? "You" : "Someone else"}</p>
    ${window.googleUser ? "<p>You are signed in with Google</p>" : "<p>You are not using Google</p>"}
  `;
});

// CHAT MESSAGE
socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  div.className = "msg";
  const googleTag = msg.googleId ? `<span class="googleBadge">Google</span>` : "";
  div.innerHTML = `
    <div class="msg-sender">${msg.from} ${msg.isHost ? "(HOST)" : ""} ${googleTag}</div>
    <div>${msg.text}</div>
    <div class="msg-time">${msg.time}</div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

// CLEAR CHAT
socket.on("clearChat", () => {
  messagesEl.innerHTML = "";
  addSystemMessage("Host cleared the chat.");
});

// ROOM STATUS
socket.on("roomStatus", ({ locked }) => {
  roomTitle.textContent = `Room: ${currentRoomName}${locked ? " (Locked)" : ""}`;
});

// MUTED / KICKED / BANNED
socket.on("muted", (status) => {
  addSystemMessage(status ? "You have been muted by the host." : "You have been unmuted by the host.");
});
socket.on("kicked", () => {
  addSystemMessage("You were kicked by the host.");
});
socket.on("banned", () => {
  addSystemMessage("You were banned by the host.");
});

// HOST STATUS
socket.on("hostStatus", (status) => {
  isHost = status;
  hostControlsEl.style.display = status ? "block" : "none";
  addSystemMessage(status ? "You are now the host." : "You are no longer the host.");
});

// GLOBAL ADMIN
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

// TYPING
msgInput.addEventListener("input", () => {
  socket.emit("typing");
});

socket.on("typing", (name) => {
  userStatus.textContent = `${name} is typing…`;
  setTimeout(() => {
    userStatus.textContent = `You: ${mySocketId}`;
  }, 1500);
});

// EMOJI (simple)
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
  div.innerHTML = `
    <div class="msg-sender">${file.from} shared a file ${googleTag}</div>
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
  const div = document.createElement("div");
  div.textContent = `[DM from ${msg.fromName}${googleTag}] ${msg.text} (${msg.time})`;
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

// WEBRTC SIGNAL STUB
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
