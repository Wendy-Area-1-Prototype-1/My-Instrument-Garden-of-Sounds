"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const rippleLayer = document.querySelector(".ripples");
const activeRipples = new Map();
const ripplesPerTap = 3;
const maxActiveRipples = 12;
const noteDuration = 0.28;
const releaseDuration = 0.44;
let synth;
let startingAudio = false;
let lastStartTime = 0;

function removeRipple(ripple) {
    if (!activeRipples.has(ripple)) return;
    // End events and fallback timers share cleanup, including rings removed by the cap.
    clearTimeout(activeRipples.get(ripple));
    activeRipples.delete(ripple);
    ripple.remove();
}

function createRipples(startTime) {
    // Keep both DOM elements and cleanup timers bounded during rapid repeated input.
    while (activeRipples.size > maxActiveRipples - ripplesPerTap) {
        removeRipple(activeRipples.keys().next().value);
    }

    const flowerBounds = flower.getBoundingClientRect();
    const layerBounds = rippleLayer.getBoundingClientRect();
    const duration = noteDuration + releaseDuration;
    const soundDelay = Math.max(0, startTime - Tone.immediate());
    const endDiameter = Math.hypot(layerBounds.width, layerBounds.height);

    // Three rings begin at the flower and spread across the surrounding garden.
    for (let index = 0; index < ripplesPerTap; index++) {
        const ripple = document.createElement("span");
        const stagger = index * 0.07;
        ripple.className = "ripple";
        ripple.style.left = `${flowerBounds.left + flowerBounds.width / 2 - layerBounds.left}px`;
        ripple.style.top = `${flowerBounds.top + flowerBounds.height / 2 - layerBounds.top}px`;
        ripple.style.setProperty("--ripple-size", `${flowerBounds.width}px`);
        ripple.style.setProperty("--ripple-end", `${endDiameter}px`);
        ripple.style.setProperty("--ripple-duration", `${duration - stagger}s`);
        ripple.style.animationDelay = `${soundDelay + stagger}s`;

        // Every ring finishes with the release tail; the timeout covers missing animation events.
        activeRipples.set(ripple, setTimeout(() => removeRipple(ripple),
            (soundDelay + duration) * 1000 + 150));
        rippleLayer.append(ripple);
    }
}

for (const eventName of ["animationend", "animationcancel"]) {
    rippleLayer.addEventListener(eventName, event => removeRipple(event.target));
}

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
        createRipples(startTime);
        soundStatus.textContent = "The garden responded";
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
