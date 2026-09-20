"use strict";

const flower = document.querySelector("#flower");
const soundStatus = document.querySelector("#sound-status");
const rippleLayer = document.querySelector(".ripples");
const activeRipples = new Map();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const maxActiveRipples = 12;
const noteDuration = 0.28;
const releaseDuration = 0.44;
let synth;
let startingAudio = false;
let lastStartTime = 0;
let responseCount = 0;

function removeRipple(ripple) {
    if (!activeRipples.has(ripple)) return;
    // End events and fallback timers share cleanup, including rings removed by the cap.
    clearTimeout(activeRipples.get(ripple));
    activeRipples.delete(ripple);
    ripple.remove();
}

function createRipples(startTime) {
    // Reduced motion keeps a clear response with two smaller, shorter rings.
    const ringCount = reducedMotion.matches ? 2 : 3;
    // Keep both DOM elements and cleanup timers bounded during rapid repeated input.
    while (activeRipples.size > maxActiveRipples - ringCount) {
        removeRipple(activeRipples.keys().next().value);
    }

    const flowerBounds = flower.getBoundingClientRect();
    const layerBounds = rippleLayer.getBoundingClientRect();
    const duration = reducedMotion.matches ? 0.28 : noteDuration + releaseDuration;
    const soundDelay = Math.max(0, startTime - Tone.immediate());
    const endDiameter = reducedMotion.matches
        ? flowerBounds.width * 1.35
        : Math.hypot(layerBounds.width, layerBounds.height);

    // Rings begin at the flower; their staggered durations end together.
    for (let index = 0; index < ringCount; index++) {
        const ripple = document.createElement("span");
        const stagger = index * (reducedMotion.matches ? 0.03 : 0.07);
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

function clearRipples() {
    for (const ripple of activeRipples.keys()) removeRipple(ripple);
}

// Discard rings positioned for an old layout or motion setting; the next tap remeasures.
window.addEventListener("resize", clearRipples);
reducedMotion.addEventListener("change", clearRipples);

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
        // A changing live-region message announces each successful activation.
        soundStatus.textContent = `The garden responded (${++responseCount})`;
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
