"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
let synth;
let noteLoop;
let isPlaying = false;
let startingAudio = false;

function stopRhythm() {
    Tone.Transport.stop();
    synth.triggerRelease(Tone.immediate());
    isPlaying = false;
    soundStatus.textContent = "Rhythm stopped";
}

async function toggleRhythm() {
    if (startingAudio) return;
    if (isPlaying) {
        stopRhythm();
        return;
    }

    if (typeof Tone === "undefined") {
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;
    try {
        // Tone.js starts only after the user's first interaction.
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
            // Match Prototype 7 with one C4 note every quarter note.
            noteLoop = new Tone.Loop(time => {
                synth.triggerAttackRelease("C4", noteDuration, time, 0.65);
            }, "4n").start("4n");
        }

        Tone.Transport.position = 0;
        synth.triggerAttackRelease("C4", noteDuration, Tone.immediate(), 0.65);
        isPlaying = true;
        Tone.Transport.start();
        soundStatus.textContent = "Rhythm playing";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

flower.addEventListener("click", toggleRhythm);
