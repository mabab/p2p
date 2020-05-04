import Component from '@ember/component';
import {action} from "@ember/object";
import {tracked} from "@glimmer/tracking";
import Ably from "../../utils/signaling/ably";
import WebRTC from "../../utils/peer-to-peer/webrtc";
import { A } from '@ember/array';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default class VideoChatComponent extends Component {
    @tracked publisherStream = null;
    @tracked subscribes = A();
    @tracked answer = false;
    connectionId = '';
    @service router;

    @alias('router.currentRoute.queryParams.room') room;

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
        // videoElement.setAttribute('muted', '');
        this.attachMediaStream(videoElement, stream);
        // videoElement.muted = 'muted';
        // videoElement.play();

        return videoElement;
    }

    @action
    async didInsert(element) {
        this.connectionId = Number(new Date()) + '-tmp';
        // let adapter = await import("webrtc-adapter");
        let ably = new Ably({
            options: {
                channelName: this.room || 'test',
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
            }
        });

        webrtc.on('new-video-element', ({id, element}) =>{

            console.log(id, element)

            this.subscribes.pushObject({id, element});
            this.notifyPropertyChange('subscribes')
        })

        webrtc.on('destroy-video-element', ({id}) =>{
            this.subscribes = this.subscribes.filter(item => item.id !== id);
        })


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
        });
    }

    async getStream() {
        let constains = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: {
                frameRate: {
                    min: 1,
                    ideal: 15,
                },
                facingMode: 'user'
            },
        };

        return (
            navigator &&
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia(constains)
        );
    }

    iceServers = [{"url": "stun:global.stun.twilio.com:3478?transport=udp", "urls": "stun:global.stun.twilio.com:3478?transport=udp"}, {"url": "turn:global.turn.twilio.com:3478?transport=udp", "username": "ef4e000a64eea19fe3201f85c4bbc1f3d3a857437fa0c3b6794fe5a8c545ac08", "urls": "turn:global.turn.twilio.com:3478?transport=udp", "credential": "U2etktvgVw8vq/IYHjRQdfSTkIUa3Kg+3RKpo7WcuYc="}, {"url": "turn:global.turn.twilio.com:3478?transport=tcp", "username": "ef4e000a64eea19fe3201f85c4bbc1f3d3a857437fa0c3b6794fe5a8c545ac08", "urls": "turn:global.turn.twilio.com:3478?transport=tcp", "credential": "U2etktvgVw8vq/IYHjRQdfSTkIUa3Kg+3RKpo7WcuYc="}, {"url": "turn:global.turn.twilio.com:443?transport=tcp", "username": "ef4e000a64eea19fe3201f85c4bbc1f3d3a857437fa0c3b6794fe5a8c545ac08", "urls": "turn:global.turn.twilio.com:443?transport=tcp", "credential": "U2etktvgVw8vq/IYHjRQdfSTkIUa3Kg+3RKpo7WcuYc="}]
}
