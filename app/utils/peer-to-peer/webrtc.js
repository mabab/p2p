import WebRTCPeer from "./webrtc-peer";

export default class WebRTC {
    static isSupported() {
        return WebRTCPeer.isSupported()
    }

    peerConnections = {};
    peerSettings = {};

    constructor({room = null, peerSettings = {}}) {

        console.log(room);

        this.peerSettings = peerSettings;

    }
}
