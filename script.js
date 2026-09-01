///////////// Page Elements
const canvas = document.getElementById("pitch-canvas");
const dragObject = document.getElementById("drag-object");
const pitchLabel = document.getElementById("pitch-label");

///////////// Pitch Settings
const lowFrequency = 130.81; // C3
const highFrequency = 1046.5; // C6

///////////// Dragging
let dragging = false;
let pointerOffsetY = 0;
let verticalPosition = 0.5;

function placeObject(position) {
    const canvasHeight = canvas.clientHeight;
    const objectHeight = dragObject.offsetHeight;
    const availableHeight = canvasHeight - objectHeight;
    const limitedPosition = Math.min(Math.max(position, 0), 1);

    verticalPosition = limitedPosition;
    dragObject.style.top = availableHeight * verticalPosition + "px";

    const frequency = positionToFrequency(verticalPosition);
    showFrequency(frequency);
    updateOscillator(frequency);
}

function startDragging(event) {
    event.preventDefault();

    const objectRect = dragObject.getBoundingClientRect();
    pointerOffsetY = event.clientY - objectRect.top;
    dragging = true;

    dragObject.classList.add("is-dragging");
    dragObject.setPointerCapture(event.pointerId);
    startSound();
}

function dragVertically(event) {
    if (dragging === false) return;

    // Only vertical movement changes the flower and its pitch.
    const canvasRect = canvas.getBoundingClientRect();
    const objectHeight = dragObject.offsetHeight;
    const availableHeight = canvas.clientHeight - objectHeight;
    const objectTop = event.clientY - canvasRect.top - pointerOffsetY;
    const position = objectTop / availableHeight;

    placeObject(position);
}

function stopDragging() {
    if (dragging === false) return;

    dragging = false;
    dragObject.classList.remove("is-dragging");
    stopSound();
}

dragObject.addEventListener("pointerdown", startDragging);
dragObject.addEventListener("pointermove", dragVertically);
dragObject.addEventListener("pointerup", stopDragging);
dragObject.addEventListener("pointercancel", stopDragging);

///////////// Vertical Position to Pitch
function positionToFrequency(position) {
    // Exponential mapping spreads the C3-to-C6 range evenly by octave.
    const pitchAmount = 1 - position;
    return lowFrequency * Math.pow(highFrequency / lowFrequency, pitchAmount);
}

function showFrequency(frequency) {
    pitchLabel.textContent = frequency.toFixed(1) + " Hz";
}

///////////// Sound
let oscillator;
let volume;

function createSound() {
    if (oscillator) return;

    volume = new Tone.Gain(0).toDestination();
    oscillator = new Tone.Oscillator({
        frequency: positionToFrequency(verticalPosition),
        type: "sine"
    }).connect(volume);

    oscillator.start();
}

async function startSound() {
    // Tone.start() unlocks audio after the user presses the flower.
    await Tone.start();
    if (dragging === false) return;

    // One persistent oscillator prevents overlapping voices.
    createSound();
    volume.gain.rampTo(0.12, 0.08);
}

function updateOscillator(frequency) {
    if (!oscillator) return;

    // Smooth each frequency update so vertical movement does not click or jump.
    oscillator.frequency.rampTo(frequency, 0.03);
}

function stopSound() {
    if (!oscillator) return;

    // Fade gently to silence when the flower is released.
    volume.gain.rampTo(0, 0.18);
}

///////////// Setup
placeObject(verticalPosition);

window.addEventListener("resize", () => {
    placeObject(verticalPosition);
});
