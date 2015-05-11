'use babel';

let View = require('atom-space-pen-views').View;
let vlc = require('./vlc');
let remote = require('remote');
let dialog = remote.require('dialog');
let mime = require('mime');

let isCodecSupported = (codec) => {
  // codec support: http://www.chromium.org/audio-video
  let supportedCodecs = [
    'audio/ogg', 'application/ogg', 'video/ogg',
    'video/webm', 'audio/webm',
    'audio/wav', 'audio/x-wav'
  ];
  let codecSupported = supportedCodecs.filter((c) => codec == c);
  return codecSupported.length > 0;
};

module.exports = class VideoPlayerView extends View {
  static content() {
    return this.div({ class: 'video-player' },
      () => this.video({ autoplay: true }));
  }

  initialize(serializeState) {
    atom.commands.add('atom-workspace', {
      "video-player:play": () => this.play(),
      "video-player:stop": () => this.stop(),
      "video-player:toggle-back-forth": () => this.toggleBackForth(),
      "video-player:toggle-control": () => this.toggleControl(),
      "video-player:reload-source": () => this.reloadSrc()
    });
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    vlc.kill();
    this.detach();
  }

  stop() {
    vlc.kill();
    this.detach();
  }

  play() {
    let properties = ['openFile', 'multiSelections'];
    dialog.showOpenDialog({
      title: 'Open',
      properties: properties
    }, (files) => {
      if(files != undefined) {
        this._play(files);
      }
    });
  }

  _play(files) {
    vlc.kill();

    let itemViews = atom.views.getView(atom.workspace)
      .querySelector('.pane.active .item-views');
    let videoPlayer = itemViews.querySelector('.video-player');
    videoPlayer && videoPlayer.remove();
    itemViews.appendChild(this.element);
    let video = atom.views.getView(atom.workspace)
      .querySelector('.video-player video');

    let codecUnsupported = files.filter((file) => {
      let mimeType = mime.lookup(file);
      !isCodecSupported(mimeType);
    });
    if(codecUnsupported.length > 0) {
      // when play unsupported file, try to use VLC
      this._playWithVlc(video, files);
    } else {
      this._playWithHtml5Video(video, files);
    }
  }

  _playWithVlc(video, files) {
    let streamServer = 'http://localhost:' + vlc.port;
    video.setAttribute('src', streamServer);
    vlc.streaming(files, (data) => this._reloadSrc(video));
    video.addEventListener('ended', () => this._reloadSrc(video));
    video.addEventListener('suspend', () => this._reloadSrc(video));
  }

  _playWithHtml5Video(video, files) {
    let counter = 0;
    video.setAttribute('src', files[counter]);
    video.addEventListener('ended', () => {
      ++counter;
      if(counter < files.length) {
        video.setAttribute('src', files[counter]);
      }
    });
  }

  _reloadSrc(video) {
    let src = video.getAttribute('src');
    video.setAttribute('src', src);
  }

  reloadSrc() {
    let video = atom.views.getView(atom.workspace)
      .querySelector('.video-player video');
    this._reloadSrc(video);
  }

  toggleBackForth() {
    this.element.classList.toggle('front');
  }

  toggleControl() {
    let video = this.element.querySelector('video');
    let controls = video.getAttribute('controls');
    video.setAttribute('controls', !controls);
  }
};