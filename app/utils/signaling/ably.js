import {addListener, removeListener, sendEvent} from '@ember/object/events';
import {getPackages, on, signalHandler, bodyGenerate} from './aggregate-functions';
import { action } from "@ember/object";

export default class Adapter {

    ablyRealtime = null;
    loaded = false;
    loadingPromise = true;
    channel = null;

    /**
     * @param {object} props
     * @param {object} props.options
     * @param {string} props.publishKey
     * @param {string} props.subscribeKey
     * @constructor
     */
    constructor(props) {

        this.connectionId = props.options.connectionId;
        this.channelName = props.options.channelName;
        this.key = props.key;

        this._isInit = this.init().catch((err) =>{
            // eslint-disable-next-line no-console
           console.log(err);
        });
    }

    async init(){
        let Ably = await import('ably');

        this.ablyRealtime = Ably.Realtime.Promise({
            key: this.key,
            clientId: this.connectionId
        });


        this.addConnectionListeners(this.ablyRealtime);
        await this.isConnected();
        this.channel = this.ablyRealtime.channels.get(this.channelName);
        this.addListeners(this.channelName);
        this.channel.presence.enter();
    }

    addConnectionListeners(ablyRealtime){
        let connection = ablyRealtime.connection;
        connection.on('connected', () => {
            this.loaded = true;
            sendEvent(this, 'signal.init');
        });

        connection.on('failed', (data) =>{
            sendEvent(this, 'exception', [data]);
        });
    }

    addListeners(channel){
        let presence = this.channel.presence;

        presence.subscribe((member) => {
            if (member.clientId === this.connectionId) return true;

            if (['enter', 'present'].includes(member.action)){
                sendEvent(this, 'joined.removed.user', [{
                    uuid: member.clientId
                }]);
            }

            if (member.action === 'leave'){
                sendEvent(this, 'left.removed.user', [{
                    uuid: member.clientId
                }]);
            }
        });

        this.channel.subscribe((response) => {
            if (response.name === 'message'){
                let json = JSON.parse(response.data);
                sendEvent(this, `signal:${json.type}`, [response.data]);
            }
        });
    }

    async isConnected() {
        if (this.loaded) return true;

        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = new Promise((resolve) =>{
            let $this = this;
            addListener($this, 'signal.init', $this, function () {
                removeListener($this, 'signal.init', $this, this);
                resolve(true);
            });
        });

        return this.loadingPromise;
    }

    @action
    sendData(type, data){
        let stringifyData = (typeof data === 'object') ? JSON.stringify(data) : data;
        let packages = getPackages(stringifyData);
        console.log(this.channelName)

        let promises = packages.map((data) =>{
            return this.channel.publish('message', bodyGenerate(this.connectionId, type, data)).catch((err) =>{
                sendEvent(this, 'exception', [err]);
            });
        });

        return Promise.all(promises);
    }

    on(){
        return on.call(this, ...arguments);
    }


    signalListener(type, callback, allData) {
        return signalHandler.call(this, type, callback, allData);
    }

    async destroy() {
        this.channel.unsubscribe();
        await this.ablyRealtime.connection.close();

        this.channel = null;
        this.ablyRealtime = null;

        if (this.events && this.events.length){
            this.events.map(({currentTarget, eventName, target, callback}) =>{
                removeListener(currentTarget, eventName, target, callback);
            });
        }
        if (this.eventsOnce){
            Object.entries(this.eventsOnce).forEach(([eventName, callback]) =>{
                removeListener(this, eventName, this, callback);
            });
        }
    }

    @action
    async isInit(){
        return this._isInit;
    }
}
