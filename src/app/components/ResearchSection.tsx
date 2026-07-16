"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { articles } from "./landing-content";

export const ResearchSection = () => {
  return (
    <section id="resources" className="py-20 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-normal text-center mb-16"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Built in India, for Indian creators
          </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <motion.div
              key={article.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={article.href}
                className="group block rounded-3xl bg-white border border-card-border overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                {/* Text Content */}
                <div className="p-6 pb-4">
                  <span className="text-xs font-semibold tracking-wider text-[#F5821F] uppercase">
                    {article.tag}
                  </span>
                  <h3
                    className="text-lg font-semibold mt-2 mb-1 text-[#1A1A1F]"
                    style={{ fontFamily: "var(--font-syne)" }}
                  >
                    {article.title}
                  </h3>
                  <p className="text-sm text-[#5A5854]">{article.date}</p>
                </div>

                {/* Gradient Cover Image */}
                <div
                  className="mx-4 mb-4 h-48 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: article.gradient }}
                >
                  {/* Decorative cloud shapes */}
                  <svg
                    viewBox="0 0 300 200"
                    className="absolute inset-0 w-full h-full opacity-30"
                    fill="none"
                  >
                    <ellipse
                      cx="150"
                      cy="160"
                      rx="120"
                      ry="40"
                      fill="rgba(255,255,255,0.2)"
                    />
                    <ellipse
                      cx="100"
                      cy="130"
                      rx="60"
                      ry="50"
                      fill="rgba(255,255,255,0.15)"
                    />
                    <ellipse
                      cx="200"
                      cy="130"
                      rx="70"
                      ry="55"
                      fill="rgba(255,255,255,0.15)"
                    />
                    <ellipse
                      cx="150"
                      cy="110"
                      rx="80"
                      ry="45"
                      fill="rgba(255,255,255,0.1)"
                    />
                  </svg>
                  <span
                    className="relative z-10 text-2xl md:text-3xl font-bold text-white text-center whitespace-pre-line leading-tight drop-shadow-md"
                    style={{ fontFamily: "var(--font-syne)" }}
                  >
                    {article.label}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mt-12"
        >
          <Link
            href="#"
            className="inline-flex items-center px-7 py-3 text-sm font-medium text-[#1A1A1F] bg-white border border-card-border rounded-full hover:bg-gray-50 transition-colors"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            See all models used
          </Link>
        </motion.div>
      </div>
    </section>
  );
};