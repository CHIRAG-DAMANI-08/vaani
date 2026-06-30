"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Multilingual streaming",
    description: "Simultaneous stream in Hindi, Tamil, Telugu, and Marathi",
  },
  {
    title: "Natural-sounding voices",
    description: "Indian voices with 25+ voice options",
  },
  {
    title: "Zero OBS changes",
    description: "One button starts all language channels without modifying your setup",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-normal text-center mb-16 font-serif"
        >
          Reach every viewer in their language
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex md:flex-row flex-col gap-3 bg-card-bg p-4 md:p-6 rounded-[24px] md:rounded-[48px] w-full overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.05)] border border-card-border"
        >
          {/* Image Container */}
          <div className="relative rounded-2xl w-full md:w-[50%] h-[250px] md:h-[420px] overflow-hidden shrink-0">
            <img
              src="/home-section-2.webp"
              alt="Vaani AI Streaming"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex justify-center items-center mix-blend-overlay">
              <motion.img
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                src="/sarvam-logo-white.svg"
                alt=""
                className="mb-20 md:mb-32 w-20 md:w-24 h-auto opacity-100 mix-blend-screen"
                style={{ filter: "brightness(1.5)" }}
              />
            </div>
          </div>

          {/* Text Container */}
          <div className="flex flex-col flex-1 md:justify-center gap-6 md:gap-10 px-4 md:px-12 py-6 md:py-10">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <svg
                  className="mt-1 shrink-0"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g filter="url(#filter0_i_9981_1736)">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12.0035 0C13.927 1.92336 14.7378 4.55104 14.4269 7.06239C15.3696 6.39209 16.5224 5.99794 17.7672 5.99791H17.9981C17.998 7.2792 17.5948 8.4699 16.9085 9.4474C19.3436 9.12122 21.8977 9.89379 23.7691 11.7651L24 11.996C22.0413 13.9546 19.3522 14.7596 16.7993 14.4011C17.5521 15.4058 17.9984 16.6535 17.9983 18.0015C16.6523 18.0015 15.4063 17.5566 14.4024 16.8059C14.7587 19.3568 13.9535 22.0429 11.9964 23.9999C10.0408 22.0444 9.23528 19.3609 9.58954 16.8117C8.58701 17.5588 7.34402 18.0014 6.00159 18.0014V17.7706C6.00162 16.5237 6.39701 15.3691 7.06934 14.4255C4.55586 14.7387 1.92515 13.9283 0 12.0032L0.230859 11.7723C2.10358 9.89968 4.65997 9.12739 7.09662 9.45536C6.407 8.47643 6.00174 7.28284 6.00176 5.99816C7.3476 5.99814 8.5935 6.44286 9.59732 7.19339C9.24126 4.64272 10.0466 1.95683 12.0035 0ZM11.9994 11.9889C11.9969 11.9927 11.9934 11.9958 11.9891 11.9977C11.9893 11.999 11.9895 12.0004 11.9895 12.0018C11.9938 12.0037 11.9974 12.0069 11.9998 12.0109H12.0004C12.0029 12.007 12.0065 12.0038 12.0108 12.0019C12.0105 12.0005 12.0105 11.9991 12.0104 11.9977C12.0061 11.9958 12.0025 11.9927 12 11.9889H11.9994Z"
                      fill="url(#paint0_linear_9981_1736)"
                    ></path>
                  </g>
                  <defs>
                    <filter
                      id="filter0_i_9981_1736"
                      x="0"
                      y="0"
                      width="24"
                      height="25"
                      filterUnits="userSpaceOnUse"
                      colorInterpolationFilters="sRGB"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                      <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      ></feBlend>
                      <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                      ></feColorMatrix>
                      <feOffset dy="1"></feOffset>
                      <feGaussianBlur stdDeviation="2"></feGaussianBlur>
                      <feComposite
                        in2="hardAlpha"
                        operator="arithmetic"
                        k2="-1"
                        k3="1"
                      ></feComposite>
                      <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0.647059 0 0 0 0 0.733333 0 0 0 0 0.988235 0 0 0 1 0"
                      ></feColorMatrix>
                      <feBlend
                        mode="normal"
                        in2="shape"
                        result="effect1_innerShadow_9981_1736"
                      ></feBlend>
                    </filter>
                    <linearGradient
                      id="paint0_linear_9981_1736"
                      x1="12"
                      y1="23.9999"
                      x2="12"
                      y2="-3.67886"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="var(--feature-grad-top)"></stop>
                      <stop offset="0.33" stopColor="var(--feature-grad-mid1)"></stop>
                      <stop offset="0.66" stopColor="var(--feature-grad-mid2)"></stop>
                      <stop offset="1" stopColor="var(--feature-grad-end)"></stop>
                    </linearGradient>
                  </defs>
                </svg>

                <div className="flex flex-col gap-1.5 md:gap-3">
                  <h3 className="font-medium md:text-[22px] text-xl text-text-primary leading-normal tracking-[-0.22px]">
                    {feature.title}
                  </h3>
                  <p className="text-secondary text-base leading-normal tracking-[-0.16px]">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

