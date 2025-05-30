import { useEffect, useState } from "react";
import { useSocket } from "../services/SocketProvider";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import peer from "../services/peer";
import ReactPlayer from "react-player";
import {
  Mic,
  MicOff,
  PowerCircle,
  SwitchCamera,
  SwitchCameraIcon,
} from "lucide-react";
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
  const [remoteName, setRemoteName] = useState("");
  const [newStream, setNewStream] = useState(false);
  const [requestBack, setRequestBack] = useState(false);
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [showCam, setShowCam] = useState(false);
  const [isCamSwitch, setIsCamSwitch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isMobile) {
      console.log("You're on a mobile device");
      setShowCam(true);
    } else {
      console.log("You're on a desktop device");
      setShowCam(false);
    }
  }, []);

  async function handleNewUserJoined(data) {
    setRemoteSocketId(data?.id);
    setRemoteName(data?.name);
    if (myStream) {
      await peer.peer.addStream(myStream);
      setNewStream(true);
    }
    setRequestBack(false);
  }

  const getCameraDeviceId = async (facingMode = "user") => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");

    if (facingMode === "user") {
      return (
        videoDevices.find((d) => d.label.toLowerCase().includes("front"))
          ?.deviceId || videoDevices[0]?.deviceId
      );
    } else {
      return (
        videoDevices.find((d) => d.label.toLowerCase().includes("back"))
          ?.deviceId || videoDevices[1]?.deviceId
      );
    }
  };

  const startCamera = async (facingMode) => {
    setMute(false);

    const deviceId = await getCameraDeviceId(facingMode);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, deviceId: { exact: deviceId } },
      audio: true,
    });
    setMyStream(stream);
    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    const senders = peer.peer.getSenders();

    const audioSender = senders.find((s) => s.track?.kind === "audio");
    if (audioSender && audioTrack) {
      await audioSender.replaceTrack(audioTrack);
    } else if (audioTrack) {
      peer.peer.addTrack(audioTrack, stream);
    }

    const videoSender = senders.find((s) => s.track?.kind === "video");
    if (videoSender && videoTrack) {
      await videoSender.replaceTrack(videoTrack);
    } else if (videoTrack) {
      peer.peer.addTrack(videoTrack, stream);
    }
    for (const track of stream.getTracks()) {
      peer.peer.addTrack(track, stream);
    }
    // sendStreams();
  };

  const switchCamera = async (accessId) => {
    for (const track of myStream.getTracks()) {
      track.stop();
    }
    setIsCamSwitch(true);
    setMyStream(null);

    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    await startCamera(newMode);
  };

  async function handleCallUser(mode = "user") {
    try {
      // myStream?.getTracks()?.forEach((track) => track.stop());
      // setMyStream(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: mode },
      });
      if (!myStream) setMyStream(stream);

      if (myStream) {
        const senders = peer.peer.getSenders();
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        const sender = senders.find((s) => s.track?.kind === "video");
        const audioSender = senders.find((s) => s.track?.kind === "audio");

        if (sender) {
          await sender.replaceTrack(videoTrack);
          await audioSender.replaceTrack(audioTrack);
        } else {
          // If no video sender exists yet, add the track
          peer.peer.addTrack(videoTrack, stream);
          peer.peer.addTrack(audioTrack, stream);
        }
      }
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer, name });
    } catch (error) {
      console.error("Error occured at: ", error?.message);
    }
  }

  async function handleIcommingCall({ from, offer, name }) {
    setRemoteSocketId(from);
    setRemoteName(name);
    setRequestBack(false);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    setMyStream(stream);
    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { ans, to: from });
  }

  async function sendStreams() {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }

  async function handleAcceptedCall({ ans }) {
    await peer.setRemoteAnswer(ans);

    // if (!newStream) {
    if (showCam) sendStreams();

    // }
  }

  async function handleNegoNeededIncomming({ from, offer }) {
    if (!showCam) sendStreams();

    const ans = await peer.getAnswer(offer);
    socket.emit("peer:nego:done", { to: from, ans });
  }
  async function handleNegoNeeded() {
    if (!showCam) sendStreams();

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
      const remoteStreams = ev.streams;

      setRemoteStream(remoteStreams[0]);
    });
  }, [myStream]);

  async function handleNegoNeededFinal({ from, ans }) {
    await peer.setRemoteAnswer(ans);

    // socket.emit("open:stream", { remoteSocketId });
  }

  async function handleStreamExecution() {
    // if (!newStream)

    sendStreams();
    // if (newStream) {
    //   alert("op");
    //   // for (const track of myStream.getTracks()) {
    //   //   track.stop();
    //   // }
    //   // // setIsCamSwitch(true);
    //   // setMyStream(null);

    //   const stream = await navigator.mediaDevices.getUserMedia({
    //     video: { facingMode },
    //     audio: true,
    //   });
    //   setMyStream(stream);
    // }
  }

  async function handleUserDiscconnect({ from, name, isCamSwitch }) {
    if (from === remoteSocketId) {
      remoteStream?.getTracks()?.forEach((track) => track?.stop());
      // Clear remoteStream when user disconnects
      setRemoteStream(null);
      setRemoteSocketId("");
      setRemoteName("");
      if (isCamSwitch) {
        await myStream?.getTracks()?.forEach((track) => {
          track.stop();
        });
        setMyStream(null);
        navigate("/");
      }
    }
  }
  async function handleRemoved({ from }) {
    // if (from === remoteSocketId) {
    alert(`${name} left the room`);
    await removeStreams();
    setRemoteSocketId("");
    navigate("/");
    // }
  }

  useEffect(() => {
    socket.on("user:join", handleNewUserJoined);
    socket.on("incomming:call", handleIcommingCall);
    socket.on("call:accepted", handleAcceptedCall);
    socket.on("peer:nego:needed", handleNegoNeededIncomming);
    socket.on("peer:nego:final", handleNegoNeededFinal);
    socket.on("open:stream", handleStreamExecution);
    socket.on("user:disconnected", handleUserDiscconnect);
    socket.on("removed", handleRemoved);

    return () => {
      socket.off("user:join", handleNewUserJoined);
      socket.off("incomming:call", handleIcommingCall);
      socket.off("call:accepted", handleAcceptedCall);
      socket.off("peer:nego:needed", handleNegoNeededIncomming);
      socket.off("peer:nego:final", handleNegoNeededFinal);
      socket.off("open:stream", handleStreamExecution);
      socket.off("user:disconnected", handleUserDiscconnect);
      socket.off("removed", handleRemoved);
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
    handleRemoved,
  ]);

  async function removeStreams() {
    setRequestBack(true);
    console.log("close");

    socket.emit("user:disconnected", {
      to: remoteSocketId,
      id,
      name,
      isCamSwitch,
    });
    await myStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    setMyStream(null);
    // setRemoteSocketId("");
    await remoteStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    setRemoteStream(null);

    if (isCamSwitch) {
      myStream?.getTracks()?.forEach((track) => {
        track.stop();
      });
      setMyStream(null);
    }
    if (isCamSwitch) {
      navigate("/");
    }
  }

  async function removeUserFromStream() {
    setRequestBack(true);

    socket.emit("user:disconnected", { to: remoteSocketId, id, name });
    await remoteStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    setRemoteStream(null);
    setNewStream(false);
    // navigate("/");
    // setRemoteName('');
    // setRemoteSocketId("");
  }
  useEffect(() => {
    window.addEventListener("popstate", async () => {
      await removeStreams();
      setRemoteSocketId("");
    });
    window.addEventListener("beforeunload", async (e) => {
      e.preventDefault();
      setRequestBack(false);
      console.log("close");

      socket.emit("user:disconnected", { to: remoteSocketId, id, name });
      await myStream?.getTracks()?.forEach((track) => {
        track.stop();
      });
      setMyStream(null);
      setRemoteSocketId("");
      await remoteStream?.getTracks()?.forEach((track) => {
        track.stop();
      });
      setRemoteStream(null);
    });

    return () => {
      window.removeEventListener("beforeunload", async (e) => {
        e.preventDefault();
        setRequestBack(false);
        console.log("close");

        socket.emit("user:disconnected", { to: remoteSocketId, id, name });
        await myStream?.getTracks()?.forEach((track) => {
          track.stop();
        });
        setMyStream(null);
        setRemoteSocketId("");
        await remoteStream?.getTracks()?.forEach((track) => {
          track.stop();
        });
        setRemoteStream(null);
      });
    };
  }, [myStream, remoteStream]);

  const muteAudio = async () => {
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMute((prev) => !prev);
    }
  };

  return (
    <div className="  w-full flex max-md:flex-col h-dvh ">
      <div className="  max-md:border-b-[1px] md:border-r-[1px] flex-col items-center gap-y-2 flex py-2 md:w-[400px]">
        <h1 className="text-xl font-semibold mt-2">
          Room No. <b>{params?.roomId}</b>
        </h1>
        <h3 className="text-[15px]">
          {remoteSocketId ? "" : "The room is empty- No participants yet"}
        </h3>
        {remoteSocketId && !remoteStream && (
          <>
            <p className="">
              <span className="capitalize">{remoteName}'s</span> in a room
            </p>
            <button
              onClick={() => {
                if (!requestBack && !showCam) {
                  sendStreams();
                }
                handleCallUser(facingMode);
              }}
              className="border-[1px] px-3 py-2 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
            >
              {requestBack ? "Request to join back" : "Accept"}
            </button>
          </>
        )}
        {remoteSocketId && remoteStream && (
          <h1 className="text-xl">{remoteName} is connected </h1>
        )}
        {remoteSocketId && (
          <>
            <button
              onClick={sendStreams}
              className="border-[1px] p-1 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
            >
              Reload Stream
            </button>
            <p className="text-xs bg-red-600 text-white">
              (Optional :Press Reload Stream or check with another peer if you
              are unable to communicate with each other after accepting the
              request or rejoining.)
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col   gap-y-3 w-full h-full items-center">
        {remoteStream && (
          <div className="relative p-2 overflow-hidden flex flex-col h-[45dvh]">
            <h1 className="text-3xl text-center flex justify-between items-center font-semibold">
              <span>Remote Stream({remoteName})</span>
              <button
                title="Disconnect Call"
                // onClick={removeUserFromStream}
                onClick={showCam ? removeStreams : removeUserFromStream}
                className="hover:bg-zinc-200 cursor-pointer rounded-full transition p-1"
              >
                <PowerCircle className="w-5 h-5 text-red-500" />
              </button>
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
          <div className="relative p-2 overflow-hidden flex flex-col h-[45dvh]">
            <div className="flex  justify-between items-center ">
              <h1 className="text-3xl font-semibold">{name}</h1>
              <div className="flex items-center gap-x-2">
                {showCam && (
                  <button
                    onClick={switchCamera}
                    title="Switch Camera"
                    className="p-2 hover:bg-zinc-100 h-fit rounded-full cursor-pointer"
                  >
                    <SwitchCamera className="w-5 h-5 text-blue-500" />
                  </button>
                )}
                <button
                  title={mute ? "Unmute" : "Mute"}
                  onClick={muteAudio}
                  className="p-2 hover:bg-zinc-100 h-fit rounded-full cursor-pointer"
                >
                  {mute ? (
                    <MicOff className="w-5 h-5 text-teal-700" />
                  ) : (
                    <Mic className="w-5 h-5 text-teal-700" />
                  )}
                </button>
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
