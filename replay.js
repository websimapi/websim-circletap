import React from "react";
import { render } from "react-dom";
import { Player } from "@websim/remotion/player";
import { ReplayComposition } from "./composition.jsx";

export function showReplay(replayData) {
    const event = new CustomEvent('showReplay', {
        detail: replayData
    });
    window.dispatchEvent(event);
}

export function hideReplay() {
    const event = new CustomEvent('hideReplay');
    window.dispatchEvent(event);
}

export function renderReplayToVideo(replayData) {
    return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '540px';
        container.style.height = '960px';
        document.body.appendChild(container);

        const canvas = document.createElement('canvas');
        canvas.width = 540;
        canvas.height = 960;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            document.body.removeChild(container);
            const blob = new Blob(chunks, { type: 'video/webm' });
            resolve(blob);
        };
        
        recorder.onerror = (e) => {
            document.body.removeChild(container);
            reject(e);
        }

        const durationInSeconds = (replayData.duration / 1000);
        const durationInFrames = Math.ceil(durationInSeconds * 30) + 90;

        let currentFrame = 0;

        const onFrame = (frame) => {
            if (frame < durationInFrames) {
                currentFrame = frame + 1;
            } else {
                 if(recorder.state === 'recording') {
                    recorder.stop();
                 }
            }
        };

        const onCanvasReady = (canvasEl) => {
            if (!canvasEl) return;
            
            const draw = () => {
                if(currentFrame >= durationInFrames && recorder.state === 'recording') {
                    recorder.stop();
                    return;
                }
                if (canvasEl.width > 0 && canvasEl.height > 0) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(canvasEl, 0, 0);
                }
                requestAnimationFrame(draw);
            };

            draw();
            recorder.start();
        };

        render(
            <Player
                component={ReplayComposition}
                durationInFrames={durationInFrames}
                fps={30}
                compositionWidth={540}
                compositionHeight={960}
                autoplay
                inputProps={{ replayData: replayData }}
                onFrame={onFrame}
                onCanvasReady={onCanvasReady}
                style={{ width: "100%", height: "100%" }}
                _internal_no_border_radius
            />,
            container
        );
    });
}