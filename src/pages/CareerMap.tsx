import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Star,
  Clock,
  DollarSign,
  BookOpen,
  CheckCircle2,
  Lock,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  Pencil,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedButton } from "@/components/ui/animated-button";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateRoadmap,
  getLatestRoadmap,
  saveRoadmap,
  type CareerRoadmap,
  type RoadmapNode,
} from "@/integrations/firebase/roadmap";
import { getResumeAnalyses } from "@/integrations/firebase/firestore";
import { cn } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RoadmapNode["status"], string> = {
  completed: "from-emerald-500 to-green-600",
  current: "from-violet-500 to-purple-600",
  upcoming: "from-sky-500 to-blue-600",
  locked: "from-slate-500 to-slate-600",
};

const STATUS_GLOW: Record<RoadmapNode["status"], string> = {
  completed: "shadow-emerald-500/30",
  current: "shadow-violet-500/40",
  upcoming: "shadow-sky-500/20",
  locked: "shadow-slate-500/10",
};

const STATUS_BORDER: Record<RoadmapNode["status"], string> = {
  completed: "border-emerald-500/30",
  current: "border-violet-500/50",
  upcoming: "border-sky-500/20",
  locked: "border-slate-500/20",
};

const ALL_STATUSES: RoadmapNode["status"][] = ["completed", "current", "upcoming", "locked"];

function statusIcon(status: RoadmapNode["status"]) {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-5 h-5" />;
    case "current": return <Star className="w-5 h-5" />;
    case "upcoming": return <ChevronRight className="w-5 h-5" />;
    case "locked": return <Lock className="w-5 h-5" />;
  }
}

function statusLabel(status: RoadmapNode["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function makeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Node Editor Drawer ──────────────────────────────────────────────────────

interface NodeEditorProps {
  node: RoadmapNode;
  onSave: (updated: RoadmapNode) => void;
  onDelete: () => void;
  onClose: () => void;
}

function NodeEditor({ node, onSave, onDelete, onClose }: NodeEditorProps) {
  const [draft, setDraft] = useState<RoadmapNode>({ ...node });
  const [skillInput, setSkillInput] = useState("");

  const set = (field: keyof RoadmapNode, value: any) =>
    setDraft((p) => ({ ...p, [field]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !draft.skills.includes(s)) {
      set("skills", [...draft.skills, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) =>
    set("skills", draft.skills.filter((s) => s !== skill));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard glow>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${STATUS_COLORS[draft.status]} flex items-center justify-center text-white`}>
                {statusIcon(draft.status)}
              </div>
              <h2 className="text-lg font-display font-bold">Edit Milestone</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-accent hover:bg-accent/80 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role / Title</label>
              <input
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm transition-colors"
              />
            </div>

            {/* Level & Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Level</label>
                <input
                  value={draft.level}
                  onChange={(e) => set("level", e.target.value)}
                  placeholder="e.g. Senior"
                  className="w-full h-10 px-3 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                <select
                  value={draft.status}
                  onChange={(e) => set("status", e.target.value as RoadmapNode["status"])}
                  className="w-full h-10 px-3 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm transition-colors"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary & Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <DollarSign className="w-3 h-3 inline mr-1" />Salary Range
                </label>
                <input
                  value={draft.salary}
                  onChange={(e) => set("salary", e.target.value)}
                  placeholder="e.g. $80k–$100k"
                  className="w-full h-10 px-3 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />Duration
                </label>
                <input
                  value={draft.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 6–12 months"
                  className="w-full h-10 px-3 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm resize-none transition-colors"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                <BookOpen className="w-3 h-3 inline mr-1" />Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Add skill & press Enter"
                  className="flex-1 h-9 px-3 rounded-xl bg-accent/50 border border-border focus:border-primary outline-none text-sm transition-colors"
                />
                <button
                  onClick={addSkill}
                  className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {draft.skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border/50">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSave(draft); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CareerMap() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [editingNode, setEditingNode] = useState<RoadmapNode | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing roadmap on mount
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getLatestRoadmap(uid)
      .then((r) => setRoadmap(r))
      .catch((e) => console.error("Failed to load roadmap:", e))
      .finally(() => setLoading(false));
  }, [uid]);

  // Generate from latest resume
  async function handleGenerate() {
    if (!uid) return;
    setGenerating(true);
    setError(null);
    try {
      const analyses = await getResumeAnalyses(uid);
      if (analyses.length === 0) {
        setError("Please upload and analyze your resume first before generating a roadmap.");
        setGenerating(false);
        return;
      }
      const latestAnalysis = analyses[analyses.length - 1] as any;
      const generated = await generateRoadmap({
        skills: latestAnalysis.skills,
        experienceLabel: latestAnalysis.experienceLabel,
        experienceMonths: latestAnalysis.experienceMonths,
        recommendations: latestAnalysis.recommendations,
        education: latestAnalysis.education,
        summary: latestAnalysis.summary,
      });
      await saveRoadmap(uid, generated);
      setRoadmap(generated);
    } catch (err) {
      console.error("Roadmap generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate roadmap. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Edit mode helpers
  const handleNodeSave = async (updated: RoadmapNode) => {
    if (!roadmap || !uid) return;
    const newNodes = roadmap.nodes.map((n) => (n.id === updated.id ? updated : n));
    const newRoadmap = { ...roadmap, nodes: newNodes };
    setRoadmap(newRoadmap);
    setSaving(true);
    try { await saveRoadmap(uid, newRoadmap); } catch (e) { console.error("Save failed:", e); }
    finally { setSaving(false); }
  };

  const handleNodeDelete = async (nodeId: string) => {
    if (!roadmap || !uid) return;
    const newNodes = roadmap.nodes.filter((n) => n.id !== nodeId);
    const newRoadmap = { ...roadmap, nodes: newNodes };
    setRoadmap(newRoadmap);
    setSaving(true);
    try { await saveRoadmap(uid, newRoadmap); } catch (e) { console.error("Delete failed:", e); }
    finally { setSaving(false); }
  };

  const handleAddNode = async () => {
    if (!roadmap || !uid) return;
    const lastNode = roadmap.nodes[roadmap.nodes.length - 1];
    const newNode: RoadmapNode = {
      id: makeId(),
      title: "New Milestone",
      level: "Mid",
      status: "locked",
      description: "Define this milestone",
      salary: "TBD",
      duration: "TBD",
      skills: [],
      col: (lastNode?.col ?? 0) + 1,
      row: (lastNode?.row === 0 ? 1 : 0) as 0 | 1,
      prerequisites: [],
    };
    const newRoadmap = { ...roadmap, nodes: [...roadmap.nodes, newNode] };
    setRoadmap(newRoadmap);
    setEditingNode(newNode);
    setSaving(true);
    try { await saveRoadmap(uid, newRoadmap); } catch (e) { console.error("Add failed:", e); }
    finally { setSaving(false); }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────────
  if (!roadmap && !generating) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
            <GlassCard className="text-center p-8" glow>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-3">
                <GradientText>Career Galaxy</GradientText>
              </h2>
              <p className="text-muted-foreground mb-6">
                Generate a personalized career roadmap based on your resume. Our AI maps out your journey from where you are to where you could be.
              </p>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <AnimatedButton variant="hero" className="w-full" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mapping your career galaxy…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate My Roadmap</>
                )}
              </AnimatedButton>
            </GlassCard>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Galaxy View ─────────────────────────────────────────────────────────
  const nodes = roadmap?.nodes ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">
              Your <GradientText>Career Galaxy</GradientText>
            </h1>
            <p className="text-muted-foreground text-sm">
              {roadmap?.currentRole} → {roadmap?.targetRole} · Estimated {roadmap?.totalEstimatedTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </span>
            )}
            {/* Edit Mode Toggle */}
            <button
              onClick={() => setIsEditMode((p) => !p)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                isEditMode
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
                  : "bg-accent/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <Pencil className="w-4 h-4" />
              {isEditMode ? "Exit Edit" : "Edit Mode"}
            </button>
            <AnimatedButton
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Regenerate
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Edit Mode Banner */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
            >
              <Pencil className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
                <strong>Edit Mode active</strong> — click any milestone to edit its details, status, skills, and salary. Changes are saved automatically.
              </span>
              <button
                onClick={handleAddNode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Milestone
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, label: "Completed", value: nodes.filter((n) => n.status === "completed").length, bg: "bg-emerald-500/10 border-emerald-500/20" },
            { icon: <Star className="w-4 h-4 text-violet-400" />, label: "Current", value: nodes.filter((n) => n.status === "current").length, bg: "bg-violet-500/10 border-violet-500/20" },
            { icon: <TrendingUp className="w-4 h-4 text-sky-400" />, label: "Upcoming", value: nodes.filter((n) => n.status === "upcoming").length, bg: "bg-sky-500/10 border-sky-500/20" },
            { icon: <Zap className="w-4 h-4 text-amber-400" />, label: "Total Skills", value: new Set(nodes.flatMap((n) => n.skills)).size, bg: "bg-amber-500/10 border-amber-500/20" },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.bg} flex items-center gap-3`}>
              {stat.icon}
              <div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Galaxy Visualization */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <GlassCard className="relative overflow-hidden p-6 min-h-[420px]">
            {/* Background stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full"
                  style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                  animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
                />
              ))}
            </div>

            {/* Connection lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="rgb(56,189,248)" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {nodes.map((node, i) => {
                if (i === 0) return null;
                const prev = nodes[i - 1];
                const maxCol = Math.max(...nodes.map((n) => n.col), 1);
                const x1 = (prev.col / maxCol) * 80 + 10;
                const y1 = prev.row === 0 ? 30 : 70;
                const x2 = (node.col / maxCol) * 80 + 10;
                const y2 = node.row === 0 ? 30 : 70;
                return (
                  <motion.line
                    key={`line-${i}`}
                    x1={`${x1}%`} y1={`${y1}%`}
                    x2={`${x2}%`} y2={`${y2}%`}
                    stroke="url(#lineGrad)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: i * 0.15 }}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            <div className="relative" style={{ zIndex: 1, minHeight: 380 }}>
              {nodes.map((node, i) => {
                const maxCol = Math.max(...nodes.map((n) => n.col), 1);
                const leftPct = (node.col / maxCol) * 80 + 10;
                const topPct = node.row === 0 ? 20 : 60;

                return (
                  <motion.div
                    key={node.id}
                    className="absolute cursor-pointer group"
                    style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: "translate(-50%, -50%)" }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200, delay: i * 0.12 }}
                    whileHover={{ scale: 1.12, zIndex: 10 }}
                    onClick={() => isEditMode ? setEditingNode(node) : setSelectedNode(node)}
                  >
                    {/* Glow ring for current */}
                    {node.status === "current" && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    )}

                    {/* Node circle */}
                    <div
                      className={cn(
                        `relative w-16 h-16 rounded-2xl bg-gradient-to-br ${STATUS_COLORS[node.status]} flex items-center justify-center text-white shadow-xl ${STATUS_GLOW[node.status]} border border-white/10 transition-all`,
                        isEditMode && "ring-2 ring-amber-400/50 ring-offset-1 ring-offset-transparent"
                      )}
                    >
                      {statusIcon(node.status)}
                      {/* Edit overlay */}
                      {isEditMode && (
                        <div className="absolute inset-0 rounded-2xl bg-amber-400/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil className="w-5 h-5 text-amber-300" />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-28 text-center">
                      <p className="text-xs font-semibold text-foreground truncate">{node.title}</p>
                      <p className="text-[10px] text-muted-foreground">{node.duration}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-xs">
              {(["Completed", "Current", "Upcoming", "Locked"] as const).map((label) => {
                const colorMap: Record<string, string> = { Completed: "bg-emerald-500", Current: "bg-violet-500", Upcoming: "bg-sky-500", Locked: "bg-slate-500" };
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${colorMap[label]}`} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Milestone Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 + 0.3 }}
            >
              <GlassCard
                className={cn(
                  `cursor-pointer border transition-all`,
                  isEditMode
                    ? "border-amber-500/30 hover:border-amber-500/60"
                    : `${STATUS_BORDER[node.status]} hover:border-primary/30`
                )}
                onClick={() => isEditMode ? setEditingNode(node) : setSelectedNode(node)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    `w-12 h-12 rounded-xl bg-gradient-to-br ${STATUS_COLORS[node.status]} flex items-center justify-center text-white flex-shrink-0 shadow-lg ${STATUS_GLOW[node.status]}`,
                    isEditMode && "ring-2 ring-amber-400/40"
                  )}>
                    {statusIcon(node.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{node.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground flex-shrink-0">{node.level}</span>
                      {isEditMode && <Pencil className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{node.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{node.salary}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{node.duration}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Node Detail Modal (view mode) */}
        <AnimatePresence>
          {selectedNode && !isEditMode && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
              onClick={() => setSelectedNode(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <GlassCard glow>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-2 bg-gradient-to-r ${STATUS_COLORS[selectedNode.status]} text-white`}>
                        {statusIcon(selectedNode.status)} {statusLabel(selectedNode.status)}
                      </div>
                      <h2 className="text-2xl font-display font-bold">{selectedNode.title}</h2>
                      <p className="text-muted-foreground">{selectedNode.level}</p>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="w-8 h-8 rounded-lg bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedNode.description && <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{selectedNode.description}</p>}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="w-4 h-4" /><span className="text-xs">Salary Range</span></div>
                      <p className="font-semibold">{selectedNode.salary}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="w-4 h-4" /><span className="text-xs">Duration</span></div>
                      <p className="font-semibold">{selectedNode.duration}</p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-primary" /><span className="font-medium">Key Skills to Master</span></div>
                    <div className="flex flex-wrap gap-2">
                      {selectedNode.skills.map((skill) => (
                        <span key={skill} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">{skill}</span>
                      ))}
                    </div>
                  </div>
                  {selectedNode.status === "current" && (
                    <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 flex items-center gap-2">
                      <Star className="w-4 h-4 flex-shrink-0" />
                      <span>This is your current position. Focus on building the skills above to advance.</span>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Node Editor Drawer (edit mode) */}
        <AnimatePresence>
          {editingNode && isEditMode && (
            <NodeEditor
              node={editingNode}
              onSave={(updated) => handleNodeSave(updated)}
              onDelete={() => { handleNodeDelete(editingNode.id); setEditingNode(null); }}
              onClose={() => setEditingNode(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
