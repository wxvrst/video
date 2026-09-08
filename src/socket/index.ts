import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.PROD
  ? 'https://video-lilac-nu.vercel.app/'
  : 'http://localhost:5173';

const options = {
  forceNew: true,
  reconnectionAttempts: Infinity,
  timeout: 10000,
  transports: ['websocket', 'polling'],
  path: '/socket/socket.io',
};

const socket = io(SERVER_URL, options);

export default socket;