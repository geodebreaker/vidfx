var FPS = 30;
var vid;
var idx = 0;
var hidx = 0;
var frame = [];
var done = false;
var inter = false;
var ap = 0;

var DESTROY = false;
var src = Math.floor(Math.random() * 3);

function start() {
  vid = document.createElement('video');
  vid.src = ['vid.mp4', 'vid2.mp4', 'vid5.mp4'][src];
  /*vid.oncanplay*/ document.body.onclick = async () => {
    /*vid.oncanplay*/ document.body.onclick = undefined;
    if(input.m.x > WIDTH - 100 && input.m.y > HEIGHT - 30)
      DESTROY = true;
    inter = true;
    await fetchAndExtractSamples(vid.src).then(() =>
      playAudioSamples());
    var can = document.createElement('canvas');
    can.width = vid.videoWidth;
    can.height = vid.videoHeight;
    vid.volume = 0;
    vid.play();
    vid.onplay = () => {
      vid.onplay = undefined;
      var ctx = can.getContext('2d');
      var i = 0;
      var x = () => {
        if (vid.ended) return (done = true);
        i++;
        ctx.drawImage(vid, 0, 0);
        frame[i] = ctx.getImageData(0, 0, can.width, can.height);
        idx = i;
        setTimeout(x, 1000 / 30);
      };
      x();
    }
  }
}

function loop(dt) {
  // if (vid.paused && inter)
  //   vid.play();
  if (frame.length == 0)  {
    __.text('please click', 0, 0, "white", 50)
    __.text('destroy', WIDTH - 100, HEIGHT - 30, "red", 15);
  }
  if (done) {
    hidx += dt;
    hidx %= vid.duration;
    idx = Math.floor(hidx / vid.duration * frame.length) || 0;
  }
  if (ap++ > 30 && idx == 0 && inter) {
    playAudioSamples(samples, sampleRate);
    ap = 0;
  }
  if (frame[idx]) {
    var data = frame[idx].data;
    var row = new Array(frame[idx].height).fill(0).map(() => Math.floor(Math.random() * (DESTROY ? 5 : 3) + 2) * 4);
    var col = new Array(frame[idx].width).fill(0).map(() => Math.floor(Math.random() * 1 + 2) * 4 * frame[idx].width);
    for (var i = 0; i < data.length; i += 4) {
      [data[i], data[i + 1], data[i + 2]] = [
        data[i + col[Math.floor(i % frame[idx].width / 4)]],
        data[i + 1],
        data[i + 2 + row[Math.floor(i / frame[idx].width / 4)]]
      ];
      if (DESTROY && idx % 30 != 0) {
        var n = 0.003 + Math.random() / 64;
        [data[i], data[i + 1], data[i + 2]] = [
          Math.min((frame[idx - 1] ?? frame[idx]).data[i] * n + data[i] * (1 - n), 255),
          Math.min((frame[idx - 1] ?? frame[idx]).data[i + 1] * n + data[i + 1] * (1 - n), 255),
          Math.min((frame[idx - 1] ?? frame[idx]).data[i + 2] * n + data[i + 2] * (1 - n), 255),
        ];
      }
      var c = DESTROY ? 64 : 32;
      [data[i], data[i + 1], data[i + 2]] = [
        Math.floor(data[i] / c) * c,
        Math.floor(data[i + 1] / c) * c,
        Math.floor(data[i + 2] / c) * c,
      ];
    }
    var x = document.createElement('canvas');
    x.width = frame[idx].width;
    x.height = frame[idx].height;
    x.getContext('2d').putImageData(frame[idx], 0, 0);
    var y = document.createElement('canvas');
    y.width = 150;
    y.height = 200;
    y.getContext('2d').drawImage(x, 0, 0, y.width, y.height);
    __.img(y, [0, 0, WIDTH, HEIGHT]);
  }
}

var samples = [];
var sampleRate = 0;
async function fetchAndExtractSamples(url) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  try {
    // Fetch the audio file as an array buffer
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Decode the audio data into an AudioBuffer
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Extract the samples
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // console.log(`Number of Channels: ${numberOfChannels}`);
    // console.log(`Number of Samples: ${length}`);
    // console.log(`Sample Rate: ${sampleRate} Hz`);

    // Get the audio samples for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const samples = audioBuffer.getChannelData(channel);
      // console.log(`Channel ${channel + 1} samples:`, samples);
      window.samples = samples;
      window.sampleRate = sampleRate;
      // Now you have access to all the samples for this channel
    }
  } catch (error) {
    console.error('Error fetching or decoding audio:', error);
  }
}

async function playAudioSamples() {
  var da = DESTROY ? 8 : 16;
  var db = DESTROY ? 0.5 : 0.9;
  var dc = sampleRate / (DESTROY ? 4000 : 8000);
  var ddc = 1000;
  var dd = 1.0 / (1.0 + Math.exp(-ddc / sampleRate));
  var ddp = 0;
  samples = samples
    .map((x) => ddp = dd * x + (1 - dd) * ddp)
    .map((x, i) => samples[Math.floor(i / dc) * dc])
    .map(x => Math.floor(x * da) / da)
    .map(x => x > db ? db : x)
    .map(x => x < -db ? -db : x)
    .map(x => x * 1.2);

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create an AudioBuffer
  const numberOfChannels = 1; // Mono audio, adjust if stereo or multi-channel
  const bufferLength = samples.length;
  const audioBuffer = audioContext.createBuffer(numberOfChannels, bufferLength, sampleRate);

  // Copy the sample data into the AudioBuffer
  const channelData = audioBuffer.getChannelData(0); // For mono audio
  for (let i = 0; i < bufferLength; i++) {
    channelData[i] = samples[i]; // Assuming samples are between -1 and 1
  }

  // Create an AudioBufferSourceNode to play the buffer
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Connect the source to the AudioContext's destination
  source.connect(audioContext.destination);

  // Start playing the audio
  source.start();
}

ge.start();