import { useEffect, useRef, useState } from "react";
import decoLogoImg from "../assets/welcomeImgs/deco logo.png";
import decoPyramidImg from "../assets/welcomeImgs/decoPyramid.png";
import Eyeball from "../components/Eyeball/Eyeball";
import TextType from "../components/TextType/TextType";

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

      // A small margin (2%) beyond the farthest vertex so the fully-
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
    // Vite's production build emits the app's <script type="module"> BEFORE
    // its <link rel="stylesheet"> in index.html (dev mode injects CSS via
    // JS instead, so this only shows up in the built/deployed app). A
    // module script isn't guaranteed to wait for a stylesheet that comes
    // AFTER it in the document, so on a slow/cold load this effect can run
    // — and measure the pyramid's box — before Tailwind's CSS has actually
    // applied, producing an oversized circle that then never re-measures.
    // Re-running once on the `load` event (which does wait for every
    // subresource, styles included) catches and corrects that; it's the
    // same fix as manually resizing the window, which is why that "fixed"
    // it by hand.
    window.addEventListener("load", update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("load", update);
      window.removeEventListener("resize", update);
    };
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

      {/* Sits above the dim overlay (z-40 > the overlay's z-30) so it stays
          fully readable regardless of hover state, rather than getting
          dimmed along with everything outside the reveal circle. Absolute
          + pinned to the root's own bottom edge instead of a flex child, so
          it doesn't compete with the pyramid for the centered flex-1
          space. font-grobold reuses the logo's own self-hosted face — this
          is otherwise unused elsewhere since "Deco!" is a drawn PNG, not
          live text. */}
      <div className="absolute z-40 inset-x-0 bottom-4 md:bottom-6 text-center">
        <TextType
          text={["Coming soon...", "Stay tuned..."]}
          as="p"
          typingSpeed={75}
          pauseDuration={1400}
          deletingSpeed={40}
          loop={true}
          showCursor={true}
          cursorCharacter="|"
          className="font-grobold uppercase tracking-[0.18em] text-lg sm:text-xl md:text-2xl text-white/70"
          cursorClassName="text-white/70"
        />
      </div>

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

      {/* The one general dim overlay — covers and dims the whole page, logo
          included, masked by #reveal-mask below. Hovering the pyramid
          grows a bright circle from the pyramid's own center outward, so
          the pyramid stays centered inside it, capped so it stops once it
          just covers the pyramid; once that finishes, just the logo's own
          silhouette (not a rectangle around it, not the full page width)
          lights up from the bottom edge upward. Leaving reverses both
          immediately.

          Rendered as a real SVG <rect> using SVG's own `mask` attribute
          (not CSS `mask-image` on an HTML div — Safari has long been
          unreliable resolving a `userSpaceOnUse` SVG mask against an
          ordinary HTML box), and the mask's <defs> live in this SAME <svg>
          root as the <rect> that references them — Safari also has a
          history of failing to resolve url(#id) SVG-resource references
          (masks, filters, clipPaths) across two separate <svg> roots, even
          same-document. Keeping everything in one root sidesteps that too.
          No viewBox is set, so 1 user unit = 1 CSS px here, matching the
          getBoundingClientRect pixel values these shapes are built from. */}
      <svg
        className="pointer-events-none fixed inset-0 z-30"
        width="100%"
        height="100%"
        aria-hidden
      >
        <defs>
          {/* Forces every drawn pixel of the logo to solid white while
              leaving its alpha channel untouched (feColorMatrix's last
              column is the constant added to each channel, so R/G/B are
              pinned to 1 regardless of input; alpha passes through as-is).
              We rely on this instead of `mask-type: alpha` on the <mask>
              below — that property has spotty support outside Chromium
              (Firefox/Safari have a history of silently ignoring it and
              falling back to luminance mode) — because a plain luminance
              mask fed solid-white content naturally reduces to "kept
              wherever the source had any alpha", which is exactly the
              alpha-only behavior we want, via a filter primitive that's
              supported everywhere. Without this, the logo's black
              outline/shadow (near-zero luminance) would drop out of the
              mask and only its lighter fill would show. */}
          <filter id="logo-art-whiten" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 1 0"
            />
          </filter>
          <mask id="logo-art-alpha">
            <image
              href={decoLogoImg}
              x={geo.logoImgX}
              y={geo.logoImgY}
              width={geo.logoImgW}
              height={geo.logoImgH}
              filter="url(#logo-art-whiten)"
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

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="black"
          fillOpacity="0.9"
          mask="url(#reveal-mask)"
        />
      </svg>
    </div>
  );
};
