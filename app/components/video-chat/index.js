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
                trickle: false,
                config: {
                    iceTransportPolicy: 'all',
                    reconnectTimer: 3000,
                    iceServers: this.iceServers
                },
                stream: this.publisherStream
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

    iceServers = [
        {
            url: "stun:global.stun.twilio.com:3478?transport=udp",
            urls: "stun:global.stun.twilio.com:3478?transport=udp",
        },
        {
            url: "turn:global.turn.twilio.com:3478?transport=udp",
            username:
                "7c2abd406c4517910475f586b35da630580d62a5a30be538732db227bd81e9a0",
            urls: "turn:global.turn.twilio.com:3478?transport=udp",
            credential: "abyDo4TdSCyVlC7UMBo4gnEiskeO+NFkvBQXR4sEDGM=",
        },
        {
            url: "turn:global.turn.twilio.com:3478?transport=tcp",
            username:
                "7c2abd406c4517910475f586b35da630580d62a5a30be538732db227bd81e9a0",
            urls: "turn:global.turn.twilio.com:3478?transport=tcp",
            credential: "abyDo4TdSCyVlC7UMBo4gnEiskeO+NFkvBQXR4sEDGM=",
        },
        {
            url: "turn:global.turn.twilio.com:443?transport=tcp",
            username:
                "7c2abd406c4517910475f586b35da630580d62a5a30be538732db227bd81e9a0",
            urls: "turn:global.turn.twilio.com:443?transport=tcp",
            credential: "abyDo4TdSCyVlC7UMBo4gnEiskeO+NFkvBQXR4sEDGM=",
        },
    ]
}
