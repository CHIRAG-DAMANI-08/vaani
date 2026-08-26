"use client";

export function Clayboan404Graphic({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto select-none pointer-events-none ${className}`}
    >
      {/* First 4: Iconic Gothic / Blackletter Stylized 4 */}
      <g fill="currentColor">
        {/* Left diagonal chevron bar */}
        <path d="M245 220 L370 220 L370 265 L215 265 L365 75 L365 30 L320 30 Z" />
        
        {/* Main gothic vertical trunk with curved serif flourish */}
        <path d="M335 45 L370 45 L370 220 L335 220 Z" />
        <path d="M335 265 L370 265 L370 310 C370 350 340 375 295 385 C330 380 345 355 345 330 L345 265 Z" />
        <path d="M335 345 C305 355 290 385 315 410 C290 395 285 370 310 355 Z" />
      </g>

      {/* Middle 0: Bold Geometric Tall Oval */}
      <g fill="currentColor">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M525 105 C595 105 640 160 640 240 C640 320 595 375 525 375 C455 375 410 320 410 240 C410 160 455 105 525 105 Z M525 145 C478 145 448 185 448 240 C448 295 478 335 525 335 C572 335 602 295 602 240 C602 185 572 145 525 145 Z"
        />
      </g>

      {/* Second 4: Bold Modernist Geometric Slab 4 */}
      <g fill="currentColor">
        <path d="M625 225 L735 225 L735 125 L625 225 Z" />
        <path d="M625 225 L735 225 L735 270 L600 270 L735 125 L780 125 L780 225 L830 225 L830 270 L780 270 L780 365 L735 365 L735 270 Z" />
      </g>
    </svg>
  );
}
