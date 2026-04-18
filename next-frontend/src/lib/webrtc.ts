export class WebRTCManager {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private iceCallback: ((candidate: RTCIceCandidate) => void) | null = null;
  private openCallback: (() => void) | null = null;
  private closeCallback: (() => void) | null = null;
  private messageCallback: ((data: any) => void) | null = null;

  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.pc.onicecandidate = (e) => {
      if (e.candidate && this.iceCallback) {
        this.iceCallback(e.candidate);
      }
    };

    this.pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel);
    };
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dc = channel;
    this.dc.onopen = () => this.openCallback?.();
    this.dc.onclose = () => this.closeCallback?.();
    this.dc.onmessage = (e) => this.messageCallback?.(e.data);
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void) {
    this.iceCallback = callback;
  }

  onOpen(callback: () => void) {
    this.openCallback = callback;
  }

  onClose(callback: () => void) {
    this.closeCallback = callback;
  }

  onMessage(callback: (data: any) => void) {
    this.messageCallback = callback;
  }

  async createOffer() {
    this.setupDataChannel(this.pc.createDataChannel('transfer'));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async applyAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async createAnswer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    if (this.dc?.readyState === 'open') {
      this.dc.send(data as any);
    }
  }

  getBufferedAmount() {
    return this.dc?.bufferedAmount || 0;
  }

  close() {
    this.dc?.close();
    this.pc.close();
  }
}
