const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Rooms structure
// rooms = {
//   roomName: {
//     password: "123",
//     locked: false,
//     hostId: "socketid",
//     users: {
//       socketid: { name, avatar, muted }
//     },
//     banned: [socketid]
//   }
// }
let rooms = {};

function createRoom(roomName, password) {
  rooms[roomName] = {
    password,
    locked: false,
    hostId: null,
    users: {},
    banned: []
  };
}

io.on("connection", (socket) => {
  socket.data.room = null;

  socket.on("createRoom", ({ roomName, password }) => {
    if (rooms[roomName]) {
      socket.emit("roomError", "Room already exists");
      return;
    }
    createRoom(roomName, password);
    socket.emit("roomCreated", roomName);
    io.emit("roomList", Object.keys(rooms));
  });

  socket.on("joinRoom", ({ roomName, password, name, avatar }) => {
    const room = rooms[roomName];
    if (!room) {
      socket.emit("roomError", "Room does not exist");
      return;
    }
    if (room.locked) {
      socket.emit("roomError", "Room is locked");
      return;
    }
    if (room.password !== password) {
      socket.emit("roomError", "Incorrect password");
      return;
    }
    if (room.banned.includes(socket.id)) {
      socket.emit("roomError", "You are banned from this room");
      return;
    }

    socket.join(roomName);
    socket.data.room = roomName;

    room.users[socket.id] = {
      name,
      avatar,
      muted: false
    };

    if (!room.hostId) room.hostId = socket.id;

    socket.emit("joinedRoom", {
      roomName,
      isHost: socket.id === room.hostId
    });

    io.to(roomName).emit("userList", room.users);
  });

  socket.on("leaveRoom", () => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
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

  socket.on("sendMessage", (msg) => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    const user = room.users[socket.id];
    if (!user || user.muted) return;

    io.to(roomName).emit("chatMessage", {
      from: user.name,
      avatar: user.avatar,
      isHost: socket.id === room.hostId,
      text: msg
    });
  });

  // Guest controls
  socket.on("changeName", (newName) => {
    const roomName = socket.data.room;
    if (!roomName) return;
    rooms[roomName].users[socket.id].name = newName;
    io.to(roomName).emit("userList", rooms[roomName].users);
  });

  socket.on("changeAvatar", (newAvatar) => {
    const roomName = socket.data.room;
    if (!roomName) return;
    rooms[roomName].users[socket.id].avatar = newAvatar;
    io.to(roomName).emit("userList", rooms[roomName].users);
  });

  // Host controls
  socket.on("hostAction", ({ action, targetId }) => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    if (socket.id !== room.hostId) return;

    switch (action) {
      case "mute":
        room.users[targetId].muted = true;
        io.to(targetId).emit("muted", true);
        break;

      case "unmute":
        room.users[targetId].muted = false;
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

  socket.on("hostRoomControl", ({ action, value }) => {
    const roomName = socket.data.room;
    if (!roomName) return;

    const room = rooms[roomName];
    if (socket.id !== room.hostId) return;

    switch (action) {
      case "clearChat":
        io.to(roomName).emit("clearChat");
        break;

      case "lockRoom":
        room.locked = true;
        break;

      case "unlockRoom":
        room.locked = false;
        break;

      case "changePassword":
        room.password = value;
        break;
    }
  });

  socket.on("disconnect", () => {
    const roomName = socket.data.room;
    if (!roomName) return;

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
  });

  io.emit("roomList", Object.keys(rooms));
});

http.listen(PORT, () => console.log("ChatTy Ultra running"));
