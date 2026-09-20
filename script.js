"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.44;
let synth;
let startingAudio = false;
let lastStartTime = 0;

async function playFlower() {
    // Coalesce input while audio unlocks instead of queuing a burst of notes.
    if (startingAudio) return;

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;

    try {
        // A closed audio context cannot be resumed by another tap.
        if (Tone.getContext().state === "closed") {
            soundStatus.textContent = "Sound was disconnected. Reload the page to reconnect audio.";
            return;
        }

        // Tone.start() needs a user gesture; resume again after mobile interruptions.
        if (!synth || Tone.getContext().state !== "running") {
            soundStatus.textContent = "Starting sound…";
            await Tone.start();
        }

        if (Tone.getContext().state !== "running") {
            soundStatus.textContent = "Audio is unavailable. Try another browser.";
            return;
        }

        if (!synth) {
            // Match Prototype 5 exactly; one quiet monophonic synth prevents stacked voices.
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

        // A short lead avoids late scheduling; batched input keeps distinct start times.
        const startTime = Math.max(Tone.immediate() + 0.02, lastStartTime + synth.sampleTime);
        synth.triggerAttackRelease("C4", noteDuration, startTime, 0.65);
        lastStartTime = startTime;
        soundStatus.textContent = "Sound played";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

// Native button clicks support mouse, touch, Enter and Space without double activation.
flower.addEventListener("click", playFlower);
flower.addEventListener("keydown", event => {
    // Holding a key is one gesture, not a repeating sound loop.
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});

flower.disabled = false;
soundStatus.textContent = typeof Tone === "undefined"
    ? "Sound could not load. Check your connection and reload."
    : "";
