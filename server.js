const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// rooms = {
//   roomName: {
//     password,
//     locked,
//     hostId,
//     users: { socketId: { name, avatar, muted, googleId, googleEmail } },
//     banned: [socketId],
//     googleOnly: false,
//     googleVerified: false
//   }
// }
let rooms = {};
let globalAdmins = new Set(); // socket IDs
let globalAdminEmails = new Set([
  // add your Google emails here for auto-admin
  "youremail@example.com"
]);

let profiles = {}; // socketId -> { friends: [socketId], name, avatar, googleId, googleEmail }

function createRoom(roomName, password, googleOnly, googleVerified) {
  rooms[roomName] = {
    password: password || "",
    locked: false,
    hostId: null,
    users: {},
    banned: [],
    googleOnly: !!googleOnly,
    googleVerified: !!googleVerified
  };
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);
  socket.data.room = null;

  profiles[socket.id] = {
    friends: [],
    name: "User",
    avatar: "",
    googleId: null,
    googleEmail: null
  };

  // First connection becomes global admin (fallback)
  if (globalAdmins.size === 0) {
    globalAdmins.add(socket.id);
    socket.emit("globalAdmin", true);
  }

  socket.emit("roomList", Object.keys(rooms));

  // Create room
  socket.on("createRoom", ({ roomName, password, googleOnly, googleVerified }) => {
    if (!roomName) return;
    if (rooms[roomName]) {
      socket.emit("roomError", "Room already exists");
      return;
    }
    createRoom(roomName, password, googleOnly, googleVerified);
    socket.emit("roomCreated", roomName);
    io.emit("roomList", Object.keys(rooms));
  });

  // Join room (sign-in + join)
  socket.on("joinRoom", ({ roomName, password, name, avatar, googleId, googleEmail }) => {
    const room = rooms[roomName];
    if (!room) {
      socket.emit("roomError", "Room does not exist");
      return;
    }
    if (room.locked) {
      socket.emit("roomError", "Room is locked");
      return;
    }
    if (room.password !== (password || "")) {
      socket.emit("roomError", "Incorrect password");
      return;
    }
    if (room.banned.includes(socket.id)) {
      socket.emit("roomError", "You are banned from this room");
      return;
    }

    // Google-only access rooms
    if (room.googleOnly && !googleId) {
      socket.emit("roomError", "This room requires Google Sign-In.");
      return;
    }

    socket.join(roomName);
    socket.data.room = roomName;

    const userName = name || `User-${socket.id.slice(0, 4)}`;
    const userAvatar = avatar || "https://via.placeholder.com/30";

    room.users[socket.id] = {
      name: userName,
      avatar: userAvatar,
      muted: false,
      googleId: googleId || null,
      googleEmail: googleEmail || null
    };

    profiles[socket.id].name = userName;
    profiles[socket.id].avatar = userAvatar;
    profiles[socket.id].googleId = googleId || null;
    profiles[socket.id].googleEmail = googleEmail || null;

    // Host assignment
    if (!room.hostId) room.hostId = socket.id;

    // Google-based admin roles (by email)
    if (googleEmail && globalAdminEmails.has(googleEmail)) {
      globalAdmins.add(socket.id);
      socket.emit("globalAdmin", true);
    }

    // Google-verified rooms: mark if host has Google
    if (room.googleVerified && !profiles[room.hostId]?.googleId) {
      room.googleVerified = false; // fallback if host not Google
    }

    socket.emit("joinedRoom", {
      roomName,
      isHost: socket.id === room.hostId,
      yourId: socket.id,
      googleOnly: room.googleOnly,
      googleVerified: room.googleVerified
    });

    io.to(roomName).emit("userList", room.users);
  });

  // Leave room
  socket.on("leaveRoom", () => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    if (!room) return;

    delete room.users[socket.id];
    socket.leave(roomName);
    socket.data.room = null;

    if (socket.id === room.hostId) {
      const remaining = Object.keys(room.users);
      room.hostId = remaining[0] || null;
      if (room.hostId) {
        io.to(room.hostId).emit("hostStatus", true);
      }
    }

    io.to(roomName).emit("userList", room.users);
  });

  // Chat message
  socket.on("sendMessage", (text) => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    const user = room.users[socket.id];
    if (!user || user.muted) return;

    io.to(roomName).emit("chatMessage", {
      fromId: socket.id,
      from: user.name,
      avatar: user.avatar,
      isHost: socket.id === room.hostId,
      googleId: user.googleId || null,
      googleEmail: user.googleEmail || null,
      text,
      time: new Date().toLocaleTimeString()
    });
  });

  // Typing indicator
  socket.on("typing", () => {
    const roomName = socket.data.room;
    if (!roomName) return;
    const room = rooms[roomName];
    const user = room.users[socket.id];
    if (!user) return;
    io.to(roomName).emit("typing", user.name);
  });

  // Guest: change name
  socket.on("changeName", (newName) => {
    const roomName = socket.data.room;
    if (!roomName || !newName) return;
    const room = rooms[roomName];
    if (!room.users[socket.id]) return;

    room.users[socket.id].name = newName;
    profiles[socket.id].name = newName;
    io.to(roomName).emit("userList", room.users);
  });

  // Guest: change avatar
  socket.on("changeAvatar", (newAvatar) => {
    const roomName = socket.data.room;
    if (!roomName || !newAvatar) return;
    const room = rooms[roomName];
    if (!room.users[socket.id]) return;

    room.users[socket.id].avatar = newAvatar;
    profiles[socket.id].avatar = newAvatar;
    io.to(roomName).emit("userList", room.users);
  });

  // Host actions on users
  socket.on("hostAction", ({ action, targetId }) => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    if (!room || socket.id !== room.hostId) return;

    const targetUser = room.users[targetId];
    if (!targetUser) return;

    switch (action) {
      case "mute":
        targetUser.muted = true;
        io.to(targetId).emit("muted", true);
        break;
      case "unmute":
        targetUser.muted = false;
        io.to(targetId).emit("muted", false);
        break;
      case "kick":
        io.to(targetId).emit("kicked");
        io.sockets.sockets.get(targetId)?.leave(roomName);
        delete room.users[targetId];
        break;
      case "ban":
        room.banned.push(targetId);
        io.to(targetId).emit("banned");
        io.sockets.sockets.get(targetId)?.leave(roomName);
        delete room.users[targetId];
        break;
      case "transferHost":
        room.hostId = targetId;
        io.to(targetId).emit("hostStatus", true);
        break;
    }

    io.to(roomName).emit("userList", room.users);
  });

  // Host room controls
  socket.on("hostRoomControl", ({ action, value }) => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    if (!room || socket.id !== room.hostId) return;

    switch (action) {
      case "clearChat":
        io.to(roomName).emit("clearChat");
        break;
      case "lockRoom":
        room.locked = true;
        io.to(roomName).emit("roomStatus", { locked: true });
        break;
      case "unlockRoom":
        room.locked = false;
        io.to(roomName).emit("roomStatus", { locked: false });
        break;
      case "changePassword":
        room.password = value || "";
        break;
      case "toggleGoogleOnly":
        room.googleOnly = !room.googleOnly;
        io.to(roomName).emit("roomFlags", {
          googleOnly: room.googleOnly,
          googleVerified: room.googleVerified
        });
        break;
      case "toggleGoogleVerified":
        room.googleVerified = !room.googleVerified;
        io.to(roomName).emit("roomFlags", {
          googleOnly: room.googleOnly,
          googleVerified: room.googleVerified
        });
        break;
    }
  });

  // Direct messages
  socket.on("sendDM", ({ toId, text }) => {
    const fromProfile = profiles[socket.id];
    if (!fromProfile || !toId || !text) return;

    io.to(toId).emit("dmMessage", {
      fromId: socket.id,
      fromName: fromProfile.name,
      googleId: fromProfile.googleId || null,
      googleEmail: fromProfile.googleEmail || null,
      text,
      time: new Date().toLocaleTimeString()
    });
  });

  // Friends system
  socket.on("addFriend", (targetId) => {
    if (!profiles[socket.id] || !profiles[targetId]) return;
    if (!profiles[socket.id].friends.includes(targetId)) {
      profiles[socket.id].friends.push(targetId);
    }
    socket.emit("friendsList", profiles[socket.id].friends);
  });

  socket.on("removeFriend", (targetId) => {
    if (!profiles[socket.id]) return;
    profiles[socket.id].friends = profiles[socket.id].friends.filter(id => id !== targetId);
    socket.emit("friendsList", profiles[socket.id].friends);
  });

  // Global admin actions
  socket.on("globalAdminAction", ({ action, targetId }) => {
    if (!globalAdmins.has(socket.id)) return;

    switch (action) {
      case "makeAdmin":
        globalAdmins.add(targetId);
        io.to(targetId).emit("globalAdmin", true);
        break;
      case "removeAdmin":
        globalAdmins.delete(targetId);
        io.to(targetId).emit("globalAdmin", false);
        break;
      case "globalKick":
        io.to(targetId).emit("kickedGlobal");
        io.sockets.sockets.get(targetId)?.disconnect(true);
        break;
    }
  });

  // File sharing (URL-based)
  socket.on("shareFile", ({ roomName, fileUrl, fileName }) => {
    const room = rooms[roomName];
    if (!room) return;
    const user = room.users[socket.id];
    if (!user || !fileUrl || !fileName) return;

    io.to(roomName).emit("fileShared", {
      from: user.name,
      avatar: user.avatar,
      googleId: user.googleId || null,
      googleEmail: user.googleEmail || null,
      fileUrl,
      fileName,
      time: new Date().toLocaleTimeString()
    });
  });

  // WebRTC signaling stub (for future voice/video)
  socket.on("rtcSignal", ({ toId, data }) => {
    io.to(toId).emit("rtcSignal", {
      fromId: socket.id,
      data
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const roomName = socket.data.room;
    if (roomName && rooms[roomName]) {
      const room = rooms[roomName];
      delete room.users[socket.id];

      if (socket.id === room.hostId) {
        const remaining = Object.keys(room.users);
        room.hostId = remaining[0] || null;
        if (room.hostId) {
          io.to(room.hostId).emit("hostStatus", true);
        }
      }

      io.to(roomName).emit("userList", room.users);
    }

    delete profiles[socket.id];
    globalAdmins.delete(socket.id);
    console.log("Disconnected:", socket.id);
  });
});

http.listen(PORT, () => {
  console.log(`ChatTy Ultra+ running on port ${PORT}`);
});
