"use client";

export function Clayboan404SVG({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 850 420"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto select-none pointer-events-none ${className}`}
    >
      {/* 
        Stylized 404 Graphic extracted precisely from Clayboan:
        - First 4: Blackletter / Gothic architectural glyph
        - Middle 0: Modernist tall geometric ellipse
        - Second 4: Modernist grotesque slab 4
      */}

      {/* First 4: Gothic Stylized */}
      <g>
        {/* Upper diagonal stroke */}
        <polygon points="230,225 10,225 180,65 230,65" />
        {/* Horizontal crossbar */}
        <rect x="0" y="225" width="280" height="40" />
        {/* Vertical main stem with curved blackletter base */}
        <rect x="180" y="65" width="50" height="195" />
        <path d="M 180 260 C 180 320, 140 370, 95 385 C 135 380, 155 350, 155 315 L 155 260 Z" />
        <path d="M 230 225 L 230 280 C 230 335, 195 375, 145 390 C 210 380, 230 325, 230 280 Z" />
        <path d="M 145 340 C 120 350, 105 375, 125 395 C 105 385, 100 365, 120 350 Z" />
      </g>

      {/* Middle 0: Tall Modernist Oval */}
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 430 45 C 515 45, 570 115, 570 215 C 570 315, 515 385, 430 385 C 345 385, 290 315, 290 215 C 290 115, 345 45, 430 45 Z M 430 95 C 380 95, 348 145, 348 215 C 348 285, 380 335, 430 335 C 480 335, 512 285, 512 215 C 512 145, 480 95, 430 95 Z"
        />
      </g>

      {/* Second 4: Bold Grotesque Slab 4 */}
      <g>
        {/* Diagonal upper triangle cut */}
        <polygon points="690,75 580,240 690,240" />
        {/* Horizontal crossbar */}
        <rect x="580" y="240" width="270" height="42" />
        {/* Vertical main stem */}
        <rect x="690" y="75" width="55" height="300" />
      </g>
    </svg>
  );
}
