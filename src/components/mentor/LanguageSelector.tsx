import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Language {
    code: string;
    name: string;
    native: string;
}

const languages: Language[] = [
    { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
    { code: "en-IN", name: "English (Indian)", native: "English" },
    { code: "bn-IN", name: "Bengali", native: "বাংলা" },
    { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
    { code: "te-IN", name: "Telugu", native: "తెలుగు" },
    { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
    { code: "mr-IN", name: "Marathi", native: "मराठी" },
    { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
    { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
    { code: "or-IN", name: "Odia", native: "Odia" },
];

interface LanguageSelectorProps {
    selectedCode: string;
    onSelect: (code: string) => void;
    className?: string;
}

export function LanguageSelector({ selectedCode, onSelect, className }: LanguageSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedLanguage = languages.find(l => l.code === selectedCode) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative z-[60]", className)} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-300",
                    "bg-card/40 backdrop-blur-md border border-border/40 hover:border-primary/50 shadow-sm",
                    isOpen ? "ring-2 ring-primary/20 border-primary/50" : ""
                )}
            >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                    <Globe className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-semibold text-foreground/90 uppercase tracking-wider">
                    {selectedLanguage.native}
                </span>
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-300", isOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-0 mb-3 w-56 p-2 rounded-2xl bg-card/95 backdrop-blur-2xl border border-primary/20 shadow-2xl shadow-primary/20 ring-1 ring-white/10"
                    >
                        <div className="grid gap-1 max-h-64 overflow-y-auto scrollbar-hide pr-1 custom-scrollbar">
                            {languages.map((lang) => {
                                const isActive = lang.code === selectedCode;
                                return (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            onSelect(lang.code);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "hover:bg-primary/10 text-foreground/70 hover:text-foreground border border-transparent hover:border-primary/20"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold leading-none">{lang.native}</span>
                                            <span className={cn("text-[8px] mt-1 opacity-70", isActive ? "text-primary-foreground/80" : "")}>
                                                {lang.name}
                                            </span>
                                        </div>
                                        {isActive && <Check className="w-3 h-3" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
