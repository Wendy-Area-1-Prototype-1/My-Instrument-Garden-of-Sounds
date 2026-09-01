///////////// Page Elements
const canvas = document.getElementById("sound-canvas");
const playButton = document.getElementById("play-button");
const objectElements = document.querySelectorAll(".sound-object");
const infoElements = [
    document.getElementById("object-one-info"),
    document.getElementById("object-two-info")
];

///////////// Mapping Settings
const lowFrequency = 130.81; // C3
const highFrequency = 523.25; // C5
const minimumDelay = 700;
const maximumDelay = 1400;

const soundObjects = [
    createObjectState(objectElements[0], infoElements[0], 0.28, 0.65, "sine"),
    createObjectState(objectElements[1], infoElements[1], 0.68, 0.35, "triangle")
];

function createObjectState(element, info, x, y, waveform) {
    return {
        element,
        info,
        x,
        y,
        frequency: 0,
        pan: 0,
        waveform,
        synth: null,
        panner: null,
        timerId: null
    };
}

///////////// Dragging
let activeDrag = null;

function startDragging(event, soundObject) {
    if (activeDrag) return;

    event.preventDefault();
    const objectRect = soundObject.element.getBoundingClientRect();

    activeDrag = {
        soundObject,
        pointerId: event.pointerId,
        offsetX: event.clientX - objectRect.left,
        offsetY: event.clientY - objectRect.top
    };

    soundObject.element.classList.add("is-dragging");
    soundObject.element.setPointerCapture(event.pointerId);
}

function dragObject(event, soundObject) {
    if (!activeDrag || activeDrag.soundObject !== soundObject) return;
    if (activeDrag.pointerId !== event.pointerId) return;

    // Convert the pointer location into clamped x and y positions inside the canvas.
    const canvasRect = canvas.getBoundingClientRect();
    const objectWidth = soundObject.element.offsetWidth;
    const objectHeight = soundObject.element.offsetHeight;
    const maximumX = canvas.clientWidth - objectWidth;
    const maximumY = canvas.clientHeight - objectHeight;
    const objectX = event.clientX - canvasRect.left - activeDrag.offsetX;
    const objectY = event.clientY - canvasRect.top - activeDrag.offsetY;

    soundObject.x = Math.min(Math.max(objectX / maximumX, 0), 1);
    soundObject.y = Math.min(Math.max(objectY / maximumY, 0), 1);
    updateObject(soundObject);
}

function stopDragging(event, soundObject) {
    if (!activeDrag || activeDrag.soundObject !== soundObject) return;
    if (activeDrag.pointerId !== event.pointerId) return;

    soundObject.element.classList.remove("is-dragging");
    activeDrag = null;
}

soundObjects.forEach((soundObject) => {
    soundObject.element.addEventListener("pointerdown", (event) => {
        startDragging(event, soundObject);
    });

    soundObject.element.addEventListener("pointermove", (event) => {
        dragObject(event, soundObject);
    });

    soundObject.element.addEventListener("pointerup", (event) => {
        stopDragging(event, soundObject);
    });

    soundObject.element.addEventListener("pointercancel", (event) => {
        stopDragging(event, soundObject);
    });
});

///////////// Position Mapping
function positionToFrequency(yPosition) {
    // Vertical position maps continuously and exponentially from C3 to C5.
    const pitchAmount = 1 - yPosition;
    return lowFrequency * Math.pow(highFrequency / lowFrequency, pitchAmount);
}

function positionToPan(xPosition) {
    // Horizontal position maps directly from left (-1) through centre (0) to right (1).
    return xPosition * 2 - 1;
}

function updateObject(soundObject) {
    const maximumX = canvas.clientWidth - soundObject.element.offsetWidth;
    const maximumY = canvas.clientHeight - soundObject.element.offsetHeight;

    soundObject.element.style.left = maximumX * soundObject.x + "px";
    soundObject.element.style.top = maximumY * soundObject.y + "px";
    soundObject.frequency = positionToFrequency(soundObject.y);
    soundObject.pan = positionToPan(soundObject.x);

    // A sounding note follows the current position smoothly while it is being dragged.
    if (soundObject.synth) {
        soundObject.synth.frequency.rampTo(soundObject.frequency, 0.04);
        soundObject.panner.pan.rampTo(soundObject.pan, 0.04);
    }

    updateTestingLabel(soundObject);
}

function nearestNoteName(frequency) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440));
    const noteName = noteNames[(midiNumber + 120) % 12];
    const octave = Math.floor(midiNumber / 12) - 1;
    return noteName + octave;
}

function updateTestingLabel(soundObject) {
    const objectNumber = soundObjects.indexOf(soundObject) + 1;
    const noteName = nearestNoteName(soundObject.frequency);

    soundObject.info.textContent =
        "Object " + objectNumber + ": " +
        soundObject.frequency.toFixed(1) + " Hz - approximately " +
        noteName + " - Pan: " + soundObject.pan.toFixed(2);
}

///////////// Repeating Sounds
let gardenPlaying = false;
let buttonBusy = false;
let masterGain;

function createAudioNodes(soundObject) {
    soundObject.panner = new Tone.Panner(soundObject.pan).connect(masterGain);
    soundObject.synth = new Tone.Synth({
        oscillator: { type: soundObject.waveform },
        envelope: {
            attack: 0.04,
            decay: 0.12,
            sustain: 0.18,
            release: 0.3
        }
    }).connect(soundObject.panner);
}

function randomDelay() {
    // Delay randomness stays between 700 and 1400 ms.
    return minimumDelay + Math.random() * (maximumDelay - minimumDelay);
}

function playRepeatingNote(soundObject) {
    if (gardenPlaying === false || !soundObject.synth) return;

    // A small velocity change adds gentle volume variation without changing pitch or pan.
    const velocity = 0.48 + Math.random() * 0.12;
    soundObject.synth.triggerAttackRelease(soundObject.frequency, "8n", Tone.now(), velocity);
    soundObject.timerId = setTimeout(() => {
        playRepeatingNote(soundObject);
    }, randomDelay());
}

async function startGarden() {
    await Tone.start();
    if (gardenPlaying) return;

    masterGain = new Tone.Gain(0).toDestination();
    soundObjects.forEach(createAudioNodes);
    gardenPlaying = true;
    playButton.textContent = "Stop Garden";
    masterGain.gain.rampTo(0.2, 0.1);

    // Separate starting delays keep the two repeating patterns independent.
    soundObjects[0].timerId = setTimeout(() => playRepeatingNote(soundObjects[0]), 80);
    soundObjects[1].timerId = setTimeout(() => playRepeatingNote(soundObjects[1]), 420);
}

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopGarden() {
    gardenPlaying = false;
    playButton.textContent = "Play Garden";

    soundObjects.forEach((soundObject) => {
        clearTimeout(soundObject.timerId);
        soundObject.timerId = null;
        if (soundObject.synth) soundObject.synth.triggerRelease();
    });

    // Fade the master output before disconnecting and disposing all old nodes.
    if (masterGain) masterGain.gain.rampTo(0, 0.2);
    await wait(300);

    soundObjects.forEach((soundObject) => {
        if (soundObject.synth) soundObject.synth.dispose();
        if (soundObject.panner) soundObject.panner.dispose();
        soundObject.synth = null;
        soundObject.panner = null;
    });

    if (masterGain) masterGain.dispose();
    masterGain = null;
}

// The master button starts or safely stops both independent repeating patterns.
async function toggleGarden() {
    if (buttonBusy) return;

    buttonBusy = true;
    playButton.disabled = true;

    if (gardenPlaying) {
        await stopGarden();
    } else {
        await startGarden();
    }

    playButton.disabled = false;
    buttonBusy = false;
}

playButton.addEventListener("click", toggleGarden);

///////////// Setup
soundObjects.forEach(updateObject);

window.addEventListener("resize", () => {
    soundObjects.forEach(updateObject);
});
