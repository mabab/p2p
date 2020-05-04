import WebRTCPeer from "./webrtc-peer";
import {action} from '@ember/object';
import {addListener, sendEvent} from '@ember/object/events';

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
            this.updateStatus();
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
        this.updateStatus();
    }

    @action
    onDisconnect(){

    }

    @action
    onRemove(uuid){
        let peer = this.peerConnections[uuid]
        if (peer) {
            peer.close();
            delete this.peerConnections[uuid];
            this.destroyStream(uuid);
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

        peer.on('stream', this.newStream);
        peer.on('track', this.updateStatus);


        return peer;
    }

    close() {
        Object.values(this.peerConnections).map((peer) =>{
            peer.close();
        });
        this.peerConnections = {}
    }

    @action
    cleanup(){
        this.close();
    }

    @action
    updateStatus(){
        let status = Object.values(this.peerConnections).map(peer => {
            let { active, initiator, local, remote, error } = peer
            return {
                active, initiator, local, remote, error, peer
            }
        })
        sendEvent(this, 'status', [{ status }])
    }

    @action
    newStream(id, stream){
        let element = this.getVideoEl(stream);
        sendEvent(this, 'new-video-element', [{ id, element }])
    }

    @action
    destroyStream(id){

        console.log('destroyStream', id)

        sendEvent(this, 'destroy-video-element', [{ id }])
    }

    attachMediaStream(element, stream) {
        if ('srcObject' in element) {
            element.srcObject = stream
        } else {
            element.src = window.URL.createObjectURL(stream) // for older browsers
        }
    }

    getVideoEl(stream){
        let videoElement = document.createElement('video');
        videoElement.setAttribute('autoplay', '');
        videoElement.setAttribute('playsinline', '');
        this.attachMediaStream(videoElement, stream);

        return videoElement;
    }

    @action
    on(eventName, callback){
        addListener(this, eventName, this, callback)
    }
}
