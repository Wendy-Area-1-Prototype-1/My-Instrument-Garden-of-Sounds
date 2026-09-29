"use strict";

/*
This script maps a dropped flower to one of three garden zones and plays a note
from that zone. The discrete mapping is the interaction being tested.
*/

/* Page elements ------------------------------------------------------------- */
const soundCanvas = document.getElementById("sound-canvas");
const flowerButton = document.getElementById("draggable-flower");
const soundStatus = document.getElementById("sound-status");

/* Musical mapping ----------------------------------------------------------- */
const zoneNotes = {
    underground: {
        label: "Underground",
        notes: [
            "C2", "D2", "E2", "F2", "G2", "A2", "B2",
            "C3", "D3", "E3", "F3", "G3", "A3", "B3"
        ]
    },
    garden: {
        label: "Garden",
        notes: ["C4", "E4", "G4", "A4"]
    },
    sky: {
        label: "Sky",
        notes: [
            "C5", "D5", "E5", "F5", "G5", "A5", "B5",
            "C6", "D6", "E6", "F6", "G6", "A6", "B6"
        ]
    }
};

/* Dragging ------------------------------------------------------------------ */
let isDragging = false;
let pointerOffset = {
    x: 0,
    y: 0
};
let lastValidPosition = {
    x: 0,
    y: 0
};

function placeFlower(xPosition, yPosition) {
    const canvasBounds = soundCanvas.getBoundingClientRect();
    const flowerBounds = flowerButton.getBoundingClientRect();
    const maximumX = canvasBounds.width - flowerBounds.width;
    const maximumY = canvasBounds.height - flowerBounds.height;
    const clampedX = Math.min(Math.max(0, xPosition), maximumX);
    const clampedY = Math.min(Math.max(0, yPosition), maximumY);

    flowerButton.style.left = `${clampedX}px`;
    flowerButton.style.top = `${clampedY}px`;
}

function setInitialPosition() {
    const canvasBounds = soundCanvas.getBoundingClientRect();
    const flowerBounds = flowerButton.getBoundingClientRect();
    const xPosition = (canvasBounds.width - flowerBounds.width) / 2;
    const yPosition = (canvasBounds.height - flowerBounds.height) / 2;

    placeFlower(xPosition, yPosition);
    lastValidPosition = {
        x: xPosition,
        y: yPosition
    };
}

function startDragging(event) {
    event.preventDefault();

    const flowerBounds = flowerButton.getBoundingClientRect();
    pointerOffset.x = event.clientX - flowerBounds.left;
    pointerOffset.y = event.clientY - flowerBounds.top;
    isDragging = true;

    flowerButton.classList.add("isDragging");
    flowerButton.setPointerCapture(event.pointerId);
}

function moveFlower(event) {
    if (!isDragging) return;

    const canvasBounds = soundCanvas.getBoundingClientRect();
    const xPosition = event.clientX - canvasBounds.left - pointerOffset.x;
    const yPosition = event.clientY - canvasBounds.top - pointerOffset.y;
    placeFlower(xPosition, yPosition);
}

function stopDragging(event) {
    if (!isDragging) return;

    isDragging = false;
    flowerButton.classList.remove("isDragging");

    const canvasBounds = soundCanvas.getBoundingClientRect();
    const releasedInsideCanvas =
        event.clientX >= canvasBounds.left &&
        event.clientX <= canvasBounds.right &&
        event.clientY >= canvasBounds.top &&
        event.clientY <= canvasBounds.bottom;

    if (!releasedInsideCanvas) {
        placeFlower(lastValidPosition.x, lastValidPosition.y);
        soundStatus.textContent = "Flower returned to its previous position.";
        return;
    }

    const flowerBounds = flowerButton.getBoundingClientRect();
    const flowerCentreY = flowerBounds.top + flowerBounds.height / 2 - canvasBounds.top;
    const zoneKey = findZone(flowerCentreY, canvasBounds.height);

    lastValidPosition.x = parseFloat(flowerButton.style.left);
    lastValidPosition.y = parseFloat(flowerButton.style.top);
    playZoneNote(zoneKey);
}

function cancelDragging() {
    if (!isDragging) return;

    isDragging = false;
    flowerButton.classList.remove("isDragging");
    placeFlower(lastValidPosition.x, lastValidPosition.y);
}

/* Zone feedback ------------------------------------------------------------- */
function findZone(flowerCentreY, canvasHeight) {
    if (flowerCentreY < canvasHeight / 3) return "sky";
    if (flowerCentreY < (canvasHeight / 3) * 2) return "garden";
    return "underground";
}

function getRandomNote(zoneKey) {
    const notes = zoneNotes[zoneKey].notes;
    const randomIndex = Math.floor(Math.random() * notes.length);
    return notes[randomIndex];
}

let clearHighlightTimer;

function highlightZone(zoneKey) {
    const zones = document.querySelectorAll(".zone");
    const selectedZone = document.querySelector(`[data-zone="${zoneKey}"]`);

    clearTimeout(clearHighlightTimer);
    zones.forEach(zone => zone.classList.remove("isSelected"));
    selectedZone.classList.add("isSelected");

    clearHighlightTimer = setTimeout(() => {
        selectedZone.classList.remove("isSelected");
    }, 450);
}

/* Audio --------------------------------------------------------------------- */
let flowerSynth;

async function prepareSynth() {
    // Browsers allow Tone.js audio only after a user starts the interaction.
    await Tone.start();

    if (!flowerSynth) {
        flowerSynth = new Tone.Synth({
            // Triangle harmonics keep the low underground notes audible on small speakers.
            oscillator: {
                type: "triangle"
            },
            envelope: {
                attack: 0.04,
                decay: 0.1,
                sustain: 0.2,
                release: 0.3
            }
        }).toDestination();

        flowerSynth.volume.value = -16;
    }
}

function getVolumeForNote(note) {
    const octave = Number(note.slice(-1));

    if (octave === 2) return -8;
    if (octave === 3) return -12;
    return -16;
}

async function playZoneNote(zoneKey) {
    const note = getRandomNote(zoneKey);
    const selectedZone = zoneNotes[zoneKey];

    soundStatus.textContent = `${selectedZone.label} - ${note}`;
    highlightZone(zoneKey);
    await prepareSynth();

    // A bounded boost balances low notes while higher notes remain comfortable.
    flowerSynth.volume.rampTo(getVolumeForNote(note), 0.04);
    flowerSynth.triggerAttackRelease(note, "8n");
}

/* User input and setup ------------------------------------------------------ */
flowerButton.addEventListener("pointerdown", startDragging);
flowerButton.addEventListener("pointermove", moveFlower);
flowerButton.addEventListener("pointerup", stopDragging);
flowerButton.addEventListener("pointercancel", cancelDragging);

setInitialPosition();

window.addEventListener("resize", () => {
    placeFlower(lastValidPosition.x, lastValidPosition.y);
});
