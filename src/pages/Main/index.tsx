import { useEffect, useRef, useState } from "react"
import socket from "../../socket"
import ACTIONS from "../../socket/actions";
import { useNavigate } from "react-router-dom";
import { v4 } from "uuid";

export default function Main() {
  const navigate = useNavigate();
  const [rooms, updateRooms] = useState([]);
  const rootNode = useRef();

  useEffect(() => {
    socket.on(ACTIONS.SHARE_ROOMS, ({rooms = []} = {}) => {
      if (rootNode.current) {
        updateRooms(rooms);
      }
    });
  }, []);
  
  const handleClickJoinRoom = (roomID: string) => {
    navigate(`/room/${roomID}`);
  }

  const handleClickCreateRoom = () => {
    navigate(`/room/${v4()}`);
  }

  return (
    <main className="p-2">
      <h1 className="text-2xl">Available rooms:</h1>
      <ul className="flex flex-col gap-2">
        {rooms.map(roomID => (
          <li
            className="flex gap-2 items-center"
            key={roomID}
          >
            {roomID}
            <button
              className="border px-2 py-1 rounded cursor-pointer hover:scale-102"
              onClick={() => handleClickJoinRoom(roomID)}
            >
              Join room
            </button>
          </li>
        ))}
      </ul>
      <button
        className="border px-2 py-1 rounded cursor-pointer hover:scale-102"
        onClick={handleClickCreateRoom}
      >
        Create room
      </button>
    </main>
  )
}