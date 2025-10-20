import { renderReplayToVideo as renderVideo } from './renderer.jsx';

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
    return renderVideo(replayData);
}

