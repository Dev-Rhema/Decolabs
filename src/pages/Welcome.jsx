import { useEffect, useRef, useState } from "react";
import decoLogoImg from "../assets/welcomeImgs/deco logo.png";
import decoPyramidImg from "../assets/welcomeImgs/decoPyramid.png";
import Eyeball from "../components/Eyeball/Eyeball";

// Must match the pyramid circle's CSS transition duration below — the
// logo's own light-up is scheduled to start right as the pyramid's finishes.
const PYRAMID_REVEAL_MS = 900;

// deco logo.png's actual artwork's top/bottom bounds within its own file
// (1536x1024), as fractions of the file's height — traced via pixel alpha
// bounds. Used only to time the wipe's vertical range to the visible
// lettering rather than the file's transparent padding above/below it; the
// wipe's horizontal extent and its exact silhouette both come from the
// image's own alpha channel instead (see #logo-art-alpha below), not a
// manually-traced left/right fraction.
const LOGO_ART_TOP_FRAC = 84 / 1024;
const LOGO_ART_BOTTOM_FRAC = 937 / 1024;

// The pyramid's actual drawn triangle corners, as [x%, y%] of the pyramid
// box's own width/height (traced from the artwork), not its rectangular
// bounding box. Single source for both the reveal circle's max-radius calc
// and the hit-region's clip-path below, so the two can't drift apart.
const PYRAMID_TRIANGLE_PCT = [
  [54.1, 1.4],
  [5.5, 93.7],
  [95.2, 89.2],
];
const PYRAMID_CLIP_PATH = `polygon(${PYRAMID_TRIANGLE_PCT.map(
  ([x, y]) => `${x}% ${y}%`,
).join(", ")})`;

export const Welcome = () => {
  const [isPyramidHovered, setIsPyramidHovered] = useState(false);
  const [isLogoRevealed, setIsLogoRevealed] = useState(false);
  const logoRevealTimeout = useRef(null);
  const pyramidRef = useRef(null);
  const logoRef = useRef(null);
  const [geo, setGeo] = useState({
    originX: 0,
    originY: 0,
    maxR: 0,
    logoImgX: 0,
    logoImgY: 0,
    logoImgW: 0,
    logoImgH: 0,
    logoArtTop: 0,
    logoArtBottom: 0,
  });

  // A single overlay (below) dims the whole page, including the logo. It's
  // masked by one SVG <mask> (in the hidden <svg> below) holding a white
  // "stay dimmed" base rect plus two black "hole" shapes painted on top —
  // a circle around the pyramid's own center, and a rect scoped to the
  // logo's own artwork box (not the whole page width, and not its full
  // image element including transparent padding) for its bottom-to-top
  // wipe. Ordinary SVG painting (not CSS mask-composite, which turned out
  // to have real cross-layer bugs in this browser for 2+ hole shapes)
  // combines them exactly as wanted: dimmed unless a point falls in EITHER
  // hole. Geometry recomputed on mount/resize; none of these boxes
  // otherwise move on their own, so no need to track every frame.
  useEffect(() => {
    function update() {
      const pyrEl = pyramidRef.current;
      const logoEl = logoRef.current;
      if (!pyrEl || !logoEl) return;

      // Use the pyramid's actual drawn triangle corners (PYRAMID_TRIANGLE_PCT
      // above), not its rectangular bounding box — the box's empty corners
      // sit well outside the triangle, which was making the "fully
      // revealed" circle spill past the pyramid.
      const pyrRect = pyrEl.getBoundingClientRect();
      const vertexPx = PYRAMID_TRIANGLE_PCT.map(([xPct, yPct]) => [
        pyrRect.left + (xPct / 100) * pyrRect.width,
        pyrRect.top + (yPct / 100) * pyrRect.height,
      ]);

      // The triangle's own centroid (not the eyeball's position, and not
      // the rectangular bounding box's center, which is skewed by the
      // artwork's asymmetric padding) — so the reveal circle grows evenly
      // around the pyramid and the pyramid ends up centered inside it.
      const originX = vertexPx.reduce((sum, [x]) => sum + x, 0) / 3;
      const originY = vertexPx.reduce((sum, [, y]) => sum + y, 0) / 3;

      // A small margin (10%) beyond the farthest vertex so the fully-
      // revealed circle clears the pyramid's edge with a bit of room
      // instead of ending exactly on it.
      const maxR =
        1.02 *
        Math.max(
          ...vertexPx.map(([x, y]) => Math.hypot(x - originX, y - originY)),
        );

      const logoRect = logoEl.getBoundingClientRect();

      setGeo({
        originX,
        originY,
        maxR,
        logoImgX: logoRect.left,
        logoImgY: logoRect.top,
        logoImgW: logoRect.width,
        logoImgH: logoRect.height,
        logoArtTop: logoRect.top + logoRect.height * LOGO_ART_TOP_FRAC,
        logoArtBottom: logoRect.top + logoRect.height * LOGO_ART_BOTTOM_FRAC,
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Sequencing: entering the pyramid starts its own reveal immediately; the
  // logo's bottom-to-top light-up is scheduled to start only once the
  // pyramid's reveal transition has finished. Leaving cancels any pending
  // logo reveal and dims both back down right away (not sequenced).
  useEffect(() => () => clearTimeout(logoRevealTimeout.current), []);

  function handlePyramidEnter() {
    setIsPyramidHovered(true);
    clearTimeout(logoRevealTimeout.current);
    logoRevealTimeout.current = setTimeout(() => {
      setIsLogoRevealed(true);
    }, PYRAMID_REVEAL_MS);
  }

  function handlePyramidLeave() {
    setIsPyramidHovered(false);
    clearTimeout(logoRevealTimeout.current);
    setIsLogoRevealed(false);
  }

  const logoWipeHeight = isLogoRevealed
    ? geo.logoArtBottom - geo.logoArtTop
    : 0;
  const logoWipeY = isLogoRevealed ? geo.logoArtTop : geo.logoArtBottom;

  return (
    <div className="relative h-screen max-h-screen overflow-hidden bg-[#111111] flex flex-col">
      <img
        ref={logoRef}
        src={decoLogoImg}
        alt="Deco!"
        className="relative z-20 shrink-0 mx-auto mt-4 md:mt-6 w-40 sm:w-52 md:w-72 lg:w-80"
      />

      <div className="relative z-20 flex-1 min-h-0 flex items-center justify-center">
        <div
          ref={pyramidRef}
          className="relative h-[42%] sm:h-[49%] md:h-[67%] -mt-12 sm:-mt-20 md:-mt-32"
          style={{
            aspectRatio: "1355 / 1161",
          }}
        >
          <img src={decoPyramidImg} alt="" className="w-full h-full block" />

          <div
            className="absolute"
            style={{
              left: "52.4%",
              top: "69%",
              width: "68%",
              aspectRatio: "1448 / 1086",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Eyeball lidFill="#e6a677" />
          </div>

          {/* Invisible hit-region shaped like the pyramid's actual triangle
              (traced from its drawn corners), not its rectangular bounding
              box, so the reveal only triggers once the cursor is really
              over the pyramid rather than its transparent corners. */}
          <div
            className="absolute inset-0"
            style={{ clipPath: PYRAMID_CLIP_PATH }}
            onMouseEnter={handlePyramidEnter}
            onMouseLeave={handlePyramidLeave}
          />
        </div>
      </div>

      {/* Holds the reveal mask's shapes; renders nothing itself. Its own
          width/height are 0 (just to stay out of layout), so the mask's
          x/y/width/height below are given as generous fixed numbers
          instead of "100%" — a percentage here would resolve against this
          0x0 host SVG and collapse the whole mask to nothing. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          {/* Alpha-only submask of the logo artwork itself: mask-type alpha
              (rather than the default luminance) means every drawn pixel —
              the white lettering AND its black outline/shadow — counts as
              "kept", not just the light-colored ones, so the hole below
              traces the actual silhouette rather than just the letterforms'
              fills. */}
          <mask id="logo-art-alpha" style={{ maskType: "alpha" }}>
            <image
              href={decoLogoImg}
              x={geo.logoImgX}
              y={geo.logoImgY}
              width={geo.logoImgW}
              height={geo.logoImgH}
            />
          </mask>

          {/* The growing bottom-to-top band that the silhouette hole below
              is clipped to, so only the currently-revealed slice of the
              artwork shows. */}
          <clipPath id="logo-wipe-clip">
            <rect
              className="logo-hole"
              x={geo.logoImgX}
              width={geo.logoImgW}
              y={logoWipeY}
              height={logoWipeHeight}
            />
          </clipPath>

          <mask
            id="reveal-mask"
            maskUnits="userSpaceOnUse"
            x="-10000"
            y="-10000"
            width="20000"
            height="20000"
          >
            <rect
              x="-10000"
              y="-10000"
              width="20000"
              height="20000"
              fill="white"
            />
            <circle
              className="pyramid-hole"
              cx={geo.originX}
              cy={geo.originY}
              r={isPyramidHovered ? geo.maxR : 0}
              fill="black"
            />
            {/* The logo's own alpha shape (not a rectangle) as the hole,
                clipped to the growing wipe band. */}
            <g clipPath="url(#logo-wipe-clip)">
              <rect
                x={geo.logoImgX}
                y={geo.logoImgY}
                width={geo.logoImgW}
                height={geo.logoImgH}
                fill="black"
                mask="url(#logo-art-alpha)"
              />
            </g>
          </mask>
        </defs>
      </svg>

      {/* The one general dim overlay — covers and dims the whole page, logo
          included, masked by #reveal-mask above. Hovering the pyramid
          grows a bright circle from the pyramid's own center outward, so
          the pyramid stays centered inside it, capped so it stops once it
          just covers the pyramid; once that finishes, just the logo's own
          silhouette (not a rectangle around it, not the full page width)
          lights up from the bottom edge upward. Leaving reverses both
          immediately. */}
      <div
        className="pointer-events-none fixed inset-0 z-30 bg-black/90"
        style={{
          maskImage: "url(#reveal-mask)",
          WebkitMaskImage: "url(#reveal-mask)",
        }}
      />
    </div>
  );
};
