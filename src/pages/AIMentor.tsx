import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Bot, Copy, Check, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedButton } from "@/components/ui/animated-button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import LiquidEther from "@/components/LiquidEther/LiquidEther";
import { ChatHistorySidebar } from "@/components/mentor/ChatHistorySidebar";
import { useMentorChats } from "@/hooks/useMentorChats";
import { LightPillar } from "@/components/ui/light-pillar";

// ── Copy button for code blocks ──────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Animated typing indicator ────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

const suggestedPrompts = [
  "What skills should I learn next?",
  "How can I prepare for a tech lead interview?",
  "What's the best career path for a frontend developer?",
  "Review my career progression plan",
];

// ── Main page ────────────────────────────────────────────────────────────────
export default function AIMentor() {
  const { user } = useAuth();
  const displayName = user?.displayName || "User";
  const firstName = displayName.split(" ")[0];

  const {
    sessions,
    sessionsLoading,
    activeSessionId,
    messages,
    isLoading,
    startNewChat,
    loadSession,
    deleteSession,
    sendMessage,
  } = useMentorChats();

  const [input, setInput] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-5rem)] flex flex-col gap-4 p-6 overflow-hidden relative">
        {/* Page Background Light Pillar */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center">
          <div className="w-[800px] h-full">
            <LightPillar
              topColor="#5227FF"
              bottomColor="#FF9FFC"
              intensity={1}
              rotationSpeed={0.3}
              glowAmount={0.002}
              pillarWidth={3.5}
              pillarHeight={1}
              noiseIntensity={0.5}
              pillarRotation={25}
              interactive={false}
              mixBlendMode="screen"
              quality="high"
            />
          </div>
        </div>

        <div className="relative z-10 h-full flex flex-col gap-4">

          {/* Header */}
          <motion.div
            className="flex items-center justify-between flex-shrink-0"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-2xl font-display font-bold">
                <GradientText>AI Career Mentor</GradientText>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Powered by Gemini AI · Your personal career advisor
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="lg:hidden flex items-center gap-2 p-2"
              >
                <div className="w-5 h-5 flex flex-col justify-center gap-1">
                  <span className="w-full h-0.5 bg-current rounded-full" />
                  <span className="w-full h-0.5 bg-current rounded-full" />
                  <span className="w-full h-0.5 bg-current rounded-full" />
                </div>
              </AnimatedButton>
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={startNewChat}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </AnimatedButton>
            </div>
          </motion.div>

          {/* Main body: sidebar + chat */}
          <div className="flex flex-1 gap-3 min-h-0">

            {/* ── Chat History Sidebar ─────────────────────────── */}
            <div className="hidden lg:block h-full">
              <ChatHistorySidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                loading={sessionsLoading}
                onNewChat={startNewChat}
                onLoadSession={loadSession}
                onDeleteSession={deleteSession}
              />
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {isHistoryOpen && (
                <div className="lg:hidden fixed inset-0 z-[100] flex justify-end">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    onClick={() => setIsHistoryOpen(false)}
                  />
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-[280px] h-full shadow-2xl"
                  >
                    <ChatHistorySidebar
                      sessions={sessions}
                      activeSessionId={activeSessionId}
                      loading={sessionsLoading}
                      onNewChat={() => { startNewChat(); setIsHistoryOpen(false); }}
                      onLoadSession={(id) => { loadSession(id); setIsHistoryOpen(false); }}
                      onDeleteSession={deleteSession}
                      isMobile
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* ── Chat area ────────────────────────────────────── */}
            <div className="relative flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-md">

              {/* chat background — z-0 */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-40 dark:opacity-30">
                  <LiquidEther
                    colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
                    mouseForce={20}
                    cursorSize={100}
                    isViscous
                    viscous={30}
                    iterationsViscous={32}
                    iterationsPoisson={32}
                    resolution={0.5}
                    isBounce={false}
                    autoDemo
                    autoSpeed={0.5}
                    autoIntensity={2.2}
                    takeoverDuration={0.25}
                    autoResumeDelay={3000}
                    autoRampDuration={0.6}
                  />
                </div>
              </div>

              {/* Username watermark — hidden on mobile */}
              <div className="absolute inset-0 z-[1] hidden md:flex items-center justify-center pointer-events-none overflow-hidden">
                <motion.span
                  className="text-[8rem] md:text-[12rem] font-display font-black text-foreground/[0.025] select-none whitespace-nowrap leading-none"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.5 }}
                >
                  {firstName}
                </motion.span>
              </div>

              {/* Messages — z-10 */}
              <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 15, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ type: "spring", damping: 20, stiffness: 200 }}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      {/* Avatar */}
                      <motion.div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg",
                          message.role === "user"
                            ? "bg-gradient-to-br from-primary to-accent-foreground"
                            : "bg-gradient-to-br from-violet-600 to-purple-500"
                        )}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </motion.div>

                      {/* Bubble */}
                      <div
                        className={cn(
                          "max-w-[85%] md:max-w-[80%] rounded-2xl relative group",
                          message.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 md:px-5 py-2.5 md:py-3 shadow-lg shadow-primary/20"
                            : "bg-card/80 backdrop-blur-sm border border-border/50 px-4 md:px-6 py-4 md:py-5 shadow-lg"
                        )}
                      >
                        {/* Label */}
                        <p className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider mb-1.5",
                          message.role === "user"
                            ? "text-primary-foreground/60"
                            : "text-primary/70"
                        )}>
                          {message.role === "user" ? firstName : "Mentor AI"}
                        </p>

                        {/* Content */}
                        {message.role === "assistant" ? (
                          <div className="text-sm text-foreground/90 leading-relaxed">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="text-xl font-bold text-foreground mt-6 mb-3 pb-1.5 border-b border-border/40 first:mt-0">{children}</h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-lg font-semibold text-foreground mt-5 mb-2.5 first:mt-0">{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-base font-semibold text-primary/90 mt-4 mb-2 first:mt-0">{children}</h3>
                                ),
                                p: ({ children }) => (
                                  <p className="text-sm leading-7 text-foreground/85 mb-4 last:mb-0">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="my-3 space-y-2 pl-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="my-3 space-y-2 pl-1 list-none">{children}</ol>
                                ),
                                li: ({ children, ...props }: any) => (
                                  <li className="flex gap-3 items-start text-sm leading-6 text-foreground/85">
                                    {props.ordered ? (
                                      <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                                        {(props.index ?? 0) + 1}
                                      </span>
                                    ) : (
                                      <span className="flex-shrink-0 mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-primary/60" />
                                    )}
                                    <span className="flex-1">{children}</span>
                                  </li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-foreground">{children}</strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic text-foreground/75">{children}</em>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="my-4 pl-4 py-3 border-l-2 border-primary/50 bg-primary/5 rounded-r-xl text-foreground/75 italic text-sm">
                                    {children}
                                  </blockquote>
                                ),
                                hr: () => <div className="my-5 border-t border-border/30" />,
                                code: ({ className, children, ...props }) => {
                                  const isInline = !className;
                                  if (isInline) {
                                    return (
                                      <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                  return <code className={cn("text-sm", className)} {...props}>{children}</code>;
                                },
                                pre: ({ children, ...props }) => {
                                  const text = (children as any)?.props?.children ?? "";
                                  return (
                                    <div className="relative group my-4">
                                      <CopyButton text={String(text)} />
                                      <pre {...props} className="!bg-[#1a1b26] !text-sm !p-5 !rounded-2xl overflow-x-auto border border-white/10">
                                        {children}
                                      </pre>
                                    </div>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-line text-sm leading-relaxed">
                            {message.content}
                          </p>
                        )}

                        {/* Timestamp */}
                        <p className={cn(
                          "text-[10px] mt-2 opacity-50",
                          message.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground"
                        )}>
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator — show when streaming placeholder has empty content */}
                {isLoading && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-4 shadow-lg">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-primary/70">
                        Mentor AI
                      </p>
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested prompts — only in fresh chat (single greeting, not loading a session) */}
              {messages.length === 1 && messages[0]?.id === "greeting" && !isLoading && (
                <motion.div
                  className="relative z-10 px-6 pb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs text-muted-foreground mb-2.5 font-medium">
                    ✨ Quick suggestions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <motion.button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + i * 0.07 }}
                        className="px-4 py-2 rounded-xl bg-card/60 backdrop-blur border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Input area — z-10 */}
              <div className="relative z-10 px-4 pb-4 pt-2 border-t border-border/30">
                <div className="flex gap-3 items-end bg-card/70 backdrop-blur border border-border/60 rounded-2xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-lg">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your career..."
                    rows={1}
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 leading-relaxed max-h-40 overflow-y-auto scrollbar-hide"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-lg shadow-primary/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
