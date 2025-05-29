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
  const navigate = useNavigate();
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
  const [showSentStream, setShowSentStream] = useState(false);
  const [requestBack, setRequestBack] = useState(false);
  const [triggerRemoteStream, setTriggerRemoteStream] = useState(false);
  const [isNegoDone, setIsNegoDone] = useState("");
  const [firstJoin, setFirstJoin] = useState(false);
  const [isFinishStreaming, setIsFinishStreaming] = useState(false);
  const [hideStream, setHideStream] = useState(false);

  async function handleNewUserJoined(data) {
    console.log("handleNewUserJoined");
    setRemoteSocketId(data?.id);

    setRemoteName(data?.name);
    if (myStream) {
      await peer.peer.addStream(myStream);

      // sendStreams();
    }
    setRequestBack(false);
    setFirstJoin(true);
    setIsFinishStreaming(false);

    // setShowSentStream(false);
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
    sendStreams();
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
    console.log("handleCallUser");
    // setShowSentStream(false);

    try {
      // myStream?.getTracks()?.forEach((track) => track.stop());
      // setMyStream(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: mode },
      });
      if (!myStream) setMyStream(stream);

      // if (myStream) {
      //   const senders = peer.peer.getSenders();
      //   const videoTrack = stream.getVideoTracks()[0];
      //   const audioTrack = stream.getAudioTracks()[0];

      //   const sender = senders.find((s) => s.track?.kind === "video");
      //   const audioSender = senders.find((s) => s.track?.kind === "audio");

      //   if (sender) {
      //     await sender.replaceTrack(videoTrack);
      //     await audioSender.replaceTrack(audioTrack);
      //   } else {
      //     // If no video sender exists yet, add the track
      //     peer.peer.addTrack(videoTrack, stream);
      //     peer.peer.addTrack(audioTrack, stream);
      //   }
      //   // alert("wow");                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </s>
      //   // sendStreams()
      // }
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer, name });
    } catch (error) {
      console.error("Error occured at: ", error?.message);
    }
  }

  async function handleIcommingCall({ from, offer, name }) {
    console.log("handleIcommingCall");

    setShowSentStream(true);
    setRemoteSocketId(from);
    setRemoteName(name);
    setRequestBack(false);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    setMyStream(stream);

    const ans = await peer.getAnswer(offer);
    // for (const track of stream?.getTracks()) {
    //   peer.peer.addTrack(track, stream);
    // }
    socket.emit("call:accepted", { ans, to: from });
  }

  function sendStreams() {
    for (const track of myStream?.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }

  async function handleAcceptedCall({ ans }) {
    console.log("handleAcceptedCall");

    await peer.setRemoteAnswer(ans);
    console.log("triggered on accepted call ", name);
    // if (!newStream) {
    sendStreams();

    // }
    // if (!isNegoDone)
  }

  async function handleNegoNeededIncomming({ from, offer }) {
    console.log("handleNegoNeededIncomming");

    const ans = await peer.getAnswer(offer);
    //  sendStreams();
    setIsNegoDone(id);
    socket.emit("peer:nego:done", { to: from, ans });
  }
  async function handleNegoNeeded() {
    console.log("handleNegoNeeded");
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  console.log("firstJoin", firstJoin);
  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      console.log("isNegoDone==", isNegoDone);

      if (!remoteStream) {
        socket.emit("trigger:stream", { to: id });
        const remoteStreams = ev.streams;
        console.log("track triggered");
        setRemoteStream(remoteStreams[0]);
        // if (isRequestAccepted === id) {
        //   setTriggerRemoteStream(true);
        // }
        if (!firstJoin) {
          setTriggerRemoteStream(true);

          console.log("streamzz ", myStream);
          // setTimeout(() => {
          //   sendStreams();
          // }, 3000);
        }
      }
      // sendStreams();
    });
  }, [myStream]);

  useEffect(() => {
    if (triggerRemoteStream && myStream) {
      // alert(id);
      // sendStreams();

      setIsFinishStreaming(false);
    }
  }, [triggerRemoteStream, myStream]);

  console.log("triggerStream", triggerRemoteStream);

  async function handleNegoNeededFinal({ from, ans }) {
    console.log("handleNegoNeededFinal");
    setIsNegoDone("");
    await peer.setRemoteAnswer(ans);
    socket.emit("open:stream", { remoteSocketId });
  }

  async function handleStreamExecution() {
    // sendStreams();
    // if (!newStream)
    // console.log("handleStreamExecution ", name);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: true,
    });
    setMyStream(stream);
  }

  async function handleUserDiscconnect({ from }) {
    console.log("handleUserDiscconnect");
    if (from === remoteSocketId) {
      setIsFinishStreaming(true);
      setHideStream(false);
      remoteStream.getTracks().forEach((track) => track.stop());
      // Clear remoteStream when user disconnects
      setRemoteStream(null);
      setRemoteSocketId("");
      setRemoteName("");

      setIsNegoDone("");
    }
  }

  const handleTriggerStream = () => {
    // alert(id);
    if (!remoteStream) {
      sendStreams();
      setHideStream(true);
    }
  };

  useEffect(() => {
    socket.on("user:join", handleNewUserJoined);
    socket.on("incomming:call", handleIcommingCall);
    socket.on("call:accepted", handleAcceptedCall);
    socket.on("peer:nego:needed", handleNegoNeededIncomming);
    socket.on("peer:nego:final", handleNegoNeededFinal);
    socket.on("open:stream", handleStreamExecution);
    socket.on("user:disconnected", handleUserDiscconnect);
    socket.on("trigger:stream", handleTriggerStream);

    return () => {
      socket.off("user:join", handleNewUserJoined);
      socket.off("incomming:call", handleIcommingCall);
      socket.off("call:accepted", handleAcceptedCall);
      socket.off("peer:nego:needed", handleNegoNeededIncomming);
      socket.off("peer:nego:final", handleNegoNeededFinal);
      socket.off("open:stream", handleStreamExecution);
      socket.off("user:disconnected", handleUserDiscconnect);
      socket.off("trigger:stream", handleTriggerStream);
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
    handleTriggerStream,
  ]);

  async function removeStreams(id) {
    console.log("removeStreams");
    setRequestBack(false);
    setHideStream(false);

    const remoteId = id;
    socket.emit("user:disconnected", { to: remoteId, id });
    await myStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    setMyStream(null);
  }

  async function removeUserFromStream() {
    console.log("removeUserFromStream");
    setRequestBack(true);
    setIsNegoDone("");
    setIsFinishStreaming(true);
    setHideStream(false);
    socket.emit("user:disconnected", { to: remoteSocketId, id });
    await remoteStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
    setRemoteStream(null);

    // setRemoteName('');
    // setRemoteSocketId("");
  }
  useEffect(() => {
    window.addEventListener("popstate", async () => {
      setShowSentStream(false);
      await removeStreams(remoteSocketId);
      setIsFinishStreaming(true);

      setIsNegoDone("");
      setRemoteSocketId("");
    });
    window.addEventListener("beforeunload", async (e) => {
      e.preventDefault();
      setIsFinishStreaming(true);
      setRequestBack(false);
      setIsNegoDone(false);
      console.log("close");
      setShowSentStream(false);
      const remoteId = remoteSocketId;
      setHideStream(false);

      socket.emit("user:disconnected", { to: remoteId, id });
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
        setIsFinishStreaming(true);
        setRequestBack(false);
        console.log("close");
        setShowSentStream(false);
        setHideStream(false);
        socket.emit("user:disconnected", { to: remoteSocketId, id });
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
  console.log("hide", hideStream);
  const muteAudio = async () => {
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMute((prev) => !prev);
    }
  };
  console.log("showSentStream", showSentStream);
  // console.log("isRequest", isRequestAccepted);
  // console.log("remoteSocketId", remoteSocketId);

  return (
    <div className="  w-full flex max-md:flex-col h-dvh ">
      <div className="  max-md:border-b-[1px] md:border-r-[1px] flex-col items-center gap-y-2 flex py-2 md:w-[400px]">
        <h1 className="text-xl font-semibold mt-2">
          Room No. <b>{params?.roomId}</b>
        </h1>
        <h3>
          {remoteSocketId ? "" : "The room is empty- No participants yet"}
        </h3>
        {/* {id === isRequestAccepted && remoteSocketId && ( */}
        {remoteSocketId && !remoteStream && (
          <>
            <p className="">
              <span className="capitalize">{remoteName}'s</span> in a room
            </p>
            {requestBack ? (
              <button
                onClick={() => {
                  setHideStream(true);

                  handleCallUser(facingMode);
                }}
                className={
                  "border-[1px] px-3 py-2 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
                }
              >
                Request to join back
              </button>
            ) : remoteSocketId && remoteStream ? (
              ""
            ) : (
              <button
                onClick={() => handleCallUser(facingMode)}
                className={
                  "border-[1px] px-3 py-2 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
                }
              >
                Connect
              </button>
            )}
          </>
        )}
        {remoteSocketId && remoteStream && (
          <h1 className="text-xl">{remoteName} is connected </h1>
        )}
        {myStream && showSentStream && !isFinishStreaming && !hideStream && (
          <button
            onClick={sendStreams}
            className="border-[1px] p-1 rounded-md cursor-pointer active:scale-90 transition hover:bg-zinc-100"
          >
            Reload Stream
          </button>
        )}
      </div>

      <div className="flex flex-col   gap-y-3 w-full h-full items-center">
        {remoteStream && (
          <div className="relative p-2 overflow-hidden flex flex-col h-[45dvh]">
            <h1 className="text-3xl text-center flex justify-between items-center font-semibold">
              <span>Remote Stream({remoteName})</span>
              <button
                title="Disconnect Call"
                onClick={removeUserFromStream}
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
                <button
                  onClick={switchCamera}
                  title="Switch Camera"
                  className="p-2 hover:bg-zinc-100 h-fit rounded-full cursor-pointer"
                >
                  <SwitchCamera className="w-5 h-5 text-blue-500" />
                </button>
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
