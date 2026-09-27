"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
let synth;
let noteLoop;
let isPlaying = false;
let startingAudio = false;
let wantsPlaying = false;

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
    // Cancel queued audio and draw work before resetting the visual state.
    if (synth) {
        synth.volume.value = -100;
        synth.envelope.cancel(Tone.immediate());
        synth.triggerRelease(Tone.immediate());
    }
    if (noteLoop) noteLoop.mute = true;
    if (typeof Tone !== "undefined") {
        Tone.Draw.cancel(Tone.immediate());
        Tone.Transport.stop();
    }
    isPlaying = false;
    flower.classList.remove("beat-pulse");
    flower.setAttribute("aria-pressed", "false");
    soundStatus.textContent = "Rhythm stopped";
}

async function startRhythm() {
    // Only one audio-start request and one loop can exist at a time.
    if (startingAudio || isPlaying) return;
    if (typeof Tone === "undefined") {
        wantsPlaying = false;
        soundStatus.textContent = "Sound could not load. Check your connection and reload.";
        return;
    }

    startingAudio = true;
    try {
        // Tone.js starts only after the user's first interaction.
        await Tone.start();
        if (!wantsPlaying) return;
        if (Tone.getContext().state !== "running") {
            throw new Error("Audio context did not start");
        }
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
            }, "4n").start(0);
            Tone.getContext().rawContext.addEventListener("statechange", () => {
                // A suspended audio context must not leave visual beats running alone.
                if (isPlaying && Tone.getContext().state !== "running") {
                    wantsPlaying = false;
                    stopRhythm();
                    soundStatus.textContent = "Audio paused. Tap the flower to play again.";
                }
            });
        }

        // Reuse the same synth and loop whenever playback restarts.
        synth.envelope.cancel(Tone.immediate());
        synth.volume.value = -16;
        noteLoop.mute = false;
        Tone.Transport.position = 0;
        isPlaying = true;
        flower.setAttribute("aria-pressed", "true");
        // A short lead lets the first note and every later beat share one timeline.
        Tone.Transport.start("+0.05");
        soundStatus.textContent = "Rhythm playing";
    } catch {
        wantsPlaying = false;
        stopRhythm();
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

flower.addEventListener("click", () => {
    // Rapid taps update the requested state instead of creating extra loops.
    wantsPlaying = !wantsPlaying;
    if (wantsPlaying) {
        void startRhythm();
    } else {
        stopRhythm();
    }
});

function clearPulse() {
    // Removing the temporary class prepares the next beat animation.
    flower.classList.remove("beat-pulse");
}

flower.addEventListener("animationend", clearPulse);
flower.addEventListener("animationcancel", clearPulse);

// Native button clicks support mouse, touch, Enter and Space; held keys do not repeat.
flower.addEventListener("keydown", event => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden && wantsPlaying) {
        wantsPlaying = false;
        stopRhythm();
    }
});
