class PeerService {
  constructor() {
    this.createPeer();
  }

  createPeer() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
  }

  resetPeer() {
    if (this.peer) {
      this.peer.close();
    }
    this.createPeer(); // create a new RTCPeerConnection
  }

  async getOffer() {
    if (this.peer.signalingState === "closed") {
      this.createPeer();
    }
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  async getAnswer(offer) {
    if (this.peer.signalingState === "closed") {
      this.createPeer();
    }
    await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  async setRemoteAnswer(ans) {
    if (this.peer.signalingState === "closed") {
      this.createPeer();
    }
    await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
  }
}

export default new PeerService();
