"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
let synth;
let noteLoop;
let isPlaying = false;
let startingAudio = false;

function pulseFlower() {
    if (!isPlaying) return;
    flower.classList.remove("beat-pulse");
    // Restart the class so every scheduled note creates a distinct pulse.
    void flower.offsetWidth;
    flower.classList.add("beat-pulse");
}

function playBeat(time) {
    synth.triggerAttackRelease("C4", noteDuration, time, 0.65);
    // Tone.Draw places the DOM update on the frame matching the audio event.
    Tone.Draw.schedule(pulseFlower, time);
}

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
                playBeat(time);
            }, "4n").start("4n");
        }

        Tone.Transport.position = 0;
        isPlaying = true;
        playBeat(Tone.immediate());
        Tone.Transport.start();
        soundStatus.textContent = "Rhythm playing";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

flower.addEventListener("click", toggleRhythm);

flower.addEventListener("animationend", () => {
    // Removing the temporary class prepares the next beat animation.
    flower.classList.remove("beat-pulse");
});
