import { useEffect, useState } from "react";
import { useSocket } from "../services/SocketProvider";
import { useLocation, useParams } from "react-router-dom";
import peer from "../services/peer";
import ReactPlayer from "react-player";
import { Mic, MicOff, SwitchCamera, SwitchCameraIcon } from "lucide-react";
function Room() {
  const params = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { socket } = useSocket();
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const name = searchParams.get("name");
  const id = searchParams.get("accessId");
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const [mute, setMute] = useState(false);

  function handleNewUserJoined(data) {
    setRemoteSocketId(data?.id);
  }

  const startCamera = async (facingMode) => {
    setMute(false);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: true,
    });
    const audioTrack = stream.getAudioTracks()[0];

    const senders = peer.peer.getSenders();
    if (audioTrack) {
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (audioSender) {
        await audioSender.replaceTrack(audioTrack);
      }
    }
    const videoTrack = stream.getVideoTracks()[0];

    const sender = senders.find((s) => s.track?.kind === "video");

    if (sender) {
      await sender.replaceTrack(videoTrack);
    } else {
      // If no video sender exists yet, add the track
      peer.peer.addTrack(videoTrack, stream);
    }

    setMyStream(stream);
  };

  const switchCamera = async (accessId) => {
    for (const track of myStream.getTracks()) {
      track.stop();
    }

    setMyStream(null);

    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    await startCamera(newMode);
  };

  async function handleCallUser(mode = "user") {
    try {
      if (myStream) {
        myStream?.getTracks()?.forEach((track) => track.stop());
        setMyStream(null);
      }
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
  }, []);

  async function handleNegoNeededFinal({ from, ans }) {
    await peer.setRemoteAnswer(ans);

    socket.emit("open:stream", { remoteSocketId });
  }

  async function handleStreamExecution() {
    sendStreams();
  }

  async function handleUserDiscconnect({ from }) {
    if (from === remoteSocketId) {
      console.log("first");
      remoteStream.getTracks().forEach((track) => track.stop());
      // Clear remoteStream when user disconnects
      setRemoteStream(null);
      setRemoteSocketId(null);
    }
  }

  useEffect(() => {
    socket.on("user:join", handleNewUserJoined);
    socket.on("incomming:call", handleIcommingCall);
    socket.on("call:accepted", handleAcceptedCall);
    socket.on("peer:nego:needed", handleNegoNeededIncomming);
    socket.on("peer:nego:final", handleNegoNeededFinal);
    socket.on("open:stream", handleStreamExecution);
    socket.on("user:disconnected", handleUserDiscconnect);

    return () => {
      socket.off("user:join", handleNewUserJoined);
      socket.off("incomming:call", handleIcommingCall);
      socket.off("call:accepted", handleAcceptedCall);
      socket.off("peer:nego:needed", handleNegoNeededIncomming);
      socket.off("peer:nego:final", handleNegoNeededFinal);
      socket.off("open:stream", handleStreamExecution);
      socket.off("user:disconnected", handleUserDiscconnect);
    };
  }, [
    socket,
    handleNewUserJoined,
    handleIcommingCall,
    handleAcceptedCall,
    handleNegoNeededIncomming,
    handleNegoNeededFinal,
    handleStreamExecution,
    handleUserDiscconnect,
  ]);

  async function removeStreams() {
    console.log("close");
    socket.emit("user:disconnected", { to: remoteSocketId });
    await myStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    setMyStream(null);
  }

  useEffect(() => {
    window.addEventListener("popstate", async () => {
      await removeStreams();
    });
    window.addEventListener("beforeunload", async () => {
      await removeStreams();
    });

    return () => {
      // if (myStream && !!isCamSwitch) {
      //   removeStreams();
      // }
      window.removeEventListener("beforeunload", async () => {
        await removeStreams();
      });
    };
  }, [myStream]);

  const muteAudio = async () => {
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMute((prev) => !prev);
    }
  };

  return (
    <div className="flex w-full h-full ">
      <div className="flex flex-col gap-y-3 w-full items-center">
        <h1 className="text-2xl font-semibold mt-2">
          Room No. <b>{params?.roomId}</b>
        </h1>
        <h3> {remoteSocketId ? "Connected" : "Not Connected"}</h3>
        {remoteSocketId && !remoteStream && (
          <button
            onClick={() => handleCallUser(facingMode)}
            className="border-[1px] px-3 py-2 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
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
          <div className="relative p-2 overflow-hidden flex flex-col h-[50dvh]">
            <h1 className="text-3xl text-center font-semibold">
              Remote Stream
            </h1>

            <ReactPlayer
              style={{
                rotate: facingMode !== "user" && "y 180deg",
                marginInline: "auto",
                width: "100%",
                height: "100%",
              }}
              url={remoteStream}
              // muted={mute}
              width={"100%"}
              height={"100%"}
              playing
            />
          </div>
        )}
        {myStream && (
          <div className="relative p-2 overflow-hidden flex flex-col h-[40dvh]">
            <div className="flex  justify-between items-center ">
              <h1 className="text-3xl font-semibold capitalize">{name}</h1>
              <div className="flex items-center gap-x-2">
                <div
                  onClick={switchCamera}
                  className="p-2 hover:bg-zinc-100 h-fit cursor-pointer"
                >
                  <SwitchCamera className="w-5 h-5  " />
                </div>
                <div
                  onClick={muteAudio}
                  className="p-2 hover:bg-zinc-100 h-fit cursor-pointer"
                >
                  {mute ? (
                    <MicOff className="w-5 h-5  " />
                  ) : (
                    <Mic className="w-5 h-5  " />
                  )}
                </div>
              </div>
            </div>
            <ReactPlayer
              style={{
                rotate: facingMode === "user" && "y 180deg",
                width: "100%",
                height: "100%",
              }}
              url={myStream}
              width={"100%"}
              height={"100%"}
              muted={mute}
              playing
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Room;
