const { io } = require('socket.io-client');

const SERVER_URL = 'http://127.0.0.1:3000';

async function runMultiplayerTest() {
  console.log("Starting multiplayer test...");

  // Client 1: Host
  const client1 = io(SERVER_URL, { auth: { token: 'token_user_1' } });
  
  await new Promise((resolve) => client1.on('connect', resolve));
  console.log("Client 1 connected:", client1.id);

  // Host creates room
  client1.emit('create_room', {
    playerName: 'Jassi (Host)',
    avatar: 'punjabi_f1',
    mode: 'single_sar',
    targetScore: 7,
    botDifficulty: 'medium'
  });

  const roomData = await new Promise((resolve) => {
    client1.on('room_created', resolve);
  });

  const roomCode = roomData.roomCode;
  console.log(`Room created with code: ${roomCode}`);

  // Client 2: Friend joins
  const client2 = io(SERVER_URL, { auth: { token: 'token_user_2' } });
  await new Promise((resolve) => client2.on('connect', resolve));
  console.log("Client 2 connected:", client2.id);

  client2.emit('join_room', {
    roomCode: roomCode,
    playerName: 'Balli (Friend)',
    avatar: 'punjabi_m1',
    sessionToken: 'token_user_2'
  });

  const joinData = await new Promise((resolve) => {
    client2.on('room_joined', resolve);
  });
  console.log(`Client 2 joined room ${roomCode} at seat ${joinData.playerIndex}`);

  // Send a reaction test
  let reactionReceived = false;
  client2.on('reaction_received', (data) => {
    console.log(`Client 2 received reaction from ${data.name}: ${data.reaction.text}`);
    reactionReceived = true;
  });

  client1.emit('send_reaction', {
    roomCode: roomCode,
    reaction: { text: 'Chak De Phatte! 🔥', audio: 'fanfare' }
  });

  await new Promise(r => setTimeout(r, 300));
  if (!reactionReceived) throw new Error("Reaction was not received by client 2");

  // Host starts game
  console.log("Host starting game...");
  client1.emit('start_game', { roomCode: roomCode });

  const gameStartedPromise = Promise.all([
    new Promise(resolve => client1.on('game_started', resolve)),
    new Promise(resolve => client2.on('game_started', resolve))
  ]);

  await gameStartedPromise;
  console.log("Game successfully started on both clients!");

  // Wait for trump call event or turn
  await new Promise(r => setTimeout(r, 2000));

  client1.disconnect();
  client2.disconnect();
  console.log("Multiplayer test passed perfectly!");
}

runMultiplayerTest().catch(err => {
  console.error("Multiplayer test failed:", err);
  process.exit(1);
});
