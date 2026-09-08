import { useCallback, useEffect, useRef } from "react";
import useStateWithCallback from "./useStateWithCallback.js";
import socket from "../socket/index.ts";
import ACTIONS from "../socket/actions.js";
import freeice from "freeice";

export const LOCAL_VIDEO = "LOCAL_VIDEO";

export default function useWebRTC(roomID) {
  const [clients, setClients] = useStateWithCallback([]);
  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({ [LOCAL_VIDEO]: null });

  const addNewClient = useCallback((newClient, cb) => {
    setClients((list) => {
      if (list.includes(newClient)) return list;
      return [...list, newClient];
    }, cb);
  }, [setClients]);

  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      if (peerID in peerConnections.current) {
        return console.log(`Already connected to peer ${peerID}`);
      }

      if (!localMediaStream.current) {
        console.warn("Local stream not ready yet, skipping peer connection");
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: freeice() });
      peerConnections.current[peerID] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;
      pc.ontrack = ({ streams: [remoteStream] }) => {
        tracksNumber++;
        if (tracksNumber === 2) {
          addNewClient(peerID, () => {
            const videoElement = peerMediaElements.current[peerID];
            if (videoElement) {
              videoElement.srcObject = remoteStream;
            }
          });
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localMediaStream.current);
      });

      if (createOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: offer,
        });
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);
    return () => {
      socket.off(ACTIONS.ADD_PEER, handleNewPeer);
    };
  }, [addNewClient]);

  useEffect(() => {
    async function setRemoteMedia({
      peerID,
      sessionDescription: remoteDescription,
    }) {
      const pc = peerConnections.current[peerID];
      if (!pc) return;

      await pc.setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      if (remoteDescription.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: answer,
        });
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
    return () => {
      socket.off(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
    };
  }, []);

  useEffect(() => {
    const handleIceCandidate = ({ peerID, iceCandidate }) => {
      const pc = peerConnections.current[peerID];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
      }
    };

    socket.on(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    return () => {
      socket.off(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    };
  }, []);

  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
        delete peerConnections.current[peerID];
      }
      delete peerMediaElements.current[peerID];
      setClients((list) => list.filter((c) => c !== peerID));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
    return () => {
      socket.off(ACTIONS.REMOVE_PEER, handleRemovePeer);
    };
  }, [setClients]);

  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 1280, height: 720 },
      });

      addNewClient(LOCAL_VIDEO, () => {
        const localVideo = peerMediaElements.current[LOCAL_VIDEO];
        if (localVideo) {
          localVideo.volume = 0;
          localVideo.srcObject = localMediaStream.current;
        }
      });
    }

    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomID }))
      .catch((error) => {
        console.error("Error getting user media", error);
      });

    return () => {
      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => track.stop());
      }
      socket.emit(ACTIONS.LEAVE);
    };
  }, [roomID, addNewClient]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
}