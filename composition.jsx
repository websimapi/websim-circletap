import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Img, spring, useVideoConfig, Sequence } from "remotion";
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
const LevelDisplay = ({ level, isVisible }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = isVisible ? spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 150
    }
  }) : 0;
  const opacity = isVisible ? interpolate(frame, [0, 15], [0, 0.5]) : 0;
  return /* @__PURE__ */ jsxDEV("div", { style: {
    position: "absolute",
    fontSize: "8rem",
    fontWeight: "bold",
    color: "rgba(220, 220, 220, 0.5)",
    textShadow: "0 0 10px rgba(0,0,0,0.5)",
    opacity,
    transform: `scale(${scale})`,
    zIndex: 1
  }, children: level }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 62,
    columnNumber: 9
  });
};
const EndScreenOverlay = ({ score, level, user, isGameOver }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scaleIn = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 150
    }
  });
  const opacity = interpolate(frame, [0, 15], [0, 1]);
  const finalScoreText = `Final Score: ${score}`;
  const finalLevelText = `Level: ${level}`;
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { padding: "20px", fontFamily: "Arial, sans-serif", color: "white", opacity }, children: [
    user && /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: "20px", left: "20px", display: "flex", alignItems: "center", gap: "10px", transform: `scale(${scaleIn})` }, children: [
      /* @__PURE__ */ jsxDEV(Img, { src: user.avatar_url, style: { width: "50px", height: "50px", borderRadius: "50%" } }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 100,
        columnNumber: 21
      }),
      /* @__PURE__ */ jsxDEV("span", { style: { fontSize: "24px", fontWeight: "bold", textShadow: "2px 2px 4px #000" }, children: user.username }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 101,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 99,
      columnNumber: 18
    }),
    /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: "30px", right: "20px", fontSize: "24px", fontWeight: "bold", textShadow: "2px 2px 4px #000", transform: `scale(${scaleIn})`, textAlign: "right" }, children: [
      /* @__PURE__ */ jsxDEV("div", { children: finalScoreText }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 108,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("div", { children: finalLevelText }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 109,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 107,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 96,
    columnNumber: 9
  });
};
const ReplayComposition = ({ replayData }) => {
  const frame = useCurrentFrame();
  if (!replayData || !replayData.frames || replayData.frames.length < 2) {
    return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#1a1a2e", color: "white", justifyContent: "center", alignItems: "center" }, children: "Loading replay..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 119,
      columnNumber: 16
    });
  }
  const { frames, config } = replayData;
  const { currentUser } = config;
  const startTime = frames[0].timestamp;
  const gameEndTime = frames[frames.length - 1].timestamp;
  const gameEndFrame = Math.ceil((gameEndTime - startTime) / 1e3 * 30);
  const currentTimestamp = startTime + frame / 30 * 1e3;
  let frameIndex;
  if (frame < gameEndFrame) {
    frameIndex = frames.findIndex((f) => f.timestamp >= currentTimestamp);
    if (frameIndex === -1) frameIndex = frames.length - 1;
  } else {
    frameIndex = frames.length - 1;
  }
  const currentFrameData = frames[frameIndex];
  const score = currentFrameData.score;
  const level = currentFrameData.level || 1;
  const isGameOver = frameIndex === frames.length - 1 && !currentFrameData.success;
  const showEndScreen = frame >= gameEndFrame;
  const isDuringEndScreen = frame >= gameEndFrame && frame < gameEndFrame + 90;
  const successFrames = frames.filter((f) => f.success);
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#1a1a2e" }, children: [
    !showEndScreen && /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { top: "5vh", justifyContent: "flex-start", alignItems: "center" }, children: /* @__PURE__ */ jsxDEV("div", { style: { fontSize: "clamp(1.5rem, 5vw, 2.5rem)", fontWeight: "bold", color: config.colors.fail.trim(), fontFamily: "Arial, sans-serif" }, children: [
      "Score: ",
      score
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 155,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 154,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { justifyContent: "center", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxDEV(LevelDisplay, { level, isVisible: !showEndScreen || isDuringEndScreen }, `level-${level}`, false, {
        fileName: "<stdin>",
        lineNumber: 163,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("div", { style: { width: "90vmin", height: "90vmin" }, children: /* @__PURE__ */ jsxDEV(GameCanvas, { frameData: currentFrameData, config }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 165,
        columnNumber: 21
      }) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 164,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 162,
      columnNumber: 13
    }),
    showEndScreen && /* @__PURE__ */ jsxDEV(EndScreenOverlay, { score, level, user: currentUser, isGameOver }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 170,
      columnNumber: 32
    }),
    /* @__PURE__ */ jsxDEV(Audio, { src: "/start_sound.mp3", volume: 0.5 }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 173,
      columnNumber: 13
    }),
    successFrames.map((f, i) => {
      const frameForAudio = Math.round((f.timestamp - startTime) / 1e3 * 30);
      if (frameForAudio < gameEndFrame) {
        return /* @__PURE__ */ jsxDEV(Sequence, { from: frameForAudio, children: /* @__PURE__ */ jsxDEV(Audio, { src: "/success.mp3" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 181,
          columnNumber: 25
        }) }, `success-${i}`, false, {
          fileName: "<stdin>",
          lineNumber: 180,
          columnNumber: 22
        });
      }
      return null;
    }),
    isGameOver && /* @__PURE__ */ jsxDEV(Sequence, { from: gameEndFrame - 1, children: /* @__PURE__ */ jsxDEV(Audio, { src: "/fail.mp3" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 190,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 189,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 151,
    columnNumber: 9
  });
};
export {
  ReplayComposition
};
