const socket = io();

// Room menu elements
const roomMenu = document.getElementById("roomMenu");
const newRoomName = document.getElementById("newRoomName");
const newRoomPassword = document.getElementById("newRoomPassword");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomListEl = document.getElementById("roomList");
const joinRoomName = document.getElementById("joinRoomName");
const joinRoomPassword = document.getElementById("joinRoomPassword");
const joinName = document.getElementById("joinName");
const joinAvatar = document.getElementById("joinAvatar");
const joinRoomBtn = document.getElementById("joinRoomBtn");

// Chat UI elements
const chatUI = document.getElementById("chatUI");
const usersEl = document.getElementById("users");
const hostControlsEl = document.getElementById("hostControls");
const hostTargetId = document.getElementById("hostTargetId");
const clearChatBtn = document.getElementById("clearChatBtn");
const lockRoomBtn = document.getElementById("lockRoomBtn");
const unlockRoomBtn = document.getElementById("unlockRoomBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const hostMuteBtn = document.getElementById("hostMuteBtn");
const hostUnmuteBtn = document.getElementById("hostUnmuteBtn");
const hostKickBtn = document.getElementById("hostKickBtn");
const hostBanBtn = document.getElementById("hostBanBtn");
const hostTransferBtn = document.getElementById("hostTransferBtn");

const changeNameBtn = document.getElementById("changeNameBtn");
const changeAvatarBtn = document.getElementById("changeAvatarBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");

const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

const roomNameLabel = document.getElementById("roomNameLabel");
const roomStatusLabel = document.getElementById("roomStatusLabel");
const yourIdLabel = document.getElementById("yourIdLabel");

// Extra controls
const openDMBtn = document.getElementById("openDMBtn");
const addFriendBtn = document.getElementById("addFriendBtn");
const removeFriendBtn = document.getElementById("removeFriendBtn");
const emojiPicker = document.getElementById("emojiPicker");
const fileUrlInput = document.getElementById("fileUrlInput");
const fileNameInput = document.getElementById("fileNameInput");
const shareFileBtn = document.getElementById("shareFileBtn");
const adminControlsEl = document.getElementById("adminControls");
const adminTargetId = document.getElementById("adminTargetId");
const makeAdminBtn = document.getElementById("makeAdminBtn");
const removeAdminBtn = document.getElementById("removeAdminBtn");
const globalKickBtn = document.getElementById("globalKickBtn");

// DM panel
const dmPanel = document.getElementById("dmPanel");
const dmTargetId = document.getElementById("dmTargetId");
const dmText = document.getElementById("dmText");
const sendDMBtn = document.getElementById("sendDMBtn");
const dmMessagesEl = document.getElementById("dmMessages");

let currentRoomName = null;
let isHost = false;
let isGlobalAdmin = false;
let mySocketId = null;

// Room list
socket.on("roomList", (rooms) => {
  roomListEl.innerHTML = "";
  rooms.forEach(r => {
    const div = document.createElement("div");
    div.textContent = r;
    div.style.cursor = "pointer";
    div.onclick = () => {
      joinRoomName.value = r;
    };
    roomListEl.appendChild(div);
  });
});

// Create room
createRoomBtn.onclick = () => {
  socket.emit("createRoom", {
    roomName: newRoomName.value.trim(),
    password: newRoomPassword.value.trim()
  });
};

socket.on("roomCreated", (roomName) => {
  alert("Room created: " + roomName);
});

// Join room
joinRoomBtn.onclick = () => {
  socket.emit("joinRoom", {
    roomName: joinRoomName.value.trim(),
    password: joinRoomPassword.value.trim(),
    name: joinName.value.trim(),
    avatar: joinAvatar.value.trim()
  });
};

socket.on("roomError", (msg) => {
  alert(msg);
});

socket.on("joinedRoom", ({ roomName, isHost: hostFlag, yourId }) => {
  currentRoomName = roomName;
  isHost = hostFlag;
  mySocketId = yourId;

  roomMenu.style.display = "none";
  chatUI.style.display = "flex";

  roomNameLabel.textContent = "Room: " + roomName;
  yourIdLabel.textContent = "Your ID: " + yourId;

  if (isHost) {
    hostControlsEl.style.display = "block";
  } else {
    hostControlsEl.style.display = "none";
  }

  addSystemMessage("Joined room " + roomName + (isHost ? " as HOST" : ""));
});

// User list
socket.on("userList", (users) => {
  usersEl.innerHTML = "";
  Object.entries(users).forEach(([id, u]) => {
    const div = document.createElement("div");
    div.className = "userItem";
    const img = document.createElement("img");
    img.className = "avatar";
    img.src = u.avatar;
    const label = document.createElement("span");
    label.textContent = `${u.name} (${id.slice(0, 5)})${u.muted ? " [Muted]" : ""}`;
    div.appendChild(img);
    div.appendChild(label);
    usersEl.appendChild(div);
  });
});

// Chat messages
socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  div.className = "msg" + (msg.isHost ? " msg-host" : "");
  div.innerHTML = `
    <img class="avatar" src="${msg.avatar}">
    <strong>${msg.from}</strong>: ${msg.text}
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

// Clear chat
socket.on("clearChat", () => {
  messagesEl.innerHTML = "";
  addSystemMessage("Host cleared the chat.");
});

// Room status
socket.on("roomStatus", ({ locked }) => {
  roomStatusLabel.textContent = locked ? " (Locked)" : " (Open)";
});

// Muted status
socket.on("muted", (status) => {
  addSystemMessage(status ? "You have been muted by the host." : "You have been unmuted by the host.");
});

// Kicked / banned
socket.on("kicked", () => {
  addSystemMessage("You were kicked by the host.");
});
socket.on("banned", () => {
  addSystemMessage("You were banned by the host.");
});

// Host status transfer
socket.on("hostStatus", (status) => {
  isHost = status;
  hostControlsEl.style.display = status ? "block" : "none";
  addSystemMessage(status ? "You are now the host." : "You are no longer the host.");
});

// Global admin
socket.on("globalAdmin", (status) => {
  isGlobalAdmin = status;
  adminControlsEl.style.display = status ? "block" : "none";
  addSystemMessage(status ? "You are a global admin." : "You are no longer a global admin.");
});

socket.on("kickedGlobal", () => {
  alert("You were kicked by a global admin.");
  location.reload();
});

// Send message
sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit("sendMessage", text);
  msgInput.value = "";
};

msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Emoji picker
emojiPicker.onchange = () => {
  if (emojiPicker.value) {
    msgInput.value += " " + emojiPicker.value;
    emojiPicker.value = "";
  }
};

// Guest controls
changeNameBtn.onclick = () => {
  const newName = prompt("New name:");
  if (newName) socket.emit("changeName", newName);
};

changeAvatarBtn.onclick = () => {
  const newAvatar = prompt("New avatar URL:");
  if (newAvatar) socket.emit("changeAvatar", newAvatar);
};

leaveRoomBtn.onclick = () => {
  socket.emit("leaveRoom");
  location.reload();
};

// Host room controls
clearChatBtn.onclick = () => {
  if (isHost) socket.emit("hostRoomControl", { action: "clearChat" });
};
lockRoomBtn.onclick = () => {
  if (isHost) socket.emit("hostRoomControl", { action: "lockRoom" });
};
unlockRoomBtn.onclick = () => {
  if (isHost) socket.emit("hostRoomControl", { action: "unlockRoom" });
};
changePasswordBtn.onclick = () => {
  if (!isHost) return;
  const newPass = prompt("New room password (blank for none):");
  socket.emit("hostRoomControl", { action: "changePassword", value: newPass });
};

// Host per-user controls
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

// DM panel
openDMBtn.onclick = () => {
  dmPanel.style.display = dmPanel.style.display === "none" ? "block" : "none";
};

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
  const div = document.createElement("div");
  div.textContent = `[DM from ${msg.fromName} (${msg.fromId.slice(0,5)})] ${msg.text}`;
  dmMessagesEl.appendChild(div);
});

// Friends
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

// File sharing
shareFileBtn.onclick = () => {
  const fileUrl = fileUrlInput.value.trim();
  const fileName = fileNameInput.value.trim();
  if (!fileUrl || !fileName || !currentRoomName) return;
  socket.emit("shareFile", {
    roomName: currentRoomName,
    fileUrl,
    fileName
  });
};

socket.on("fileShared", (file) => {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `
    <img class="avatar" src="${file.avatar}">
    <strong>${file.from}</strong> shared:
    <a href="${file.fileUrl}" target="_blank">${file.fileName}</a>
  `;
  messagesEl.appendChild(div);
});

// Global admin actions
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

// Themes
document.querySelectorAll(".themeBtn").forEach(btn => {
  btn.onclick = () => {
    const theme = btn.dataset.theme;
    document.body.classList.remove("theme-light","theme-dark","theme-blue");
    document.body.classList.add("theme-" + theme);
  };
});

// WebRTC signaling stub
socket.on("rtcSignal", ({ fromId, data }) => {
  console.log("RTC signal from", fromId, data);
  // Hook this into RTCPeerConnection if you implement voice/video
});

// Helpers
function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "msg msg-system";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
