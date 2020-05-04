import Component from '@ember/component';
import {tracked} from "@glimmer/tracking";

export default class VideoChatSubscriberComponent extends Component {
    tagName = '';
    @tracked videoElement = null;
}
