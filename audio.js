let audioCtx;
let successSound, failSound, startSound;

export function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        const loadSound = (url) => {
            return fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => audioCtx.decodeAudioData(buffer));
        };

        const createSoundPlayer = (buffer) => () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
        };

        Promise.all([
            loadSound('success.mp3'),
            loadSound('fail.mp3'),
            loadSound('start_sound.mp3')
        ]).then(([successBuffer, failBuffer, startBuffer]) => {
            successSound = createSoundPlayer(successBuffer);
            failSound = createSoundPlayer(failBuffer);
            startSound = createSoundPlayer(startBuffer);
        }).catch(e => console.error("Error loading audio:", e));
    }
}

export function playSuccess() {
    if (successSound) successSound();
}

export function playFail() {
    if (failSound) failSound();
}

export function playStart() {
    if (startSound) startSound();
}

