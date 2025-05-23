import { useEffect, useState } from "react";
import { useSocket } from "../services/SocketProvider";
import { useLocation, useParams } from "react-router-dom";
import peer from "../services/peer";
import ReactPlayer from "react-player";
import { SwitchCamera, SwitchCameraIcon } from "lucide-react";
function Room() {
  const params = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { socket } = useSocket();
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const name = searchParams.get("name");
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [resize, setResize] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [senders, setSenders] = useState([]);
  function handleNewUserJoined(data) {
    setRemoteSocketId(data?.id);
  }

  // const openRearCamera = async () => {
  //   for (const track of myStream.getTracks()) {
  //     track.stop();
  //   }
  //   const newMode = facingMode === "user" ? "environment" : "user";
  //   setFacingMode(newMode);
  //   handleCallUser(newMode)
  // };

  const startCamera = async (facingMode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: true,
    });

    // Replace tracks in peer connection
    const newSenders = [];
    stream.getTracks().forEach((track) => {
      const sender = peer.peer.addTrack(track, stream);
      newSenders.push(sender);
    });

    setSenders(newSenders);
    setMyStream(stream);
  };

  const switchCamera = async () => {
    for (const track of myStream.getTracks()) {
      track.stop();
    }
    setMyStream(null);

    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    // Start camera with new mode
    handleCallUser(newMode);
  };
  console.log("stream", myStream);
  async function handleCallUser(mode = "user") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: mode },
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

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    setMyStream(stream);
    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { ans, to: from });
  }

  function sendStreams() {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }

  async function handleAcceptedCall({ ans }) {
    await peer.setRemoteAnswer(ans);

    sendStreams();
  }

  async function handleNegoNeededIncomming({ from, offer }) {
    const ans = await peer.getAnswer(offer);
    socket.emit("peer:nego:done", { to: from, ans });
  }
  async function handleNegoNeeded() {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);

    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;

      setRemoteStream(remoteStream[0]);
    });

    function handleResize() {
      if (window.innerWidth <= 687) {
        setResize(true);
      } else {
        setResize(false);
      }
    }
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleNegoNeededFinal({ from, ans }) {
    await peer.setRemoteAnswer(ans);

    socket.emit("open:stream", { remoteSocketId });
  }

  async function handleStreamExecution() {
    sendStreams();
  }

  useEffect(() => {
    socket.on("user:join", handleNewUserJoined);
    socket.on("incomming:call", handleIcommingCall);
    socket.on("call:accepted", handleAcceptedCall);
    socket.on("peer:nego:needed", handleNegoNeededIncomming);
    socket.on("peer:nego:final", handleNegoNeededFinal);
    socket.on("open:stream", handleStreamExecution);

    return () => {
      socket.off("user:join", handleNewUserJoined);
      socket.off("incomming:call", handleIcommingCall);
      socket.off("call:accepted", handleAcceptedCall);
      socket.off("peer:nego:needed", handleNegoNeededIncomming);
      socket.off("peer:nego:final", handleNegoNeededFinal);
      socket.off("open:stream", handleStreamExecution);
    };
  }, [
    socket,
    handleNewUserJoined,
    handleIcommingCall,
    handleAcceptedCall,
    handleNegoNeededIncomming,
    handleNegoNeededFinal,
    handleStreamExecution,
  ]);

  useEffect(() => {
    return () => {
      // Cleanup function to stop the video stream when the component unmounts
      if (myStream) {
        myStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [myStream]);

  return (
    <div className="flex w-full h-full ">
      <div className="flex flex-col gap-y-3 w-full items-center">
        <h1 className="text-2xl font-semibold mt-2">
          Room No. <b>{params?.roomId}</b>
        </h1>
        <h3> {remoteSocketId ? "Connected" : "Not Connected"}</h3>
        {remoteSocketId && !remoteStream && (
          <button
            onClick={handleCallUser}
            className="border-[1px] p-1 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
          >
            Call
          </button>
        )}
        {/* {myStream && (
          <button
            onClick={sendStreams}
            className="border-[1px] p-1 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
          >
            Send Stream
          </button>
        )} */}
        {remoteStream && (
          <div className="relative w-full p-2 overflow-hidden">
            <h1 className="text-3xl text-center font-semibold">
              Remote Stream
            </h1>
            <ReactPlayer
              style={{ rotate: "y 180deg", marginInline: "auto" }}
              url={remoteStream}
              width={resize ? "100%" : "50%"}
              height={"100%"}
              playing
            />
          </div>
        )}
        {myStream && (
          <div className="relative p-2 overflow-hidden flex flex-col">
            <div className="flex  justify-between items-center ">
              <h1 className="text-3xl font-semibold capitalize">{name}</h1>
              <div
                onClick={switchCamera}
                className="p-2 hover:bg-zinc-100 h-fit cursor-pointer"
              >
                <SwitchCamera className="w-5 h-5  " />
              </div>
            </div>
            <ReactPlayer
              style={{ rotate: "y 180deg" }}
              url={myStream}
              muted
              width={"100%"}
              height={"100%"}
              playing
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Room;
