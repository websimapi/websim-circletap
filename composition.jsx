import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio } from "remotion";
const GameCanvas = ({ frameData, config }) => {
  const { angle, targetStartAngle, targetSize, success, fail } = frameData;
  const { difficulty, difficulties, colors } = config;
  const { trackWidthFactor } = difficulties[difficulty];
  const radius = 40;
  const lineWidth = radius * 2 * trackWidthFactor;
  return /* @__PURE__ */ jsxDEV("svg", { viewBox: "-55 -55 110 110", style: { width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ jsxDEV(
      "circle",
      {
        cx: "0",
        cy: "0",
        r: radius,
        fill: "none",
        stroke: colors.secondary,
        strokeWidth: lineWidth,
        strokeLinecap: "butt"
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 15,
        columnNumber: 13
      }
    ),
    targetSize > 0 && /* @__PURE__ */ jsxDEV(
      "path",
      {
        d: `M ${radius * Math.cos(targetStartAngle)} ${radius * Math.sin(targetStartAngle)} A ${radius} ${radius} 0 0 1 ${radius * Math.cos(targetStartAngle + targetSize)} ${radius * Math.sin(targetStartAngle + targetSize)}`,
        fill: "none",
        stroke: colors.success,
        strokeWidth: lineWidth * 0.95,
        strokeLinecap: "round"
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 24,
        columnNumber: 17
      }
    ),
    /* @__PURE__ */ jsxDEV("g", { transform: `rotate(${angle * 180 / Math.PI + 90})`, children: /* @__PURE__ */ jsxDEV(
      "line",
      {
        x1: "0",
        y1: -(radius - lineWidth / 2),
        x2: "0",
        y2: -(radius + lineWidth / 2),
        stroke: colors.fail,
        strokeWidth: lineWidth / 2.5,
        strokeLinecap: "butt"
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 34,
        columnNumber: 17
      }
    ) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 33,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 13,
    columnNumber: 9
  });
};
const ReplayComposition = ({ replayData }) => {
  const frame = useCurrentFrame();
  if (!replayData || !replayData.frames || replayData.frames.length < 2) {
    return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#1a1a2e", color: "white", justifyContent: "center", alignItems: "center" }, children: "Loading replay..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 50,
      columnNumber: 16
    });
  }
  const { frames, config } = replayData;
  const startTime = frames[0].timestamp;
  const currentTimestamp = startTime + frame / 30 * 1e3;
  let frameIndex = frames.findIndex((f) => f.timestamp >= currentTimestamp);
  if (frameIndex === -1) frameIndex = frames.length - 1;
  const currentFrameData = frames[frameIndex];
  const score = currentFrameData.score;
  const isGameOver = frameIndex === frames.length - 1 && !currentFrameData.success;
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#1a1a2e" }, children: [
    /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { top: "5vh", justifyContent: "flex-start", alignItems: "center" }, children: /* @__PURE__ */ jsxDEV("div", { style: { fontSize: "clamp(1.5rem, 5vw, 2.5rem)", fontWeight: "bold", color: config.colors.fail.trim(), fontFamily: "Arial, sans-serif" }, children: [
      "Score: ",
      score
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 68,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 67,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { justifyContent: "center", alignItems: "center" }, children: /* @__PURE__ */ jsxDEV("div", { style: { width: "90vmin", height: "90vmin" }, children: /* @__PURE__ */ jsxDEV(GameCanvas, { frameData: currentFrameData, config }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 75,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 74,
      columnNumber: 17
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 73,
      columnNumber: 13
    }),
    frames.map((f, i) => {
      if (!f.success) return null;
      const frameForAudio = Math.round((f.timestamp - startTime) / 1e3 * 30);
      return /* @__PURE__ */ jsxDEV(Audio, { src: "/success.mp3", startFrom: frameForAudio, endAt: frameForAudio + 30 }, `success-${i}`, false, {
        fileName: "<stdin>",
        lineNumber: 82,
        columnNumber: 24
      });
    }),
    isGameOver && /* @__PURE__ */ jsxDEV(Audio, { src: "/fail.mp3", startFrom: frame - 1 }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 86,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 66,
    columnNumber: 9
  });
};
export {
  ReplayComposition
};
