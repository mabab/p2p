import Component from '@ember/component';
import { tracked } from '@glimmer/tracking';
import {action} from '@ember/object';

export default class VideoChatPublisherComponent extends Component {
    tagName = '';
    @tracked stream = null;
    @tracked isEnabledAudio = true;
    @tracked isEnabledVideo = true;

    get videoElement(){
        return this.getVideoEl(this.stream);
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
        videoElement.setAttribute('muted', '');
        this.attachMediaStream(videoElement, stream);
        videoElement.muted = 'muted';
        // videoElement.play();

        return videoElement;
    }

    @action
    onMuteVideo(){
        let videoTracks = this.stream.getVideoTracks();
        this.isEnabledVideo = !this.isEnabledVideo;
        videoTracks.forEach((track) =>{
            track.enabled = this.isEnabledVideo;
        })
    }

    @action
    onMuteAudio(){
        let audioTracks = this.stream.getAudioTracks();
        this.isEnabledAudio = !this.isEnabledAudio;
        audioTracks.forEach((track) =>{
            track.enabled = this.isEnabledAudio;
        })
    }
}
