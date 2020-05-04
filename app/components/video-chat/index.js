import Component from '@ember/component';
import {action} from "@ember/object";
import {tracked} from "@glimmer/tracking";
import Ably from "../../utils/signaling/ably";
import WebRTC from "../../utils/peer-to-peer/webrtc";
import SimplePeer from "simple-peer";
import {addListener} from '@ember/object/events';

export default class VideoChatComponent extends Component {
    @tracked publisherStream = null;
    @tracked subscribeStreams = [];
    @tracked answer = false;
    connectionId = '';

    @action
    async didInsert(element) {
        this.connectionId = Number(new Date()) + '-tmp';
        // let adapter = await import("webrtc-adapter");
        let ably = new Ably({
            options: {
                channelName: 'test',
                connectionId: this.connectionId
            },
            key: 'XzYLAw.TYRvcQ:VbpJWMJ3pnDtsqr7'
        });

        await ably.isInit();

        this.publisherStream = await this.getStream();

        let webrtc = new WebRTC({
            room: 1,
            uuid: this.connectionId,
            outbound: ably.sendData,
            peerSettings: {
                trickle: true,
                config: {
                    iceTransportPolicy: 'all',
                    reconnectTimer: 3000,
                    iceServers: this.iceServers
                },
                stream: this.publisherStream,
                // sdpTransform: sdp => {
                //     log('sdpTransform', state.bandwidth) // , sdp)
                //     let newSDP = sdp
                //     if (state.bandwidth) {
                //         //   newSDP = updateBandwidthRestriction(sdp, 10)
                //         // log('Old SDP', newSDP)
                //         newSDP = setMediaBitrate(newSDP, 'video', 233)
                //         newSDP = setMediaBitrate(newSDP, 'audio', 80)
                //         // log('New SDP', newSDP)
                //     } else {
                //         newSDP = removeBandwidthRestriction(sdp)
                //     }
                //     return newSDP
                // }
            },
            onStream: (stream) =>{
                this.subscribeStreams = [...this.subscribeStreams, stream]
            },
            onDestroyStream: (stream) => {

                console.log(stream);

                this.subscribeStreams = this.subscribeStreams.filter(item => item !== stream)
            }
        });


        ably.signalListener('get-offer', (raw) =>{
            let data = JSON.parse(raw);
            webrtc.onJoined(data)
        }, false);

        ably.signalListener('signal', (raw) =>{
            let data = JSON.parse(raw);
            webrtc.onSignal(data)
        }, false);

        ably.on('left.removed.user', ({uuid}) =>{
            webrtc.onRemove(uuid);
        })


    }

    async getStream() {
        let constains = {
            audio: true,
            video: true,
        };

        return (
            navigator &&
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia(constains)
        );
    }

    iceServers = [{"url": "stun:global.stun.twilio.com:3478?transport=udp", "urls": "stun:global.stun.twilio.com:3478?transport=udp"}, {"url": "turn:global.turn.twilio.com:3478?transport=udp", "username": "ef4e000a64eea19fe3201f85c4bbc1f3d3a857437fa0c3b6794fe5a8c545ac08", "urls": "turn:global.turn.twilio.com:3478?transport=udp", "credential": "U2etktvgVw8vq/IYHjRQdfSTkIUa3Kg+3RKpo7WcuYc="}, {"url": "turn:global.turn.twilio.com:3478?transport=tcp", "username": "ef4e000a64eea19fe3201f85c4bbc1f3d3a857437fa0c3b6794fe5a8c545ac08", "urls": "turn:global.turn.twilio.com:3478?transport=tcp", "credential": "U2etktvgVw8vq/IYHjRQdfSTkIUa3Kg+3RKpo7WcuYc="}, {"url": "turn:global.turn.twilio.com:443?transport=tcp", "username": "ef4e000a64eea19fe3201f85c4bbc1f3d3a857437fa0c3b6794fe5a8c545ac08", "urls": "turn:global.turn.twilio.com:443?transport=tcp", "credential": "U2etktvgVw8vq/IYHjRQdfSTkIUa3Kg+3RKpo7WcuYc="}]
}
