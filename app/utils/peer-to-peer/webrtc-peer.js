import SimplePeer from "simple-peer";
import {sendEvent, addListener} from '@ember/object/events';
import {action} from '@ember/object';
import { tracked } from '@glimmer/tracking';
import {next} from '@ember/runloop';

let ctr = 1

export default class WebRTCPeer {

    @tracked active = false;
    @tracked stream = null;
    @tracked error = null;

    static isSupported() {
        return SimplePeer.WEBRTC_SUPPORT
    }

    constructor({ remote, local, ...options }) {
        this.remote = remote
        this.local = local
        this.initiator = options.initiator
        this.id = 'webrtc-peer-' + ctr++

        console.log('peer', this.id)
        this.setupPeer(options)
    }


    setupPeer(options){
        this.error = null
        this.active = false
        this.stream = null

        let _options = {
            ...options,
            // Allow the peer to receive video, even if it's not sending stream:
            // https://github.com/feross/simple-peer/issues/95
            offerConstraints: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            },
        };

        // console.log('SimplePeer opts:', _options)

        this.peer = new SimplePeer(_options);

        this.peer.on('close', this.close);
        this.peer.on('error', (err) =>{
            this.onError(options, err);
        });
        this.peer.on('signal', this.onSignal);
        this.peer.on('data', this.onData);
        this.peer.on('connect', this.onConnect);
        this.peer.on('stream', this.onStream);
    }

    setStream(stream) {
        if (!this.peer.streams.includes(stream)) {
            try {
                this.peer.streams.forEach(s => this.peer.removeStream(s))
            } catch (err) {
                console.error('Exception setStream remove:', err)
            }
            if (stream) {
                console.log(stream, 'Expected a stream');
                this.peer.addStream(stream)
            }
        }
    }

    @action
    onError(options, error){
        console.log(`${this.id} | error`, error)
        this.error = error
        this.emit('error', error)
        this.close()
        // setTimeout(() => {
        //     this.setupPeer(options) // ???
        // }, 1000)
    }

    @action
    onSignal(signal){
        this.emit('signal', signal)
    }

    @action
    onData(data){
        console.log(`${this.id} | data`, data)
        this.emit('data', data)
        this.emit('message', { data });
    }

    @action
    onConnect(event){
        if (this._onConnect){
            this._onConnect();
        }
        console.log(`%c ${this.id} | connect `, 'color: #bada55; padding: 2px 10px;')
        this.active = true
        this.emit('connect', event)
    }

    @action
    onStream(stream){
        console.log('new stream', stream);
        this.stream = stream;
        this.emit('stream', stream);
    }


    @action
    emit(eventName, ...opt){
        sendEvent(this, eventName, opt)
    }

    @action
    on(eventName, callback){
        addListener(this, eventName, this, callback)
    }

    // We got a signal from the remote peer and will use it now to establish the connection
    @action
    signal(data) {
        if (this.peer && !this.peer.destroyed) {
            this.peer.signal(this.decode(data));
        } else {
            console.log('Tried to set signal on destroyed peer', this.peer, data)
        }
    }

    @action
    sendMessage(data){
        this.peer.send(data)
    }

    @action
    close(){
        this.emit('close', [this.uuid]);
        this.active = false;
        this.peer?.destroy();
    }

    encode(data){
        if (!data?.sdp){
            return data;
        }

        return {
            ...data,
            sdp: encodeURIComponent(data.sdp)
        }
    }

    decode(data){
        if (!data?.sdp){
            return data;
        }

        return {
            ...data,
            sdp: decodeURIComponent(data.sdp)
        }
    }
}
