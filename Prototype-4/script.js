"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.24;
let synth;
let startingAudio = false;

// The visual includes the note's release tail, so both finish together.
flower.style.setProperty("--feedback-duration", `${noteDuration + releaseDuration}s`);

function restartMovement(startTime) {
    flower.classList.remove("is-playing");
    // Flush the previous animation so another tap always starts at normal size.
    void flower.offsetWidth;
    // Match Tone's audio scheduling delay instead of moving before the note starts.
    flower.style.setProperty("--sound-delay", `${Math.max(0, startTime - Tone.immediate())}s`);
    soundStatus.textContent = "";
    flower.classList.add("is-playing");
}

async function playFlower() {
    // Coalesce taps while the browser unlocks audio; never queue a burst of notes.
    if (startingAudio) return;

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;

    try {
        // The first user click unlocks audio. Resume it again after a mobile interruption.
        if (!synth || Tone.getContext().state !== "running") {
            await Tone.start();
        }

        if (!synth) {
            // Reuse one quiet, monophonic voice: rapid taps cannot stack louder voices.
            synth = new Tone.Synth({
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
        synth.triggerAttackRelease("C4", noteDuration, startTime, 0.65);
        restartMovement(startTime);
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

// A native button's click event supports mouse, touch, Enter and Space.
flower.addEventListener("click", playFlower);

// Holding a key is one gesture, not a repeating sound loop.
flower.addEventListener("keydown", event => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});

flower.addEventListener("animationstart", () => {
    soundStatus.textContent = "Sound played";
});

flower.addEventListener("animationend", () => {
    // An old end event must not clear a new animation started by a quick tap.
    if (!flower.getAnimations().some(animation => animation.playState === "running")) {
        flower.classList.remove("is-playing");
    }
});
