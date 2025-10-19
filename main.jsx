import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@websim/remotion/player";
import { ReplayComposition } from "./composition.jsx";
const rootElement = document.getElementById("player-root");
const root = createRoot(rootElement);
let replayData = null;
const renderPlayer = (data) => {
  if (!data || !data.frames || data.frames.length === 0) {
    console.error("No replay data to render");
    return;
  }
  const durationInSeconds = (data.frames[data.frames.length - 1].timestamp - data.frames[0].timestamp) / 1e3;
  const durationInFrames = Math.ceil(durationInSeconds * 30) + 90;
  root.render(
    /* @__PURE__ */ jsxDEV(
      Player,
      {
        component: ReplayComposition,
        durationInFrames,
        fps: 30,
        compositionWidth: 540,
        compositionHeight: 960,
        loop: true,
        controls: true,
        autoplay: true,
        inputProps: { replayData: data },
        style: { width: "100%", height: "100%" },
        numberOfSharedAudioTags: 100
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 20,
        columnNumber: 7
      }
    )
  );
};
window.addEventListener("showReplay", (e) => {
  replayData = e.detail;
  renderPlayer(replayData);
});
window.addEventListener("hideReplay", () => {
  root.render(null);
});
