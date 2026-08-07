"use client";

import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { ContentPageShell } from "@/app/components/ContentPageShell";
import { sendContact } from "@/app/actions/send-contact";
import { CONTACT_EMAIL } from "@/lib/legal/constants";
import { fadeUp } from "@/lib/motion";

const inputClass =
  "w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm text-foreground focus:outline-none focus:border-white/40 transition-colors placeholder:text-foreground/40 disabled:opacity-50";
const labelClass = "text-xs font-semibold text-foreground/70 pl-2";

export default function ContactPage() {
  const [state, formAction, pending] = useActionState(sendContact, null);

  return (
    <ContentPageShell>
      <div className="mx-auto max-w-xl">
        <motion.header {...fadeUp(0)} className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
          <h1 className="mb-6 font-serif text-4xl md:text-5xl text-foreground">Get in touch</h1>
          <p className="leading-relaxed text-muted-foreground">
            Questions about Vaani, your account, or your data? Send us a message and we&apos;ll get
            back to you within 2 business days.
          </p>
        </motion.header>

        <motion.form
          {...fadeUp(0.05)}
          action={formAction}
          className="liquid-glass rounded-3xl p-8 md:p-10"
          data-testid="contact-form"
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={labelClass}>
                Your name <span className="font-normal text-foreground/40">(Optional)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="given-name"
                placeholder="Your name"
                disabled={pending}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
                Email address <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={pending}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="topic" className={labelClass}>
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                id="topic"
                name="topic"
                type="text"
                required
                placeholder="e.g. Support, Privacy request, DMCA"
                disabled={pending}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className={labelClass}>
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                rows={5}
                placeholder="How can we help?"
                disabled={pending}
                className={`${inputClass} resize-none`}
              />
            </div>

            <AnimatePresence>
              {state && state.state === "success" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-400"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <p>{state.message}</p>
                </motion.div>
              )}
              {state && (state.state === "validation_error" || state.state === "server_error") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{state.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center rounded-full bg-foreground px-6 py-4 text-base font-medium text-background transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {pending ? <Loader2 size={20} className="animate-spin" /> : "Send message"}
            </button>
          </div>
        </motion.form>

        <motion.div {...fadeUp(0.1)} className="mt-8 flex flex-col items-center gap-2 text-center">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            <Mail size={16} /> {CONTACT_EMAIL}
          </a>
          <p className="text-xs text-muted-foreground/70">
            For privacy or copyright requests, see our Privacy Policy and Terms of Service.
          </p>
        </motion.div>
      </div>
    </ContentPageShell>
  );
}
