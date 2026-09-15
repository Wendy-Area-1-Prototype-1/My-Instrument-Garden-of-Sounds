// The JavaScript is organised by job: page elements, notes, dragging, zones, and sound.

///////////// Page Elements
const canvas = document.getElementById("sound-canvas");
const flower = document.getElementById("draggable-flower");
const status = document.getElementById("sound-status");

///////////// Notes
const zoneNotes = {
    underground: {
        label: "Underground",
        notes: ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3"]
    },
    garden: {
        label: "Garden",
        notes: ["C4", "E4", "G4", "A4"]
    },
    sky: {
        label: "Sky",
        notes: ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6", "E6", "F6", "G6", "A6", "B6"]
    }
};

///////////// Dragging
let dragging = false;
let pointerOffset = { x: 0, y: 0 };
let lastValidPosition = { x: 0, y: 0 };

function placeFlower(x, y) {
    const canvasRect = canvas.getBoundingClientRect();
    const flowerRect = flower.getBoundingClientRect();
    const maxX = canvasRect.width - flowerRect.width;
    const maxY = canvasRect.height - flowerRect.height;
    const clampedX = Math.min(Math.max(0, x), maxX);
    const clampedY = Math.min(Math.max(0, y), maxY);

    flower.style.left = clampedX + "px";
    flower.style.top = clampedY + "px";
}

function setInitialPosition() {
    const canvasRect = canvas.getBoundingClientRect();
    const flowerRect = flower.getBoundingClientRect();
    const x = (canvasRect.width - flowerRect.width) / 2;
    const y = (canvasRect.height - flowerRect.height) / 2;

    placeFlower(x, y);
    lastValidPosition = { x, y };
}

function startDragging(event) {
    event.preventDefault();

    const flowerRect = flower.getBoundingClientRect();
    pointerOffset.x = event.clientX - flowerRect.left;
    pointerOffset.y = event.clientY - flowerRect.top;
    dragging = true;

    flower.classList.add("is-dragging");
    flower.setPointerCapture(event.pointerId);
}

function moveFlower(event) {
    if (dragging === false) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left - pointerOffset.x;
    const y = event.clientY - canvasRect.top - pointerOffset.y;
    placeFlower(x, y);
}

function stopDragging(event) {
    if (dragging === false) return;

    dragging = false;
    flower.classList.remove("is-dragging");

    const canvasRect = canvas.getBoundingClientRect();
    const releasedInsideCanvas =
        event.clientX >= canvasRect.left &&
        event.clientX <= canvasRect.right &&
        event.clientY >= canvasRect.top &&
        event.clientY <= canvasRect.bottom;

    if (releasedInsideCanvas === false) {
        placeFlower(lastValidPosition.x, lastValidPosition.y);
        status.textContent = "Flower returned to its previous position.";
        return;
    }

    const flowerRect = flower.getBoundingClientRect();
    const flowerCentreY = flowerRect.top + flowerRect.height / 2 - canvasRect.top;
    const zoneKey = findZone(flowerCentreY, canvasRect.height);

    lastValidPosition.x = parseFloat(flower.style.left);
    lastValidPosition.y = parseFloat(flower.style.top);
    playZoneNote(zoneKey);
}

function cancelDragging() {
    if (dragging === false) return;

    dragging = false;
    flower.classList.remove("is-dragging");
    placeFlower(lastValidPosition.x, lastValidPosition.y);
}

flower.addEventListener("pointerdown", startDragging);
flower.addEventListener("pointermove", moveFlower);
flower.addEventListener("pointerup", stopDragging);
flower.addEventListener("pointercancel", cancelDragging);

///////////// Zone Selection
function findZone(flowerY, canvasHeight) {
    if (flowerY < canvasHeight / 3) return "sky";
    if (flowerY < (canvasHeight / 3) * 2) return "garden";
    return "underground";
}

function getRandomNote(zoneKey) {
    const notes = zoneNotes[zoneKey].notes;
    const randomNumber = Math.floor(Math.random() * notes.length);
    return notes[randomNumber];
}

let clearHighlightTimer;

function highlightZone(zoneKey) {
    const zones = document.querySelectorAll(".zone");
    const selectedZone = document.querySelector('[data-zone="' + zoneKey + '"]');

    clearTimeout(clearHighlightTimer);
    zones.forEach((zone) => zone.classList.remove("is-selected"));
    selectedZone.classList.add("is-selected");

    clearHighlightTimer = setTimeout(() => {
        selectedZone.classList.remove("is-selected");
    }, 450);
}

///////////// Sound
let synth;

async function prepareSynth() {
    await Tone.start();

    if (!synth) {
        synth = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.04,
                decay: 0.1,
                sustain: 0.2,
                release: 0.3
            }
        }).toDestination();

        synth.volume.value = -16;
    }
}

async function playZoneNote(zoneKey) {
    const note = getRandomNote(zoneKey);
    const zone = zoneNotes[zoneKey];

    status.textContent = zone.label + " - " + note;
    highlightZone(zoneKey);
    await prepareSynth();
    synth.triggerAttackRelease(note, "8n");
}

///////////// Setup
setInitialPosition();

window.addEventListener("resize", () => {
    placeFlower(lastValidPosition.x, lastValidPosition.y);
});
