"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
let synth;
let noteLoop;
let isPlaying = false;
let startingAudio = false;
let wantsPlaying = false;

function stopSound() {
    // Mute first, then stop the one loop and cancel queued envelope changes.
    if (synth) {
        synth.volume.value = -100;
        synth.envelope.cancel(Tone.immediate());
        synth.triggerRelease(Tone.immediate());
    }
    if (noteLoop) noteLoop.mute = true;
    if (typeof Tone !== "undefined") Tone.Transport.stop();
    isPlaying = false;
    flower.classList.remove("is-playing");
    flower.setAttribute("aria-pressed", "false");
    soundStatus.textContent = "Sound stopped";
}

async function startSound() {
    // Keep only one in-flight audio unlock, even if taps arrive while it awaits.
    if (startingAudio || isPlaying) return;
    if (typeof Tone === "undefined") {
        wantsPlaying = false;
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;
    try {
        // Audio can start only after the first user gesture; retry on mobile resume.
        await Tone.start();
        if (!wantsPlaying) return;
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
            noteLoop = new Tone.Loop(time => {
                if (isPlaying && wantsPlaying) {
                    synth.triggerAttackRelease("C4", noteDuration, time, 0.65);
                }
            }, "4n").start("4n");
        }

        // Restore this one synth and loop; never create a second copy on restart.
        synth.envelope.cancel(Tone.immediate());
        synth.volume.value = -16;
        noteLoop.mute = false;
        Tone.Transport.position = 0;
        synth.triggerAttackRelease("C4", noteDuration, Tone.immediate(), 0.65);
        isPlaying = true;
        Tone.Transport.start();
        // The spinning class mirrors the sound's playing state.
        flower.classList.add("is-playing");
        flower.setAttribute("aria-pressed", "true");
        soundStatus.textContent = "Sound playing";
    } catch {
        wantsPlaying = false;
        stopSound();
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

flower.addEventListener("click", () => {
    // Every tap reverses the requested state, including taps during audio startup.
    wantsPlaying = !wantsPlaying;
    if (wantsPlaying) {
        void startSound();
    } else {
        stopSound();
    }
});

// Native button clicks cover mouse, touch, Enter and Space. A held key is one tap.
flower.addEventListener("keydown", event => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});
