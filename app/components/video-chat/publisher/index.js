import Component from '@ember/component';
import { tracked } from '@glimmer/tracking';

export default class VideoChatPublisherComponent extends Component {
    tagName = '';
    @tracked stream = null;

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
}
