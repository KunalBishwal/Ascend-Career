import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Play,
  Clock,
  Search,
  Zap,
  Target,
  TrendingUp,
  ExternalLink,
  Loader2,
  Sparkles,
  Youtube,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedButton } from "@/components/ui/animated-button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getResumeAnalyses } from "@/integrations/firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
  videoUrl: string;
  viewCount?: string;
  duration?: string;
  isRecommended?: boolean;
  skill?: string;
}

interface ResumeSkill {
  name: string;
  level?: string;
  category?: string;
}

// ── Fallback Data ────────────────────────────────────────────────────────
// High quality courses to show if API fails or for generic queries
const FALLBACK_VIDEOS: YouTubeVideo[] = [
  {
    id: "8Sze7at6y08",
    title: "Full Stack Web Development Course for Beginners",
    channel: "freeCodeCamp.org",
    thumbnail: "https://i.ytimg.com/vi/8Sze7at6y08/maxresdefault.jpg",
    publishedAt: "2024-01-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=8Sze7at6y08",
    viewCount: "2.1M views",
    duration: "11h 30m",
    isRecommended: true,
    skill: "Full Stack"
  },
  {
    id: "H2m-Nf9r7mU",
    title: "Full Stack Web Developer Roadmap 2024",
    channel: "Caleb Curry",
    thumbnail: "https://i.ytimg.com/vi/H2m-Nf9r7mU/maxresdefault.jpg",
    publishedAt: "2024-02-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=H2m-Nf9r7mU",
    viewCount: "450K views",
    duration: "25m 12s",
    isRecommended: true,
    skill: "Recommended"
  },
  {
    id: "nu_pCVPKzTk",
    title: "Full Stack Web Development for Beginners (Full Course)",
    channel: "Academind",
    thumbnail: "https://i.ytimg.com/vi/nu_pCVPKzTk/maxresdefault.jpg",
    publishedAt: "2023-11-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=nu_pCVPKzTk",
    viewCount: "890K views",
    duration: "5h 45m",
    isRecommended: false,
    skill: "Web Development"
  },
  {
    id: "R6vkoAkZz_s",
    title: "AI Engineer Roadmap 2024 - How to get started",
    channel: "Dave Ebbelaar",
    thumbnail: "https://i.ytimg.com/vi/R6vkoAkZz_s/maxresdefault.jpg",
    publishedAt: "2024-03-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=R6vkoAkZz_s",
    viewCount: "120K views",
    duration: "18m 45s",
    isRecommended: true,
    skill: "AI Engineer"
  },
  {
    id: "pKD7XU0A664",
    title: "Python for Data Science - Full Course",
    channel: "freeCodeCamp.org",
    thumbnail: "https://i.ytimg.com/vi/pKD7XU0A664/maxresdefault.jpg",
    publishedAt: "2024-01-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=pKD7XU0A664",
    viewCount: "3.2M views",
    duration: "12h 15m",
    isRecommended: false,
    skill: "Python"
  },
  {
    id: "7S_tz1z_5bA",
    title: "Java Full Course for Beginners",
    channel: "Bro Code",
    thumbnail: "https://i.ytimg.com/vi/7S_tz1z_5bA/maxresdefault.jpg",
    publishedAt: "2024-01-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=7S_tz1z_5bA",
    viewCount: "1.5M views",
    duration: "12h 00m",
    isRecommended: false,
    skill: "Java"
  },
  {
    id: "WXsD0ZgxjRw",
    title: "Spring Boot Full Course - Learn Spring Boot",
    channel: "Amigoscode",
    thumbnail: "https://i.ytimg.com/vi/WXsD0ZgxjRw/maxresdefault.jpg",
    publishedAt: "2024-01-01T00:00:00Z",
    videoUrl: "https://www.youtube.com/watch?v=WXsD0ZgxjRw",
    viewCount: "800K views",
    duration: "4h 30m",
    isRecommended: false,
    skill: "Spring Boot"
  }
];

// ── YouTube API helpers ───────────────────────────────────────────────────

const YT_KEY = () => import.meta.env.VITE_YOUTUBE_API_KEY as string;

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatViews(count: string): string {
  const n = parseInt(count);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

async function searchYouTube(query: string, maxResults = 6): Promise<YouTubeVideo[]> {
  const key = YT_KEY();
  if (!key) return [];

  try {
    // Search for videos - removed videoCategoryId=27 as it is too restrictive for tech tutorials
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
        query + " course tutorial"
      )}&maxResults=${maxResults}&relevanceLanguage=en&key=${key}`
    );

    if (!searchRes.ok) {
      const errorData = await searchRes.json();
      console.error("YouTube Search Error:", errorData);
      return [];
    }

    const searchData = await searchRes.json();
    const items = searchData.items ?? [];
    if (items.length === 0) return [];

    // Fetch duration + view counts
    const ids = items.map((i: any) => i.id.videoId).join(",");
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${key}`
    );
    const detailData = detailRes.ok ? await detailRes.json() : { items: [] };
    const detailMap: Record<string, any> = {};
    (detailData.items ?? []).forEach((d: any) => { detailMap[d.id] = d; });

    return items.map((item: any) => {
      const vid = item.id.videoId;
      const detail = detailMap[vid];
      return {
        id: vid,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url,
        publishedAt: item.snippet.publishedAt,
        videoUrl: `https://www.youtube.com/watch?v=${vid}`,
        viewCount: detail?.statistics?.viewCount ? formatViews(detail.statistics.viewCount) : undefined,
        duration: detail?.contentDetails?.duration ? formatDuration(detail.contentDetails.duration) : undefined,
      };
    });
  } catch (err) {
    console.error("YouTube Fetch Exception:", err);
    return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-400",
  Intermediate: "bg-amber-500/10 text-amber-400",
  Advanced: "bg-red-500/10 text-red-400",
};

export default function Learning() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [skills, setSkills] = useState<ResumeSkill[]>([]);
  const [targetRole, setTargetRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async (isSearchTrigger = false) => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const analyses = await getResumeAnalyses(uid);
      let skillList: ResumeSkill[] = [];
      let role = "";

      if (analyses.length > 0) {
        const latest = analyses[analyses.length - 1] as any;
        skillList = (latest.skills ?? []).slice(0, 8);
        role = latest.recommendations?.[0]?.role ?? "";
        setSkills(skillList);
        setTargetRole(role);
      }

      // ── Determine queries ────────────────────────────────────────────────
      const queries: { q: string; skill: string }[] = [];

      if (searchQuery.trim()) {
        queries.push({ q: searchQuery.trim(), skill: "Search" });
        if (!isSearchTrigger && role) {
          queries.push({ q: role, skill: "Recommended" });
        }
      } else {
        // Shuffled resume-based fetch for dynamicity
        if (role) queries.push({ q: `${role} roadmap`, skill: "Recommended" });

        // Pick 4 random skills from the list instead of first 3
        const shuffledSkills = [...skillList].sort(() => Math.random() - 0.5);
        shuffledSkills.slice(0, 4).forEach((s) =>
          queries.push({ q: `${s.name} tutorial`, skill: s.name })
        );

        if (queries.length === 0) queries.push({ q: "modern software engineering 2024", skill: "General" });
      }

      const results = await Promise.all(
        queries.map(async ({ q, skill }) => {
          // Increase results for search
          const count = skill === "Search" ? 12 : (skill === "Recommended" ? 6 : 4);
          const vids = await searchYouTube(q, count);
          return vids.map((v) => ({
            ...v,
            isRecommended: skill === "Recommended",
            skill,
          }));
        })
      );

      // Deduplicate by video ID
      const seen = new Set<string>();
      const all: YouTubeVideo[] = [];
      results.flat().forEach((v) => {
        if (!seen.has(v.id)) { seen.add(v.id); all.push(v); }
      });

      setVideos(all.length > 0 ? all : FALLBACK_VIDEOS);
      // If we did a search and got nothing from API, maybe try filtering fallbacks or telling user
      if (searchQuery.trim()) setSelectedSkill("All");

    } catch (err) {
      console.error("Failed to load courses:", err);
      // Set fallbacks on error so the page isn't empty
      setVideos(FALLBACK_VIDEOS);
      setError("Failed to fetch fresh videos (API Quota/Error). Showing curated featured courses instead.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, [uid]);

  // Filter
  const allSkillTabs = ["All", "Recommended", ...skills.map((s) => s.name)];
  const filtered = videos.filter((v) => {
    const matchSkill = selectedSkill === "All" || v.skill === selectedSkill;
    const matchSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSkill && matchSearch;
  });

  const recommended = videos.filter((v) => v.isRecommended);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">
              <GradientText>Learning Hub</GradientText>
            </h1>
            <p className="text-muted-foreground text-sm">
              {targetRole
                ? `Courses curated for your journey to ${targetRole}`
                : "Real courses from YouTube — powered by your resume"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search anything on YouTube..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchCourses(true)}
                className="w-56 h-10 pl-10 pr-4 rounded-xl bg-accent/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
            <AnimatedButton
              onClick={() => fetchCourses(true)}
              disabled={loading}
              variant="hero"
              className="h-10 px-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </AnimatedButton>
            <button
              onClick={() => { setSearchQuery(""); fetchCourses(); }}
              disabled={loading}
              className="h-10 px-4 rounded-xl bg-accent/50 border border-border flex items-center justify-center gap-2 hover:border-primary/50 text-sm font-medium transition-colors"
              title="Shuffle Recommendations"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Shuffle
            </button>
          </div>
        </motion.div>

        {/* Resume-based stats */}
        {skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold">Your Skill Profile</h2>
                  <p className="text-xs text-muted-foreground">From resume analysis — courses are matched to these</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s.name}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                  >
                    {s.name}
                    {s.level && <span className="ml-1 opacity-60">· {s.level}</span>}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Finding the best courses for you…</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <GlassCard>
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </GlassCard>
        )}

        {!loading && !error && (
          <>
            {/* Recommended Section */}
            {recommended.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-display font-semibold">
                    AI Picks for <GradientText>{targetRole || "You"}</GradientText>
                  </h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {recommended.map((v, i) => (
                    <VideoCard key={v.id} video={v} index={i} highlight />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Skill filter tabs */}
            {videos.length > 3 && (
              <div className="flex flex-wrap gap-2">
                {allSkillTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedSkill(tab)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      selectedSkill === tab
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* All courses */}
            {filtered.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((v, i) => (
                  <VideoCard key={v.id} video={v} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery.trim()
                    ? `No YouTube videos found for "${searchQuery}".`
                    : skills.length === 0
                      ? "Upload and analyze your resume to get personalized course recommendations!"
                      : "No courses matched your selection."}
                </p>
                {searchQuery.trim() && (
                  <button
                    onClick={() => { setSearchQuery(""); fetchCourses(); }}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-accent text-foreground text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Back to Recommendations
                  </button>
                )}
                {skills.length === 0 && !searchQuery.trim() && (
                  <a
                    href="/resume"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Analyze Resume
                  </a>
                )}
              </GlassCard>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── VideoCard sub-component ────────────────────────────────────────────────

function VideoCard({
  video,
  index,
  highlight = false,
}: {
  video: YouTubeVideo;
  index: number;
  highlight?: boolean;
}) {
  return (
    <motion.a
      href={video.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -3 }}
      className="group block"
    >
      <GlassCard
        className={cn(
          "overflow-hidden p-0 cursor-pointer h-full transition-shadow",
          highlight && "border-violet-500/30 hover:border-violet-500/50"
        )}
      >
        {/* Thumbnail */}
        <div className="relative h-44 overflow-hidden">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {video.isRecommended && (
              <span className="px-2 py-1 rounded-full bg-violet-600 text-white text-[10px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Pick
              </span>
            )}
            {video.skill && !video.isRecommended && (
              <span className="px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
                {video.skill}
              </span>
            )}
          </div>

          {/* Duration */}
          {video.duration && (
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {video.duration}
            </div>
          )}

          {/* YouTube logo */}
          <div className="absolute bottom-3 left-3">
            <Youtube className="w-5 h-5 text-red-500" />
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {video.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate flex-1">{video.channel}</span>
            {video.viewCount && (
              <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                <Eye className="w-3 h-3" />
                {video.viewCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            <ExternalLink className="w-3 h-3" />
            Open on YouTube
          </div>
        </div>
      </GlassCard>
    </motion.a>
  );
}
