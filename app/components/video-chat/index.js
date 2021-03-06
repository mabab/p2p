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
    @alias('router.currentRoute.queryParams.video') video;

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

        console.log(this.video !== undefined)
        let video = this.video !== undefined ? (this.video === 'true')  : true
        this.publisherStream = await this.getStream(video);

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
                sdpTransform: sdp => {
                    let newSDP = sdp
                    newSDP = this.setMediaBitrate(newSDP, 'video', 233)
                    newSDP = this.setMediaBitrate(newSDP, 'audio', 80)
                    return newSDP
                }
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

    async getStream(video = true) {
        let constains = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        };

        if (video){
            constains.video = {
                // frameRate: {
                //     min: 1,
                //     ideal: 15,
                // },
                width: { ideal: 640 },
                height: { ideal: 480 },
            }
        }

        console.log(video);



        return (
            navigator &&
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia(constains)
        );
    }

    setMediaBitrate(sdp, media, bitrate) {
        let lines = sdp.split('\n')
        let line = -1
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('m=' + media) === 0) {
                line = i
                break
            }
        }
        if (line === -1) {
            // log('Could not find the m line for', media)
            return sdp
        }
        // log('Found the m line for', media, 'at line', line)

        // Pass the m line
        line++

        // Skip i and c lines
        while (lines[line].indexOf('i=') === 0 || lines[line].indexOf('c=') === 0) {
            line++
        }

        // If we're on a b line, replace it
        if (lines[line].indexOf('b') === 0) {
            // log('Replaced b line at line', line)
            lines[line] = 'b=AS:' + bitrate
            return lines.join('\n')
        }

        // Add a new b line
        // log('Adding new b line before line', line)
        let newLines = lines.slice(0, line)
        newLines.push('b=AS:' + bitrate)
        newLines = newLines.concat(lines.slice(line, lines.length))
        return newLines.join('\n')
    }

    iceServers = [{"url": "stun:global.stun.twilio.com:3478?transport=udp", "urls": "stun:global.stun.twilio.com:3478?transport=udp"}, {"url": "turn:global.turn.twilio.com:3478?transport=udp", "username": "abc2c5655d58d93dc2165ee586cbc42a66610d19632bb334052bef377c028325", "urls": "turn:global.turn.twilio.com:3478?transport=udp", "credential": "cRqixg3338hrdKIqxTXCZ+V+2IxrThGNclEdZOJtA0c="}, {"url": "turn:global.turn.twilio.com:3478?transport=tcp", "username": "abc2c5655d58d93dc2165ee586cbc42a66610d19632bb334052bef377c028325", "urls": "turn:global.turn.twilio.com:3478?transport=tcp", "credential": "cRqixg3338hrdKIqxTXCZ+V+2IxrThGNclEdZOJtA0c="}, {"url": "turn:global.turn.twilio.com:443?transport=tcp", "username": "abc2c5655d58d93dc2165ee586cbc42a66610d19632bb334052bef377c028325", "urls": "turn:global.turn.twilio.com:443?transport=tcp", "credential": "cRqixg3338hrdKIqxTXCZ+V+2IxrThGNclEdZOJtA0c="}]
}
