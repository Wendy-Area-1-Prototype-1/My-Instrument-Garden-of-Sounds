"use strict";

/*
This script pairs one Tone.js note with one grow-and-bounce cycle. Repeated input
restarts both responses so the prototype can test movement as sound feedback.
*/

/* Page elements and timing ------------------------------------------------- */
const flowerButton = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.24;
let flowerSynth;
let isAudioStarting = false;

// The movement includes the release tail so the sound and visual finish together.
flowerButton.style.setProperty(
    "--feedback-duration",
    `${noteDuration + releaseDuration}s`
);

function restartMovement(startTime) {
    flowerButton.classList.remove("isPlaying");

    // Reading layout lets the same class restart after rapid repeated input.
    void flowerButton.offsetWidth;
    const soundDelay = Math.max(0, startTime - Tone.immediate());
    flowerButton.style.setProperty("--sound-delay", `${soundDelay}s`);
    soundStatus.textContent = "";
    flowerButton.classList.add("isPlaying");
}

/* Audio and movement ------------------------------------------------------- */
async function playFlower() {
    // Coalescing input during audio startup prevents a delayed burst of notes.
    if (isAudioStarting) return;

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    isAudioStarting = true;

    try {
        // The first user click unlocks audio. Resume it again after a mobile interruption.
        if (!flowerSynth || Tone.getContext().state !== "running") {
            await Tone.start();
        }

        if (!flowerSynth) {
            // One reusable monophonic voice prevents rapid taps from stacking volume.
            flowerSynth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.025,
                    decay: 0.08,
                    sustain: 0.55,
                    release: releaseDuration,
                    releaseCurve: "linear"
                },
                volume: -16
            }).toDestination();
        }

        const startTime = Tone.now();
        flowerSynth.triggerAttackRelease("C4", noteDuration, startTime, 0.65);
        restartMovement(startTime);
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        isAudioStarting = false;
    }
}

/* User input and accessibility -------------------------------------------- */
// A native button's click event supports mouse, touch, Enter and Space.
flowerButton.addEventListener("click", playFlower);

// Holding a key is one gesture, not a repeating sound loop.
flowerButton.addEventListener("keydown", event => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});

flowerButton.addEventListener("animationstart", () => {
    soundStatus.textContent = "Sound played";
});

flowerButton.addEventListener("animationend", () => {
    // An old end event must not clear a new animation started by a quick tap.
    const movementIsRunning = flowerButton
        .getAnimations()
        .some(animation => animation.playState === "running");

    if (!movementIsRunning) {
        flowerButton.classList.remove("isPlaying");
    }
});
