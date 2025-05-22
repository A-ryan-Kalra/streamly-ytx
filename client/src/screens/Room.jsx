import { useEffect, useState } from "react";
import { useSocket } from "../services/SocketProvider";
import { useLocation, useParams } from "react-router-dom";

function Room() {
  const params = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { socket } = useSocket();

  const name = searchParams.get("name");
  const [remoteSocketId, setRemoteSocketId] = useState(null);

  function handleNewUserJoined(data) {
    setRemoteSocketId(data?.id);
  }

  useEffect(() => {
    socket.on("user:join", handleNewUserJoined);

    return () => {
      socket.off("user:join");
    };
  }, [socket, handleNewUserJoined]);

  return (
    <div className="flex w-full h-full ">
      <div className="flex flex-col w-full items-center">
        <h1 className="text-2xl font-semibold mt-2">
          Room No. <b>{params?.roomId}</b>
        </h1>
        <h3>{remoteSocketId ? "Connected" : "Not Connected"}</h3>
      </div>
    </div>
  );
}

export default Room;
