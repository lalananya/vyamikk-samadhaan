import React, { useEffect, useRef } from "react";

export type IntroLogoWebProps = {
  autoplay?: boolean;
  durationMs?: number;
  reducedMotion?: boolean;
  onDone?: () => void;
  size?: number | string;
};

const brand = {
  platinumStops: [
    "#ffffff",
    "#f1f3f4",
    "#e8eaed",
    "#dadce0",
    "#bdc1c6",
    "#9aa0a6",
  ],
  completionStops: ["#ffffff", "#f0f8f0", "#e8f5e8", "#c8e6c9"],
  networkStops: ["#e0e0e0", "#f5f5f5", "#ffffff", "#e8f5e8"],
};

export default function IntroLogoWeb({
  autoplay = true,
  durationMs = 3000,
  reducedMotion,
  onDone,
  size = 280,
}: IntroLogoWebProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReducedMotion, setIsReducedMotion] = React.useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (reducedMotion !== undefined) {
      setIsReducedMotion(reducedMotion);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [reducedMotion]);

  useEffect(() => {
    if (!autoplay) return;

    const timer = setTimeout(() => {
      onDone?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [autoplay, durationMs, onDone]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        position: "relative",
        filter: "drop-shadow(0 0 25px rgba(192,192,192,.4))",
      }}
    >
      <style>
        {`
          .convergence-group { 
            animation: ${isReducedMotion ? "none" : "converge 6s ease-in-out infinite"}; 
            transform-origin: 200px 200px; 
          }
          .convergence-group:nth-child(2){ animation-delay:1.5s }
          .convergence-group:nth-child(3){ animation-delay:3s }
          .orbital-ring { 
            animation: ${isReducedMotion ? "none" : "rotate 30s linear infinite"}; 
            transform-origin: 200px 200px; 
          }
          .orbital-ring:nth-child(2){ animation: ${isReducedMotion ? "none" : "rotate 22s linear infinite reverse"}; }
          .orbital-ring:nth-child(3){ animation: ${isReducedMotion ? "none" : "rotate 35s linear infinite"}; }
          .completion-ring { 
            animation: ${isReducedMotion ? "none" : "completionExpand 4s ease-out infinite"}; 
            transform-origin: 200px 200px; 
          }
          .completion-ring:nth-child(2){ animation-delay:1s }
          .completion-ring:nth-child(3){ animation-delay:2s }
          .network-node { 
            animation: ${isReducedMotion ? "none" : "networkPulse 3s ease-in-out infinite"}; 
          }
          .network-node:nth-child(2n){ animation-delay:.8s }
          .network-node:nth-child(3n){ animation-delay:1.6s }
          .success-indicator { 
            animation: ${isReducedMotion ? "none" : "successGlow 2.5s ease-in-out infinite"}; 
          }
          @keyframes rotate { from{transform:rotate(0)} to{transform:rotate(360deg)} }
          @keyframes converge { 0%{ transform:scale(1.2) rotate(0); opacity:.4 } 50%{transform:scale(.8) rotate(180); opacity:1 } 100%{transform:scale(1.2) rotate(360); opacity:.4 } }
          @keyframes completionExpand { 0%{ transform:scale(.5); opacity:1 } 70%{transform:scale(1.1); opacity:.8 } 100%{transform:scale(1.5); opacity:0 } }
          @keyframes networkPulse { 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:1; transform:scale(1.3)} }
          @keyframes successGlow { 0%,100%{opacity:.6; filter:brightness(1)} 50%{opacity:1; filter:brightness(1.8)} }
        `}
      </style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ background: "transparent" }}
      >
        <defs>
          <linearGradient id="premiumMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            {brand.platinumStops.map((color, index) => (
              <stop
                key={index}
                offset={`${index * 20}%`}
                style={{ stopColor: color }}
              />
            ))}
          </linearGradient>
          <radialGradient id="platinumNode" cx="30%" cy="30%" r="70%">
            <stop offset="0%" style={{ stopColor: "#fff" }} />
            <stop offset="40%" style={{ stopColor: "#f8f9fa" }} />
            <stop offset="70%" style={{ stopColor: "#e3e3e3" }} />
            <stop offset="100%" style={{ stopColor: "#c0c0c0" }} />
          </radialGradient>
          <radialGradient id="completionGradient" cx="50%" cy="30%" r="80%">
            {brand.completionStops.map((color, index) => (
              <stop
                key={index}
                offset={`${index * 33.33}%`}
                style={{ stopColor: color }}
              />
            ))}
          </radialGradient>
          <linearGradient
            id="networkGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            {brand.networkStops.map((color, index) => (
              <stop
                key={index}
                offset={`${index * 33.33}%`}
                style={{
                  stopColor: color,
                  stopOpacity: index === 0 ? 0.3 : index === 3 ? 0.6 : 1,
                }}
              />
            ))}
          </linearGradient>
          <linearGradient
            id="convergenceGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              style={{ stopColor: "#d0d0d0", stopOpacity: 0.4 }}
            />
            <stop
              offset="50%"
              style={{ stopColor: "#ffffff", stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#e0f2e0", stopOpacity: 0.8 }}
            />
          </linearGradient>
          <filter id="premiumGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="completionGlow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="completion-rings">
          <circle
            className="completion-ring"
            cx="200"
            cy="200"
            r="60"
            fill="none"
            stroke="url(#completionGradient)"
            strokeWidth="2"
            opacity="0.7"
          />
          <circle
            className="completion-ring"
            cx="200"
            cy="200"
            r="80"
            fill="none"
            stroke="url(#completionGradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <circle
            className="completion-ring"
            cx="200"
            cy="200"
            r="100"
            fill="none"
            stroke="url(#completionGradient)"
            strokeWidth="1"
            opacity="0.3"
          />
        </g>

        <g className="convergence-group">
          <path
            d="M 50 100 Q 150 150 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="2"
            opacity="0.6"
          />
          <path
            d="M 350 100 Q 250 150 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="2"
            opacity="0.6"
          />
          <path
            d="M 50 300 Q 150 250 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="2"
            opacity="0.6"
          />
          <path
            d="M 350 300 Q 250 250 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="2"
            opacity="0.6"
          />
        </g>

        <g className="convergence-group">
          <path
            d="M 100 50 Q 150 125 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <path
            d="M 300 50 Q 250 125 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <path
            d="M 100 350 Q 150 275 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <path
            d="M 300 350 Q 250 275 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
        </g>

        <g className="convergence-group">
          <path
            d="M 150 80 Q 175 140 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1"
            opacity="0.4"
          />
          <path
            d="M 250 80 Q 225 140 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1"
            opacity="0.4"
          />
          <path
            d="M 150 320 Q 175 260 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1"
            opacity="0.4"
          />
          <path
            d="M 250 320 Q 225 260 200 200"
            fill="none"
            stroke="url(#convergenceGradient)"
            strokeWidth="1"
            opacity="0.4"
          />
        </g>

        <g className="orbital-ring">
          <ellipse
            cx="200"
            cy="200"
            rx="170"
            ry="85"
            fill="none"
            stroke="url(#networkGradient)"
            strokeWidth="1"
            opacity="0.6"
          />
          <circle
            className="network-node"
            cx="370"
            cy="200"
            r="3.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="315"
            cy="145"
            r="2.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="275"
            cy="125"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="125"
            cy="125"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="85"
            cy="145"
            r="2.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="30"
            cy="200"
            r="3.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="85"
            cy="255"
            r="2.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="125"
            cy="275"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="275"
            cy="275"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="315"
            cy="255"
            r="2.5"
            fill="url(#platinumNode)"
          />
        </g>

        <g className="orbital-ring">
          <ellipse
            cx="200"
            cy="200"
            rx="130"
            ry="65"
            fill="none"
            stroke="url(#networkGradient)"
            strokeWidth="1"
            opacity="0.7"
          />
          <circle
            className="network-node"
            cx="330"
            cy="200"
            r="3"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="285"
            cy="160"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="245"
            cy="145"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="155"
            cy="145"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="115"
            cy="160"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="70"
            cy="200"
            r="3"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="115"
            cy="240"
            r="2"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="155"
            cy="255"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="245"
            cy="255"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="285"
            cy="240"
            r="2"
            fill="url(#platinumNode)"
          />
        </g>

        <g className="orbital-ring">
          <ellipse
            cx="200"
            cy="200"
            rx="90"
            ry="45"
            fill="none"
            stroke="url(#networkGradient)"
            strokeWidth="1"
            opacity="0.8"
          />
          <circle
            className="network-node"
            cx="290"
            cy="200"
            r="2.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="265"
            cy="180"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="225"
            cy="165"
            r="1"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="175"
            cy="165"
            r="1"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="135"
            cy="180"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="110"
            cy="200"
            r="2.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="135"
            cy="220"
            r="1.5"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="175"
            cy="235"
            r="1"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="225"
            cy="235"
            r="1"
            fill="url(#platinumNode)"
          />
          <circle
            className="network-node"
            cx="265"
            cy="220"
            r="1.5"
            fill="url(#platinumNode)"
          />
        </g>

        <g filter="url(#premiumGlow)">
          <path
            d="M 165 320 L 200 125 L 208 125 L 178 320 Z"
            fill="url(#premiumMetal)"
            stroke="#fff"
            strokeWidth="0.5"
            opacity="0.96"
          />
          <path
            d="M 192 125 L 200 125 L 235 320 L 222 320 Z"
            fill="url(#premiumMetal)"
            stroke="#fff"
            strokeWidth="0.5"
            opacity="0.96"
          />
          <path
            d="M 178 215 L 222 215 L 219 230 L 181 230 Z"
            fill="url(#premiumMetal)"
            stroke="#fff"
            strokeWidth="0.5"
            opacity="0.96"
          />
        </g>

        <g className="success-indicators">
          <circle
            className="success-indicator"
            cx="200"
            cy="222"
            r="5"
            fill="url(#completionGradient)"
            opacity="0.9"
            filter="url(#completionGlow)"
          />
          <circle
            className="success-indicator"
            cx="185"
            cy="222"
            r="2.5"
            fill="url(#completionGradient)"
            opacity="0.7"
          />
          <circle
            className="success-indicator"
            cx="215"
            cy="222"
            r="2.5"
            fill="url(#completionGradient)"
            opacity="0.7"
          />
          <rect
            className="success-indicator"
            x="178"
            y="215"
            width="44"
            height="15"
            fill="url(#completionGradient)"
            opacity="0.4"
            filter="url(#completionGlow)"
          />
        </g>
      </svg>
    </div>
  );
}
