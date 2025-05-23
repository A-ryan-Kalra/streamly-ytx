import { useEffect, useState } from "react";
import { useSocket } from "../services/SocketProvider";
import { useLocation, useParams } from "react-router-dom";
import peer from "../services/peer";
import ReactPlayer from "react-player";
function Room() {
  const params = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { socket } = useSocket();
  const [myStream, setMyStream] = useState(null);
  const name = searchParams.get("name");
  const [remoteSocketId, setRemoteSocketId] = useState(null);

  function handleNewUserJoined(data) {
    setRemoteSocketId(data?.id);
  }

  async function handleCallUser() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
      setMyStream(stream);
    } catch (error) {
      console.error("Error occured at: ", error?.message);
    }
  }

  async function handleIcommingCall({ from, offer }) {
    setRemoteSocketId(from);
    console.log({ from, offer });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log(stream);
    setMyStream(stream);
    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { ans, to: from });
  }
  console.log(myStream);
  async function handleAcceptedCall({ ans }) {
    await peer.setRemoteAnswer(ans);
  }

  useEffect(() => {
    socket.on("user:join", handleNewUserJoined);
    socket.on("incomming:call", handleIcommingCall);
    socket.on("call:accepted", handleAcceptedCall);

    return () => {
      socket.off("user:join", handleNewUserJoined);
      socket.off("incomming:call", handleIcommingCall);
      socket.off("call:accepted", handleAcceptedCall);
    };
  }, [socket, handleNewUserJoined, handleIcommingCall, handleAcceptedCall]);

  return (
    <div className="flex w-full h-full ">
      <div className="flex flex-col gap-y-3 w-full items-center">
        <h1 className="text-2xl font-semibold mt-2">
          Room No. <b>{params?.roomId}</b>
        </h1>
        <h3> {remoteSocketId ? "Connected" : "Not Connected"}</h3>
        {remoteSocketId && (
          <button
            onClick={handleCallUser}
            className="border-[1px] p-1 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
          >
            Call
          </button>
        )}
        {myStream && (
          <ReactPlayer
            style={{ rotate: "y 180deg" }}
            playIcon={true}
            url={myStream}
            width={768}
            height={600}
            playing
          />
        )}
      </div>
    </div>
  );
}

export default Room;
