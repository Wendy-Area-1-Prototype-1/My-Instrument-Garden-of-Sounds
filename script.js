"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.24;
let synth;
let startingAudio = false;
let lastStartTime = 0;

async function playFlower() {
    // Coalesce taps while audio unlocks, instead of queuing a burst of sounds.
    if (startingAudio) return;

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;

    try {
        // Browsers require a user gesture to unlock audio; resume after interruptions too.
        if (!synth || Tone.getContext().state !== "running") {
            soundStatus.textContent = "Starting sound…";
            await Tone.start();
        }

        if (Tone.getContext().state !== "running") {
            soundStatus.textContent = "Audio is unavailable. Try another browser.";
            return;
        }

        if (!synth) {
            // One quiet, monophonic synth is reused so rapid taps cannot stack voices.
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

        // Separate batched clicks by one audio sample to keep Tone start times valid.
        const startTime = Math.max(Tone.now(), lastStartTime + synth.sampleTime);
        synth.triggerAttackRelease("C4", noteDuration, startTime, 0.65);
        lastStartTime = startTime;
        soundStatus.textContent = "Sound played";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

// Native button clicks cover mouse, touch, Enter and Space without duplicate handlers.
flower.addEventListener("click", playFlower);
