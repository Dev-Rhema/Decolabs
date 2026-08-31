import { useEffect, useId, useRef } from "react";
import { registerEye } from "./eyeSync";

// Geometry traced directly from the reference image (1448 x 1086 viewBox).
// The top curve's peak (originally ~227 at its lowest y) is raised via a
// sine taper (offset = 0 at both corners, largest near the middle) that
// gets stacked on top of the current values each time it's raised again.
const OUTLINE_PATH =
  "M 94.0 544.0 " +
  "C 123.3 525.3 185.2 496.8 270.0 432.8 " +
  "C 354.8 370.8 517.0 234.7 603.0 185.0 " +
  "C 689.0 139.7 730.0 134.3 786.0 128.8 " +
  "C 842.0 125.2 872.2 125.7 939.0 154.0 " +
  "C 1005.8 184.5 1121.5 273.8 1187.0 312.8 " +
  "C 1252.5 353.0 1307.8 371.1 1332.0 383.0 " +
  "C 1304.2 419.0 1210.0 546.7 1165.0 599.0 " +
  "C 1120.0 651.3 1103.3 666.5 1062.0 697.0 " +
  "C 1020.7 727.5 966.7 761.2 917.0 782.0 " +
  "C 867.3 802.8 818.2 815.7 764.0 822.0 " +
  "C 709.8 828.3 649.2 828.2 592.0 820.0 " +
  "C 534.8 811.8 480.2 798.0 421.0 773.0 " +
  "C 361.8 748.0 291.5 708.2 237.0 670.0 " +
  "C 182.5 631.8 117.8 565.0 94.0 544.0 Z";

// Inner eyelid crease (separates the tan lid from the white sclera below)
const CREASE_PATH =
  "M 94.0 544.0 " +
  "C 105.3 544.3 110.0 544.5 162.0 546.0 " +
  "C 214.0 547.5 319.8 556.3 406.0 553.0 " +
  "C 492.2 549.7 573.7 541.3 679.0 526.0 " +
  "C 784.3 510.7 937.7 483.3 1038.0 461.0 " +
  "C 1138.3 438.7 1232.0 405.0 1281.0 392.0 " +
  "C 1330.0 379.0 1323.5 384.5 1332.0 383.0";

// White sclera region: bounded above by the crease, below by the outer bottom curve
const SCLERA_PATH =
  "M 94.0 544.0 " +
  "C 105.3 544.3 110.0 544.5 162.0 546.0 " +
  "C 214.0 547.5 319.8 556.3 406.0 553.0 " +
  "C 492.2 549.7 573.7 541.3 679.0 526.0 " +
  "C 784.3 510.7 937.7 483.3 1038.0 461.0 " +
  "C 1138.3 438.7 1232.0 405.0 1281.0 392.0 " +
  "C 1330.0 379.0 1323.5 384.5 1332.0 383.0 " +
  "C 1304.2 419.0 1210.0 546.7 1165.0 599.0 " +
  "C 1120.0 651.3 1103.3 666.5 1062.0 697.0 " +
  "C 1020.7 727.5 966.7 761.2 917.0 782.0 " +
  "C 867.3 802.8 818.2 815.7 764.0 822.0 " +
  "C 709.8 828.3 649.2 828.2 592.0 820.0 " +
  "C 534.8 811.8 480.2 798.0 421.0 773.0 " +
  "C 361.8 748.0 291.5 708.2 237.0 670.0 " +
  "C 182.5 631.8 117.8 565.0 94.0 544.0 Z";

const PUPIL = { cx: 788, cy: 583, rx: 275, ry: 330 };
const HIGHLIGHT = { cx: 946.2, cy: 567.4, r: 60 };

export default function Eyeball({ lidFill = "#e6a677" }) {
  const uid = useId();
  const eyeClipId = `eyeClip-${uid}`;
  const scleraClipId = `scleraClip-${uid}`;
  const sketchFilterId = `sketchStroke-${uid}`;
  const svgRef = useRef(null);
  const pupilGroupRef = useRef(null);

  // Tracking (cursor-follow) and blinking are driven by a single shared
  // loop in eyeSync so every mounted Eyeball moves in the same direction
  // and blinks at the same moment, instead of each instance running its
  // own independent, out-of-sync loop.
  useEffect(() => {
    return registerEye(svgRef.current, pupilGroupRef.current);
  }, []);

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        viewBox="0 0 1448 1086"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        }}
      >
        <defs>
          <clipPath id={eyeClipId}>
            <path d={OUTLINE_PATH} />
          </clipPath>
          <clipPath id={scleraClipId}>
            <path d={SCLERA_PATH} />
          </clipPath>
          <filter
            id={sketchFilterId}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="3"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="10"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* eyelid fill: defaults to decoHead's skin tone; pass a different
            color (or "none" for a fully transparent lid) if this instance
            sits on a different surface */}
        <path d={OUTLINE_PATH} fill={lidFill} />

        <g clipPath={`url(#${eyeClipId})`}>
          {/* white sclera below the crease */}
          <path d={SCLERA_PATH} fill="#ffffff" />

          {/* pupil, clipped so it never pokes above the crease into the tan lid */}
          <g clipPath={`url(#${scleraClipId})`}>
            <g ref={pupilGroupRef}>
              <ellipse
                cx={PUPIL.cx}
                cy={PUPIL.cy}
                rx={PUPIL.rx}
                ry={PUPIL.ry}
                fill="#0a0a0a"
              />
              <circle
                cx={HIGHLIGHT.cx}
                cy={HIGHLIGHT.cy}
                r={HIGHLIGHT.r}
                fill="#ffffff"
              />
            </g>
          </g>

          {/* crease line drawn on top so it stays crisp over the pupil */}
          <path
            d={CREASE_PATH}
            fill="none"
            stroke="#000000"
            strokeWidth="32"
            strokeLinecap="round"
            filter={`url(#${sketchFilterId})`}
          />
        </g>

        {/* outer eye outline on top of everything */}
        <path
          d={OUTLINE_PATH}
          fill="none"
          stroke="#000000"
          strokeWidth="37"
          strokeLinejoin="round"
          filter={`url(#${sketchFilterId})`}
        />
      </svg>
    </div>
  );
}
