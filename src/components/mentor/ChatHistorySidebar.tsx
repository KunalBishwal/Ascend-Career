import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Clock,
    X,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/integrations/firebase/firestore";

interface Props {
    sessions: ChatSession[];
    activeSessionId: string | null;
    loading: boolean;
    onNewChat: () => void;
    onLoadSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    isMobile?: boolean;
}

/* ── Date grouping helper ─────────────────────────────────────────────────── */
function groupByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const week = new Date(today.getTime() - 7 * 86_400_000);

    const groups: Record<string, ChatSession[]> = {
        Today: [],
        Yesterday: [],
        "Last 7 days": [],
        Older: [],
    };

    for (const s of sessions) {
        const d = new Date(s.updatedAt.getFullYear(), s.updatedAt.getMonth(), s.updatedAt.getDate());
        if (d >= today) groups["Today"].push(s);
        else if (d >= yesterday) groups["Yesterday"].push(s);
        else if (d >= week) groups["Last 7 days"].push(s);
        else groups["Older"].push(s);
    }
    return groups;
}

/* ── Delete confirmation modal ────────────────────────────────────────────── */
function DeleteModal({
    title,
    onConfirm,
    onCancel,
}: {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

            {/* Dialog */}
            <motion.div
                className="relative z-10 w-[380px] max-w-[90vw] bg-card border border-border rounded-2xl shadow-2xl p-6"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
                {/* Close */}
                <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                </div>

                {/* Text */}
                <h3 className="text-lg font-semibold text-foreground text-center mb-1">Delete Chat?</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-foreground">"{title}"</span>?
                    <br />
                    This action cannot be undone.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-accent transition-all"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-500/25"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function ChatHistorySidebar({
    sessions,
    activeSessionId,
    loading,
    onNewChat,
    onLoadSession,
    onDeleteSession,
    isMobile = false,
}: Props) {
    const [collapsed, setCollapsed] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);

    const grouped = groupByDate(sessions);

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            onDeleteSession(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    return (
        <>
            {/* Delete confirmation modal — rendered outside sidebar */}
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteModal
                        title={deleteTarget.title}
                        onConfirm={handleConfirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </AnimatePresence>

            <div className="relative flex-shrink-0 h-full">
                {/* Expand / collapse toggle — hidden on mobile */}
                {!isMobile && (
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className="absolute -right-3 top-6 z-20 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                    </button>
                )}

                {/* Sidebar panel */}
                <div
                    className={cn(
                        "h-full overflow-hidden transition-all duration-300 ease-in-out",
                        isMobile ? "w-[280px]" : ""
                    )}
                    style={{ width: isMobile ? 280 : (collapsed ? 0 : 260) }}
                >
                    <div className={cn(
                        "h-full flex flex-col bg-card/60 backdrop-blur-md border-r border-border/50",
                        isMobile ? "w-full rounded-none" : "w-[260px] rounded-l-2xl"
                    )}>
                        {/* Header */}
                        <div className="p-4 border-b border-border/40">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Chat History
                            </p>
                            <button
                                onClick={onNewChat}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-all border border-primary/20 hover:border-primary/40"
                            >
                                <Plus className="w-4 h-4" />
                                New Chat
                            </button>
                        </div>

                        {/* Session list */}
                        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
                            {loading ? (
                                <div className="flex flex-col gap-2 px-3 py-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-9 rounded-xl bg-muted/30 animate-pulse" />
                                    ))}
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-primary/60" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">No chats yet. Start a conversation!</p>
                                </div>
                            ) : (
                                Object.entries(grouped).map(([label, items]) =>
                                    items.length === 0 ? null : (
                                        <div key={label} className="mb-2">
                                            <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {label}
                                            </p>
                                            {items.map((session) => (
                                                <div key={session.id} className="relative mx-2 mb-0.5 group">
                                                    <button
                                                        onClick={() => onLoadSession(session.id)}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 pr-10",
                                                            activeSessionId === session.id
                                                                ? "bg-primary/15 text-foreground border border-primary/25"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                                        )}
                                                    >
                                                        <MessageSquare
                                                            className={cn(
                                                                "w-3.5 h-3.5 flex-shrink-0",
                                                                activeSessionId === session.id
                                                                    ? "text-primary"
                                                                    : "text-muted-foreground/50"
                                                            )}
                                                        />
                                                        <span className="truncate leading-snug">{session.title}</span>
                                                    </button>

                                                    {/* Trash icon — always present, visible on hover */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteTarget(session);
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                              text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/15
                              opacity-0 group-hover:opacity-100 transition-all duration-200"
                                                        title="Delete chat"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
