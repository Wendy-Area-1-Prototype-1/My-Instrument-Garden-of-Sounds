"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const noteDuration = 0.28;
const releaseDuration = 0.44;
let synth;
let startingAudio = false;
let lastStartTime = 0;

// Include the release tail so the colour and glow finish with the note.
flower.style.setProperty("--feedback-duration", `${noteDuration + releaseDuration}s`);

function restartFeedback() {
    flower.classList.remove("is-playing");
    // Flush the previous cycle so a repeated tap starts a fresh response.
    void flower.offsetWidth;
    flower.classList.add("is-playing");
}

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

        // A 20ms lead avoids late audio scheduling; batched clicks keep distinct times.
        const startTime = Math.max(Tone.immediate() + 0.02, lastStartTime + synth.sampleTime);
        synth.triggerAttackRelease("C4", noteDuration, startTime, 0.65);
        lastStartTime = startTime;
        restartFeedback();
        soundStatus.textContent = "Sound played";
    } catch {
        soundStatus.textContent = "Sound could not start. Tap the flower to try again.";
    } finally {
        startingAudio = false;
    }
}

// Native button clicks cover mouse, touch, Enter and Space without duplicate handlers.
flower.addEventListener("click", playFlower);

// A held key is one activation, rather than an unintended repeating note.
flower.addEventListener("keydown", event => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
    }
});

flower.addEventListener("animationend", () => {
    // A completed older cycle must not cancel a newer tap's feedback.
    if (!flower.getAnimations({ subtree: true }).some(animation => animation.playState === "running")) {
        flower.classList.remove("is-playing");
    }
});

// Enable interaction only after the deferred scripts have finished loading.
flower.disabled = false;
soundStatus.textContent = typeof Tone === "undefined"
    ? "Sound could not load. Check your connection and reload."
    : "";
