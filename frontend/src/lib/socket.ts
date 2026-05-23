import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const joinGroup = (groupId: string) => {
  getSocket().emit('join:group', groupId);
};
