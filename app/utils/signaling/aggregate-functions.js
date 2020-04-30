const MAX_LENGTH_SIGNAL_PACKAGE = 7192;
import {addListener, removeListener, sendEvent} from '@ember/object/events';

/**
 * @callback requestCallback
 *
 */

/**
 * Split body by MAX_LENGTH_SIGNAL_PACKAGE
 *
 * @param {string} data
 * @requires data
 * @returns {[]}
 */
function splitSignalData(data){
    let id = Number(new Date());
    let index = 0;
    let i = 0;
    data = encodeURIComponent(data);
    let lengthData = data.length;
    let packages = Math.ceil(lengthData/MAX_LENGTH_SIGNAL_PACKAGE);
    let result = [];

    while(i < lengthData){

        let rightBoard =  i + MAX_LENGTH_SIGNAL_PACKAGE ;

        let item = ({
            type: 'cortege',
            id,
            index,
            packages,
            next: ((data.length - i) > MAX_LENGTH_SIGNAL_PACKAGE) ? index + 1 : null,
            content: data.slice(i, (rightBoard))
        });
        index = index + 1;

        result.push(item);
        i = rightBoard;
    }

    return result;
}

/**
 * Get body packages
 *
 * @param {string|object} data
 * @returns {[]|*[]}
 */
function getPackages(data){
    let stringifyData = (typeof data === 'string') ? data : JSON.stringify(data);

    if (encodeURIComponent(stringifyData).length > MAX_LENGTH_SIGNAL_PACKAGE){
        return splitSignalData(data);
    }

    return  [data];
}

const signalBuffer = {};
function dataParser(raw){
    let parseRaw = JSON.parse(raw);
    let parseData = JSON.parse(decodeURIComponent(parseRaw.data));
    parseRaw.data = parseData;

    if (parseData.type && parseData.type === 'cortege') {
        if (!signalBuffer.hasOwnProperty(`${parseData.id}`)) {
            signalBuffer[`${parseData.id}`] = [];
        }

        signalBuffer[`${parseData.id}`].push(parseData);
        if (signalBuffer[`${parseData.id}`].length !== parseData.packages) {
            return false;
        } else {
            let strData = '';
            signalBuffer[parseData.id].sort((a, b) => (a.index - b.index)).forEach(item => {
                strData = `${strData}${item.content}`;
            });
            parseRaw.data = decodeURIComponent(strData);
            delete signalBuffer[parseData.id];
        }
    }

    return parseRaw;
}

/**
 * Bind event listener
 */
function on(){

    if (!this){
        throw 'Must be `call(this, ...arguments)`';
    }

    let args = Array.from(arguments);
    let callback = args.pop();
    let currentTarget = this;
    let target = this;
    let eventName;

    if (typeof args.slice(-1)[0]=== 'object'){
        target = args.pop();
    }

    if (typeof args.slice(-1)[0] === 'string'){
        eventName = args.pop();
    }

    if (args.slice(-1)[0]){
        currentTarget = args.slice(-1)[0];
    }


    if (!this.events){
        this.events = [];
    }

    this.events.push({currentTarget, eventName, target, callback});
    addListener(currentTarget, eventName, target, callback);
}

/**
 * Bind only once event listener
 *
 * @param {name} eventName
 * @param {requestCallback} callback
 * @requires eventName callback
 */
function once(eventName, callback){

    if (!this){
        throw 'Must be `call(this, ...arguments)`';
    }

    if (!this.eventsOnce){
        this.eventsOnce = {};
    }
    if (this.eventsOnce[eventName]){
        try{
            removeListener(this, eventName, this, this.eventsOnce[eventName]);
        } catch (e) {
            console.error(e);
        }
    }
    addListener(this, eventName, this, callback);
    this.eventsOnce[eventName] = callback;
}



/**
 *
 *
 * @param {string} type
 * @param {requestCallback} callback
 * @param {boolean} allData
 */
function signalHandler(type, callback, allData){
    once.call(this, 'signal:' + type, (data) =>{
        try {
            let parseData = dataParser(data);

            if (!parseData) {
                return false;
            }

            parseData.data = (typeof parseData.data === 'string') ? parseData.data : JSON.stringify(parseData.data);

            if (allData) {
                callback(parseData);
                return;
            }

            if (!parseData.from || parseData.from.connectionId !== this.connectionId) {
                callback(parseData.data);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e, event);
        }
    });
}

/**
 * Generate push body
 *
 * @param {string} connectionId
 * @param {string} type
 * @param {string|object} data
 * @requires connectionId type data
 * @returns {string}
 */
function bodyGenerate(connectionId, type, data) {
    return JSON.stringify({
        type,
        data: encodeURIComponent(typeof data === 'string' ? data : JSON.stringify(data)),
        from: {
            connectionId
        }
    });
}

export {getPackages, dataParser, on, once, signalHandler, bodyGenerate};
