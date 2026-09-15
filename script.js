"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.24;
let synth;
let startingAudio = false;

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
        if (Tone.getContext().state !== "running") {
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

        synth.triggerAttackRelease("C4", noteDuration, Tone.now(), 0.65);
        soundStatus.textContent = "Sound played";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

// A native button's click event supports mouse, touch, Enter and Space.
flower.addEventListener("click", playFlower);
