"use strict";

/*
This script converts the flower's continuous vertical position into frequency.
It keeps horizontal position fixed so pitch height remains the only tested mapping.
*/

/* Page elements ------------------------------------------------------------- */
const pitchCanvas = document.getElementById("pitch-canvas");
const flowerButton = document.getElementById("drag-object");
const pitchLabel = document.getElementById("pitch-label");

/* Pitch mapping ------------------------------------------------------------- */
const lowFrequency = 130.81;
const highFrequency = 1046.5;
let verticalPosition = 0.5;

function mapPositionToFrequency(position) {
    // Exponential mapping distributes the C3-to-C6 range evenly by octave.
    const pitchAmount = 1 - position;
    return lowFrequency * Math.pow(highFrequency / lowFrequency, pitchAmount);
}

function updatePitchLabel(frequency) {
    pitchLabel.textContent = `${frequency.toFixed(1)} Hz`;
}

/* Audio --------------------------------------------------------------------- */
let pitchOscillator;
let outputGain;

function createOscillator() {
    if (pitchOscillator) return;

    outputGain = new Tone.Gain(0).toDestination();
    pitchOscillator = new Tone.Oscillator({
        frequency: mapPositionToFrequency(verticalPosition),
        type: "sine"
    }).connect(outputGain);

    pitchOscillator.start();
}

async function startSound() {
    // Browsers require Tone.start() during the user's first drag gesture.
    await Tone.start();
    if (!isDragging) return;

    // One persistent oscillator prevents overlapping voices during repeated drags.
    createOscillator();
    outputGain.gain.rampTo(0.12, 0.08);
}

function updateOscillator(frequency) {
    if (!pitchOscillator) return;

    // A short ramp prevents clicks while the pointer changes frequency continuously.
    pitchOscillator.frequency.rampTo(frequency, 0.03);
}

function stopSound() {
    if (!pitchOscillator) return;

    // The release ramp avoids an abrupt click when the flower is released.
    outputGain.gain.rampTo(0, 0.18);
}

/* Dragging ------------------------------------------------------------------ */
let isDragging = false;
let pointerOffsetY = 0;

function placeFlower(position) {
    const canvasHeight = pitchCanvas.clientHeight;
    const flowerHeight = flowerButton.offsetHeight;
    const availableHeight = canvasHeight - flowerHeight;
    const limitedPosition = Math.min(Math.max(position, 0), 1);

    verticalPosition = limitedPosition;
    flowerButton.style.top = `${availableHeight * verticalPosition}px`;

    const frequency = mapPositionToFrequency(verticalPosition);
    updatePitchLabel(frequency);
    updateOscillator(frequency);
}

function startDragging(event) {
    event.preventDefault();

    const flowerBounds = flowerButton.getBoundingClientRect();
    pointerOffsetY = event.clientY - flowerBounds.top;
    isDragging = true;

    flowerButton.classList.add("isDragging");
    flowerButton.setPointerCapture(event.pointerId);
    startSound();
}

function dragVertically(event) {
    if (!isDragging) return;

    const canvasBounds = pitchCanvas.getBoundingClientRect();
    const flowerHeight = flowerButton.offsetHeight;
    const availableHeight = pitchCanvas.clientHeight - flowerHeight;
    const flowerTop = event.clientY - canvasBounds.top - pointerOffsetY;
    const position = flowerTop / availableHeight;

    placeFlower(position);
}

function stopDragging() {
    if (!isDragging) return;

    isDragging = false;
    flowerButton.classList.remove("isDragging");
    stopSound();
}

/* User input and setup ------------------------------------------------------ */
flowerButton.addEventListener("pointerdown", startDragging);
flowerButton.addEventListener("pointermove", dragVertically);
flowerButton.addEventListener("pointerup", stopDragging);
flowerButton.addEventListener("pointercancel", stopDragging);

placeFlower(verticalPosition);

window.addEventListener("resize", () => {
    placeFlower(verticalPosition);
});
