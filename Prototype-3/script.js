///////////// Page Elements
const canvas = document.getElementById("sound-canvas");
const playButton = document.getElementById("play-button");
const objectElements = document.querySelectorAll(".sound-object");
const infoElements = [
    document.getElementById("object-one-info"),
    document.getElementById("object-two-info")
];

///////////// Musical Mapping
const noteNames = ["C", "D", "E", "F", "G", "A", "B"];
const octaves = [1, 2, 3, 4, 5, 6, 7, 8];
const minimumDelay = 700;
const maximumDelay = 1400;

const soundObjects = [
    createObjectState(objectElements[0], infoElements[0], 0.28, 0.65, "triangle"),
    createObjectState(objectElements[1], infoElements[1], 0.68, 0.35, "triangle")
];

function createObjectState(element, info, x, y, waveform) {
    return {
        element,
        info,
        x,
        y,
        note: "",
        baseFrequency: 0,
        playedFrequency: 0,
        volumeCompensation: 0,
        waveform,
        synth: null,
        timerId: null,
        previewSynth: null,
        usingPatternSynthForDrag: false
    };
}

///////////// Dragging
let activeDrag = null;

function beginDragging(clientX, clientY, soundObject, inputType, pointerId = null) {
    if (activeDrag) return;

    const objectRect = soundObject.element.getBoundingClientRect();
    activeDrag = {
        soundObject,
        inputType,
        pointerId,
        offsetX: clientX - objectRect.left,
        offsetY: clientY - objectRect.top
    };

    soundObject.element.classList.add("is-dragging");
    startObjectSound(soundObject);
}

function moveDraggedObject(clientX, clientY) {
    if (!activeDrag) return;

    const soundObject = activeDrag.soundObject;
    const canvasRect = canvas.getBoundingClientRect();
    const maximumX = canvas.clientWidth - soundObject.element.offsetWidth;
    const maximumY = canvas.clientHeight - soundObject.element.offsetHeight;
    const objectX = clientX - canvasRect.left - activeDrag.offsetX;
    const objectY = clientY - canvasRect.top - activeDrag.offsetY;

    soundObject.x = Math.min(Math.max(objectX / maximumX, 0), 1);
    soundObject.y = Math.min(Math.max(objectY / maximumY, 0), 1);
    updateObject(soundObject);
}

function finishDragging(soundObject) {
    if (!activeDrag || activeDrag.soundObject !== soundObject) return;

    soundObject.element.classList.remove("is-dragging");
    stopObjectSound(soundObject);
    activeDrag = null;
}

// Mouse Events follow the class example: press, move over the canvas, then release.
soundObjects.forEach((soundObject) => {
    soundObject.element.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        beginDragging(event.clientX, event.clientY, soundObject, "mouse");
    });
});

canvas.addEventListener("mousemove", (event) => {
    if (!activeDrag || activeDrag.inputType !== "mouse") return;
    moveDraggedObject(event.clientX, event.clientY);
});

window.addEventListener("mouseup", () => {
    if (!activeDrag || activeDrag.inputType !== "mouse") return;
    finishDragging(activeDrag.soundObject);
});

// Pointer Events keep the same interaction available on touchscreens and pens.
soundObjects.forEach((soundObject) => {
    soundObject.element.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") return;
        if (activeDrag) return;
        event.preventDefault();
        beginDragging(event.clientX, event.clientY, soundObject, "pointer", event.pointerId);
        soundObject.element.setPointerCapture(event.pointerId);
    });

    soundObject.element.addEventListener("pointermove", (event) => {
        if (!activeDrag || activeDrag.inputType !== "pointer") return;
        if (activeDrag.soundObject !== soundObject) return;
        if (activeDrag.pointerId !== event.pointerId) return;
        moveDraggedObject(event.clientX, event.clientY);
    });

    soundObject.element.addEventListener("pointerup", (event) => {
        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
        finishDragging(soundObject);
    });

    soundObject.element.addEventListener("pointercancel", (event) => {
        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
        finishDragging(soundObject);
    });
});

///////////// Position to Note
function positionToNote(xPosition, yPosition) {
    // Horizontal position selects octave 1 to 8.
    const octaveIndex = Math.round(xPosition * (octaves.length - 1));

    // Vertical position selects C at the bottom through B at the top.
    const noteIndex = Math.round((1 - yPosition) * (noteNames.length - 1));
    return noteNames[noteIndex] + octaves[octaveIndex];
}

function randomiseFrequency(baseFrequency) {
    // A maximum variation of 0.3% changes the Hz slightly but preserves the perceived note.
    const maximumVariation = baseFrequency * 0.003;
    return baseFrequency + (Math.random() * 2 - 1) * maximumVariation;
}

function volumeCompensationForNote(note) {
    const octave = Number(note.slice(-1));
    const compensationByOctave = {
        1: 8,
        2: 5,
        3: 2,
        4: 0,
        5: -1,
        6: -2,
        7: -3,
        8: -4
    };

    // Low octaves receive a safe boost; high octaves are reduced slightly.
    return compensationByOctave[octave];
}

function choosePlayedFrequency(soundObject) {
    soundObject.playedFrequency = randomiseFrequency(soundObject.baseFrequency);
    updateTestingLabel(soundObject);
}

function updateObject(soundObject) {
    const maximumX = canvas.clientWidth - soundObject.element.offsetWidth;
    const maximumY = canvas.clientHeight - soundObject.element.offsetHeight;
    const selectedNote = positionToNote(soundObject.x, soundObject.y);
    const noteChanged = selectedNote !== soundObject.note;

    soundObject.element.style.left = maximumX * soundObject.x + "px";
    soundObject.element.style.top = maximumY * soundObject.y + "px";

    // Randomise only when a different note area is entered, not on every mousemove event.
    if (noteChanged) {
        soundObject.note = selectedNote;
        soundObject.baseFrequency = Tone.Frequency(selectedNote).toFrequency();
        soundObject.volumeCompensation = volumeCompensationForNote(selectedNote);
        choosePlayedFrequency(soundObject);

        if (soundObject.synth) {
            soundObject.synth.frequency.rampTo(soundObject.playedFrequency, 0.04);
            soundObject.synth.volume.rampTo(soundObject.volumeCompensation, 0.06);
        }

        if (soundObject.previewSynth) {
            soundObject.previewSynth.frequency.rampTo(soundObject.playedFrequency, 0.04);
            soundObject.previewSynth.volume.rampTo(-18 + soundObject.volumeCompensation, 0.06);
        }
    }

    updateTestingLabel(soundObject);
}

function updateTestingLabel(soundObject) {
    const objectNumber = soundObjects.indexOf(soundObject) + 1;

    soundObject.info.textContent =
        "Object " + objectNumber + ": " +
        soundObject.note + " - " +
        soundObject.playedFrequency.toFixed(1) + " Hz " +
        "(base " + soundObject.baseFrequency.toFixed(1) + " Hz) - Gain: " +
        (soundObject.volumeCompensation >= 0 ? "+" : "") +
        soundObject.volumeCompensation + " dB";
}

///////////// Sound
let gardenPlaying = false;
let buttonBusy = false;
let masterGain;

function makeSynth(waveform) {
    return new Tone.Synth({
        oscillator: { type: waveform },
        envelope: {
            attack: 0.04,
            decay: 0.12,
            sustain: 0.18,
            release: 0.3
        }
    });
}

function createPatternSynth(soundObject) {
    soundObject.synth = makeSynth(soundObject.waveform).connect(masterGain);
    soundObject.synth.volume.value = soundObject.volumeCompensation;
}

async function startObjectSound(soundObject) {
    await Tone.start();
    if (!activeDrag || activeDrag.soundObject !== soundObject || buttonBusy) return;

    choosePlayedFrequency(soundObject);

    if (gardenPlaying && soundObject.synth) {
        soundObject.usingPatternSynthForDrag = true;
        soundObject.synth.triggerAttack(soundObject.playedFrequency, Tone.now(), 0.55);
        return;
    }

    soundObject.previewSynth = makeSynth(soundObject.waveform).toDestination();
    soundObject.previewSynth.volume.value = -18 + soundObject.volumeCompensation;
    soundObject.previewSynth.triggerAttack(soundObject.playedFrequency);
}

function stopObjectSound(soundObject) {
    if (soundObject.usingPatternSynthForDrag && soundObject.synth) {
        soundObject.synth.triggerRelease();
        soundObject.usingPatternSynthForDrag = false;
    }

    if (!soundObject.previewSynth) return;

    const previewSynth = soundObject.previewSynth;
    soundObject.previewSynth = null;
    previewSynth.triggerRelease();

    setTimeout(() => {
        previewSynth.dispose();
    }, 400);
}

///////////// Repeating Patterns
function randomDelay() {
    return minimumDelay + Math.random() * (maximumDelay - minimumDelay);
}

function playRepeatingNote(soundObject) {
    if (gardenPlaying === false || !soundObject.synth) return;

    // Each repeat receives a small random Hz and volume variation.
    choosePlayedFrequency(soundObject);
    const velocity = 0.48 + Math.random() * 0.12;
    soundObject.synth.triggerAttackRelease(
        soundObject.playedFrequency,
        "8n",
        Tone.now(),
        velocity
    );

    soundObject.timerId = setTimeout(() => {
        playRepeatingNote(soundObject);
    }, randomDelay());
}

///////////// Master Play and Stop
async function startGarden() {
    await Tone.start();
    if (gardenPlaying) return;

    masterGain = new Tone.Gain(0).toDestination();
    soundObjects.forEach(createPatternSynth);
    gardenPlaying = true;
    playButton.textContent = "Stop Garden";
    masterGain.gain.rampTo(0.16, 0.1);

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
        stopObjectSound(soundObject);
        if (soundObject.synth) soundObject.synth.triggerRelease();
    });

    if (masterGain) masterGain.gain.rampTo(0, 0.2);
    await wait(300);

    soundObjects.forEach((soundObject) => {
        if (soundObject.synth) soundObject.synth.dispose();
        soundObject.synth = null;
    });

    if (masterGain) masterGain.dispose();
    masterGain = null;
}

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
