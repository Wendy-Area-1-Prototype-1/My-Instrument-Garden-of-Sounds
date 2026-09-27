"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
let synth;
let isPlaying = false;
let startingAudio = false;

function stopSound() {
    // Stop the one transport loop before releasing the current note.
    Tone.Transport.stop();
    synth.triggerRelease(Tone.immediate());
    isPlaying = false;
    flower.classList.remove("is-playing");
    soundStatus.textContent = "Sound stopped";
}

async function toggleSound() {
    if (startingAudio) return;
    if (isPlaying) {
        stopSound();
        return;
    }

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;
    try {
        // Audio can start only after the first user gesture.
        await Tone.start();
        if (!synth) {
            synth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.025,
                    decay: 0.08,
                    sustain: 0.55,
                    release: 0.44,
                    releaseCurve: "linear"
                },
                volume: -16
            }).toDestination();
            Tone.Transport.bpm.value = 75;
            // One Tone.Loop repeats the same gentle note; it is never duplicated.
            new Tone.Loop(time => {
                synth.triggerAttackRelease("C4", noteDuration, time, 0.65);
            }, "4n").start("4n");
        }

        Tone.Transport.position = 0;
        synth.triggerAttackRelease("C4", noteDuration, Tone.immediate(), 0.65);
        isPlaying = true;
        Tone.Transport.start();
        // The spinning class mirrors the sound's playing state.
        flower.classList.add("is-playing");
        soundStatus.textContent = "Sound playing";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

flower.addEventListener("click", toggleSound);
