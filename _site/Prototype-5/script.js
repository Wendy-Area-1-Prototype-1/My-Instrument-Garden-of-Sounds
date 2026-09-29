"use strict";

/*
This script pairs one Tone.js note with a temporary colour-and-glow response.
Repeated input restarts that response without adding movement feedback.
*/

/* Page elements and timing ------------------------------------------------- */
const flowerButton = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.44;
let flowerSynth;
let isAudioStarting = false;
let lastStartTime = 0;

// Include the release tail so the colour and glow finish with the note.
flowerButton.style.setProperty(
    "--feedback-duration",
    `${noteDuration + releaseDuration}s`
);

function restartFeedback() {
    flowerButton.classList.remove("isPlaying");

    // Reading layout lets the same class restart after rapid repeated input.
    void flowerButton.offsetWidth;
    flowerButton.classList.add("isPlaying");
}

/* Audio and visual feedback ----------------------------------------------- */
async function playFlower() {
    // Coalescing input during audio startup prevents a delayed burst of notes.
    if (isAudioStarting) return;

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    isAudioStarting = true;

    try {
        // Browsers require a user gesture to unlock audio; resume after interruptions too.
        if (!flowerSynth || Tone.getContext().state !== "running") {
            soundStatus.textContent = "Starting sound…";
            await Tone.start();
        }

        if (Tone.getContext().state !== "running") {
            soundStatus.textContent = "Audio is unavailable. Try another browser.";
            return;
        }

        if (!flowerSynth) {
            // One reusable monophonic voice prevents rapid taps from stacking volume.
            flowerSynth = new Tone.Synth({
                oscillator: {
                    type: "sine"
                },
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

        // A 20ms lead avoids late audio scheduling; batched clicks keep distinct times.
        const startTime = Math.max(
            Tone.immediate() + 0.02,
            lastStartTime + flowerSynth.sampleTime
        );
        flowerSynth.triggerAttackRelease("C4", noteDuration, startTime, 0.65);
        lastStartTime = startTime;
        restartFeedback();
        soundStatus.textContent = "Sound played";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        isAudioStarting = false;
    }
}

/* User input and accessibility -------------------------------------------- */
// Native button clicks cover mouse, touch, Enter and Space without duplicate handlers.
flowerButton.addEventListener("click", playFlower);

// A held key is one activation, rather than an unintended repeating note.
flowerButton.addEventListener("keydown", event => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});

flowerButton.addEventListener("animationend", () => {
    // A completed older cycle must not cancel a newer tap's feedback.
    const feedbackIsRunning = flowerButton
        .getAnimations({
            subtree: true
        })
        .some(animation => animation.playState === "running");

    if (!feedbackIsRunning) {
        flowerButton.classList.remove("isPlaying");
    }
});

// Enable interaction only after the deferred scripts have finished loading.
flowerButton.disabled = false;
soundStatus.textContent = typeof Tone === "undefined"
    ? "Sound could not load. Check your connection and reload."
    : "";
