import WebRTCPeer from "./webrtc-peer";
import {action} from '@ember/object';
import {sendEvent} from '@ember/object/events';

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
        onStream = () => {},
        onDestroyStream = () => {}
    }) {
        this.peerSettings = peerSettings;
        this.outbound = outbound;
        this.uuid = uuid;

        if (this.outbound){
            this.outbound('get-offer', {uuid: this.uuid})
        }
        this.onStream = onStream;
        this.onDestroyStream = onDestroyStream;
    }

    @action
    onJoined({uuid}){
        let local = this.uuid;

        let peer = this.peerConnections[uuid];

        if (!peer){
            this.handlePeer({
                remote: uuid,
                local,
                initiator: true
            });
        }
    }

    @action
    onSignal({from, to, signal}) {
        console.log(this.uuid, to)

        if (this.uuid !== to){
            return false;
        }
        let peer = this.peerConnections[from];
        if (!peer) {
            peer = this.handlePeer({
                remote: from,
                local: to,
                initiator: false
            })
        }
        peer.signal(signal);
    }

    @action
    onDisconnect(){

    }

    @action
    onRemove(uuid){
        let peer = this.peerConnections[uuid]
        if (peer) {
            peer.close()
            delete this.peerConnections[uuid];
        }
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
                stream.peerId = remote;
                this.onStream(stream);
            }
        })

        peer.on('close', () => {
            if (this.onDestroyStream && peer.stream)){
                this.onDestroyStream(peer.stream);
            }
        })

        return peer;
    }


}
