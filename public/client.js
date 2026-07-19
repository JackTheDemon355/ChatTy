const socket = io();

const roomMenu = document.getElementById("roomMenu");
const chatUI = document.getElementById("chatUI");
const roomListEl = document.getElementById("roomList");
const usersEl = document.getElementById("users");
const messagesEl = document.getElementById("messages");

document.getElementById("createRoomBtn").onclick = () => {
  socket.emit("createRoom", {
    roomName: newRoomName.value,
    password: newRoomPassword.value
  });
};

socket.on("roomCreated", (roomName) => {
  alert("Room created: " + roomName);
});

socket.on("roomList", (rooms) => {
  roomListEl.innerHTML = rooms.map(r => `<div>${r}</div>`).join("");
});

document.getElementById("joinRoomBtn").onclick = () => {
  socket.emit("joinRoom", {
    roomName: joinRoomName.value,
    password: joinRoomPassword.value,
    name: joinName.value,
    avatar: joinAvatar.value
  });
};

socket.on("joinedRoom", ({ roomName, isHost }) => {
  roomMenu.style.display = "none";
  chatUI.style.display = "flex";

  if (isHost) {
    document.getElementById("hostControls").style.display = "block";
  }
});

socket.on("roomError", (msg) => alert(msg));

socket.on("userList", (users) => {
  usersEl.innerHTML = "";
  Object.entries(users).forEach(([id, u]) => {
    const div = document.createElement("div");
    div.className = "userItem";
    div.innerHTML = `
      <img class="avatar" src="${u.avatar}">
      ${u.name}
    `;
    usersEl.appendChild(div);
  });
});

document.getElementById("sendBtn").onclick = () => {
  socket.emit("sendMessage", msgInput.value);
  msgInput.value = "";
};

socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  div.innerHTML = `
    <img class="avatar" src="${msg.avatar}">
    <strong>${msg.from}</strong>: ${msg.text}
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

socket.on("clearChat", () => {
  messagesEl.innerHTML = "";
});

document.getElementById("changeNameBtn").onclick = () => {
  const newName = prompt("New name:");
  socket.emit("changeName", newName);
};

document.getElementById("changeAvatarBtn").onclick = () => {
  const newAvatar = prompt("New avatar URL:");
  socket.emit("changeAvatar", newAvatar);
};

document.getElementById("leaveRoomBtn").onclick = () => {
  socket.emit("leaveRoom");
  location.reload();
};

// Host controls
document.getElementById("clearChatBtn").onclick = () => {
  socket.emit("hostRoomControl", { action: "clearChat" });
};

document.getElementById("lockRoomBtn").onclick = () => {
  socket.emit("hostRoomControl", { action: "lockRoom" });
};

document.getElementById("unlockRoomBtn").onclick = () => {
  socket.emit("hostRoomControl", { action: "unlockRoom" });
};

document.getElementById("changePasswordBtn").onclick = () => {
  const newPass = prompt("New password:");
  socket.emit("hostRoomControl", { action: "changePassword", value: newPass });
};
