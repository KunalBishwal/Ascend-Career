import React, { Suspense, useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ArrowRight, Play, Sparkles, Zap, Target, Loader2 } from "lucide-react";
import { AnimatedButton } from "@/components/ui/animated-button";
import { GradientText } from "@/components/ui/gradient-text";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

// Lazy load 3D component
const ResumeVisual = React.lazy(() => import("@/components/3d/ResumeVisual").then(m => ({ default: m.ResumeVisual })));
import GridDistortion from "@/components/ui/grid-distortion";

const stats = [
  { value: 50000, suffix: "+", label: "Career Paths Generated" },
  { value: 98, suffix: "%", label: "User Satisfaction" },
  { value: 10000, suffix: "+", label: "Jobs Matched" },
];

const floatingIcons = [
  { Icon: Sparkles, delay: 0, x: "10%", y: "20%" },
  { Icon: Zap, delay: 0.5, x: "85%", y: "15%" },
  { Icon: Target, delay: 1, x: "75%", y: "70%" },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [show3D, setShow3D] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    // Delay 3D loading for performance
    const timer = setTimeout(() => setShow3D(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (titleRef.current) {
      const words = titleRef.current.querySelectorAll(".word");
      gsap.fromTo(
        words,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
    }
  }, []);


  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: bgY }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background z-10" />
        <div className="absolute inset-0 z-0 opacity-100 dark:opacity-80">
          <GridDistortion
            imageSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
            grid={24}
            mouse={0.2}
            strength={0.15}
            relaxation={0.9}
            className="w-full h-full"
          />
        </div>
      </motion.div>

      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl"
          style={{ left: "-10%", top: "20%" }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-accent-foreground/20 blur-3xl"
          style={{ right: "-10%", top: "10%" }}
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Blue gradient orbs */}
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full bg-[hsl(217,91%,60%)]/15 blur-3xl"
          style={{ left: "30%", bottom: "10%" }}
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[350px] h-[350px] rounded-full bg-[hsl(200,90%,50%)]/20 blur-3xl"
          style={{ right: "20%", bottom: "30%" }}
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* 3D Resume Visual - Hidden on mobile for performance */}
      {show3D && (
        <div className="absolute right-0 top-1/4 w-[500px] h-[500px] hidden xl:block pointer-events-none">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
          }>
            <ResumeVisual className="w-full h-full" />
          </Suspense>
        </div>
      )}

      {/* Floating Icons */}
      {floatingIcons.map(({ Icon, delay, x, y }, index) => (
        <motion.div
          key={index}
          className="absolute hidden lg:flex items-center justify-center w-12 h-12 rounded-xl glass"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon className="w-6 h-6 text-primary" />
          </motion.div>
        </motion.div>
      ))}

      {/* Content */}
      <motion.div
        className="container mx-auto px-4 relative z-10"
        style={{ opacity }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Career Intelligence</span>
          </motion.div>

          {/* Title */}
          <h1
            ref={titleRef}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6 text-white"
          >
            <span className="word inline-block">Your</span>{" "}
            <span className="word inline-block">
              <GradientText>AI Career</GradientText>
            </span>{" "}
            <span className="word inline-block">
              <GradientText>Companion</GradientText>
            </span>
            <br />
            <span className="word inline-block">For</span>{" "}
            <span className="word inline-block">The</span>{" "}
            <span className="word inline-block">Future</span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Discover personalized career paths, AI-matched jobs, and adaptive learning
            roadmaps tailored to your unique skills and ambitions.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/dashboard">
              <AnimatedButton variant="hero" size="xl">
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </AnimatedButton>
            </Link>
            <AnimatedButton variant="glass" size="xl">
              <Play className="w-5 h-5" />
              Watch Demo
            </AnimatedButton>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {stats.map((stat, index) => (
              <GlassCard key={index} hover={false} className="py-6">
                <div className="text-3xl sm:text-4xl font-display font-bold gradient-text-hero">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    duration={2}
                  />
                </div>
                <p className="text-muted-foreground mt-2">{stat.label}</p>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
