import WebRTCPeer from "./webrtc-peer";
import {action} from '@ember/object';

export default class WebRTC {
    static isSupported() {
        return WebRTCPeer.isSupported()
    }

    peerConnections = {};
    peerSettings = {};

    constructor({
        room = null,
        peerSettings = {},
        uuid = `${Number(new Date())}-tmp-uuid`,
        outbound = null,
        inbount = () => {},
        onStream = () => {}
    }) {
        this.peerSettings = peerSettings;
        this.outbound = outbound;
        this.uuid = uuid;

        if (this.outbound){
            this.outbound('get-offer', {uuid: this.uuid})
        }

        if (onStream){
            this.onStream = onStream;
        }
    }

    @action
    onJoined(remote){
        let local = this.uuid;

        let peer = this.peerConnections[remote];

        if (!peer){
            this.handlePeer({
                remote,
                local,
                initiator: true
            });
        }
    }

    @action
    onSignal(data) {
        console.log(data);
        let peer = this.peerConnections[data.from];
        if (!peer) {
            peer = this.handlePeer({
                remote: data.from,
                local: data.to,
                initiator: false
            })
        }
        peer.signal(data.signal);
    }

    @action
    onDisconnect(){

    }

    @action
    onRemove(){

    }

    handlePeer({remote, local, initiator = false}){
        let peer = new WebRTCPeer({
            local,
            remote,
            initiator,
            ...this.peerSettings,
        });
        this.peerConnections[remote] = peer;

        peer.on('signal', (signal)=>{
            this.outbound('signal', {
                from: local,
                to: remote,
                signal,
                initiator
            })
        });

        peer.on('stream', (stream) =>{
            if (this.onStream){
                this.onStream(stream);
            }
        })

        return peer;
    }


}
