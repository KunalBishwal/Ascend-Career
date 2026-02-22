import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  IndianRupee,
  Clock,
  Bookmark,
  Building2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Globe,
  ChevronDown,
  X,
  Wifi,
  Briefcase,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedButton } from "@/components/ui/animated-button";
import { cn } from "@/lib/utils";
import { Aurora } from "@/components/ui/aurora";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
  skills: string[];
  description: string;
  applyUrl: string;
  companyLogo?: string;
  source?: string;
}

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "";

const COUNTRIES = [
  { code: "", label: "All Countries", flag: "🌍" },
  { code: "us", label: "United States", flag: "🇺🇸" },
  { code: "in", label: "India", flag: "🇮🇳" },
  { code: "gb", label: "United Kingdom", flag: "🇬🇧" },
  { code: "ca", label: "Canada", flag: "🇨🇦" },
  { code: "de", label: "Germany", flag: "🇩🇪" },
  { code: "au", label: "Australia", flag: "🇦🇺" },
  { code: "sg", label: "Singapore", flag: "🇸🇬" },
  { code: "ae", label: "UAE", flag: "🇦🇪" },
];

const EMPLOYMENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "FULLTIME", label: "Full-time" },
  { value: "PARTTIME", label: "Part-time" },
  { value: "CONTRACTOR", label: "Contract" },
  { value: "INTERN", label: "Internship" },
];

const EXPERIENCE_LEVELS = [
  { value: "", label: "All Levels" },
  { value: "under_3_years_experience", label: "Entry (0–3 yrs)" },
  { value: "more_than_3_years_experience", label: "Mid (3+ yrs)" },
  { value: "no_experience", label: "No experience required" },
];

type JobTab = "regular" | "remote";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return `${Math.floor(diff / 604800)} weeks ago`;
}

interface FetchParams {
  query: string;
  country: string;
  employmentType: string;
  experience: string;
}

// JSearch API
async function fetchJSearchJobs(params: FetchParams): Promise<Job[]> {
  if (!RAPIDAPI_KEY) return [];

  const urlParams = new URLSearchParams({
    query: params.query,
    page: "1",
    num_pages: "1",
    date_posted: "month",
  });

  if (params.country) urlParams.set("country", params.country);
  if (params.employmentType) urlParams.set("employment_types", params.employmentType);
  if (params.experience) urlParams.set("job_requirements", params.experience);

  const response = await fetch(
    `https://jsearch.p.rapidapi.com/search?${urlParams.toString()}`,
    {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    }
  );

  if (!response.ok) {
    console.error("JSearch API error:", response.status);
    throw new Error(`JSearch API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.data || []).map((item: any, index: number) => ({
    id: item.job_id || String(index),
    title: item.job_title || "Untitled",
    company: item.employer_name || "Unknown",
    location: item.job_city
      ? `${item.job_city}, ${item.job_state || item.job_country}`
      : item.job_is_remote ? "Remote" : "Not specified",
    salary: item.job_min_salary && item.job_max_salary
      ? `₹${Math.round(item.job_min_salary / 1000)}k - ₹${Math.round(item.job_max_salary / 1000)}k`
      : "Salary not listed",
    type: item.job_employment_type?.replace("FULLTIME", "Full-time").replace("PARTTIME", "Part-time").replace("CONTRACTOR", "Contract").replace("INTERN", "Internship") || "Full-time",
    posted: item.job_posted_at_datetime_utc ? timeAgo(item.job_posted_at_datetime_utc) : "Recently",
    skills: item.job_required_skills || [],
    description: item.job_description || "No description available.",
    applyUrl: item.job_apply_link || "#",
    companyLogo: item.employer_logo || undefined,
    source: "JSearch",
  }));
}

// Active Jobs DB API
async function fetchActiveJobsDB(params: FetchParams): Promise<Job[]> {
  if (!RAPIDAPI_KEY) return [];

  try {
    const url = `https://active-jobs-db.p.rapidapi.com/active-ats-7d?title=${encodeURIComponent(params.query)}&limit=10${params.country ? `&location=${encodeURIComponent(COUNTRIES.find(c => c.code === params.country)?.label || "")}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      console.warn("Active Jobs DB error:", response.status);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((job: any) => ({
      id: `ats-${job.id || Math.random().toString()}`,
      title: job.title || "Untitled",
      company: job.organization || "Unknown",
      location: job.locations_derived?.[0] || job.locations_raw?.[0]?.address?.addressLocality || "Not specified",
      salary: job.salary_raw?.value
        ? `${job.salary_raw.currency === 'USD' ? '₹' : job.salary_raw.currency || '₹'} ${job.salary_raw.value.minValue || ""}${job.salary_raw.value.maxValue ? `–${job.salary_raw.value.maxValue}` : ""} / ${job.salary_raw.value.unitText?.toLowerCase() || "year"}`
        : "Salary not listed",
      type: Array.isArray(job.employment_type)
        ? job.employment_type[0]
        : job.employment_type || "Full-time",
      posted: job.date_posted ? timeAgo(job.date_posted) : "Recently",
      skills: [],
      description: `Position at ${job.organization || "this company"} located in ${job.locations_derived?.[0] || "this location"}.`,
      applyUrl: job.url || "#",
      companyLogo: job.organization_logo || undefined,
      source: "Active Jobs DB",
    }));
  } catch (err) {
    console.warn("Active Jobs DB fetch failed:", err);
    return [];
  }
}

// Remote Jobs API
async function fetchRemoteJobs(query?: string): Promise<Job[]> {
  if (!RAPIDAPI_KEY) return [];

  try {
    const url = `https://remote-jobs1.p.rapidapi.com/jobs?limit=20${query ? `&search=${encodeURIComponent(query)}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-host": "remote-jobs1.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      console.warn("Remote Jobs API error:", response.status);
      return [];
    }

    const data = await response.json();
    const jobs = data.data || data.jobs || (Array.isArray(data) ? data : []);

    return jobs.map((job: any) => {
      // Strip HTML tags from description
      const cleanDesc = (job.description || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        id: `remote-${job.id || Math.random().toString()}`,
        title: job.title || "Untitled",
        company: job.company_name || job.company || "Unknown",
        location: "🌍 Remote",
        salary: job.salary || "Salary not listed",
        type: job.job_type || "Remote",
        posted: job.publication_date ? timeAgo(job.publication_date) : job.created_at ? timeAgo(job.created_at) : "Recently",
        skills: job.tags || [],
        description: cleanDesc || "No description available.",
        applyUrl: job.url || "#",
        companyLogo: job.company_logo || undefined,
        source: "Remote Jobs",
      };
    });
  } catch (err) {
    console.warn("Remote Jobs fetch failed:", err);
    return [];
  }
}

// Combine JSearch + Active Jobs DB for regular search
async function fetchAllJobs(params: FetchParams): Promise<Job[]> {
  const [jsearchJobs, activeJobs] = await Promise.allSettled([
    fetchJSearchJobs(params),
    fetchActiveJobsDB(params),
  ]);

  const results: Job[] = [];
  if (jsearchJobs.status === "fulfilled") results.push(...jsearchJobs.value);
  if (activeJobs.status === "fulfilled") results.push(...activeJobs.value);

  if (results.length === 0 && jsearchJobs.status === "rejected" && activeJobs.status === "rejected") {
    throw new Error("Failed to fetch jobs from all sources.");
  }

  // Deduplicate by title + company
  const seen = new Set<string>();
  return results.filter((job) => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState("Software Developer");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey] = useState(!!RAPIDAPI_KEY);
  const [activeTab, setActiveTab] = useState<JobTab>("regular");

  // Filters
  const [country, setCountry] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experience, setExperience] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const searchJobs = useCallback(async () => {
    if (!RAPIDAPI_KEY || !searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let results: Job[];
      if (activeTab === "remote") {
        results = await fetchRemoteJobs(searchQuery);
      } else {
        results = await fetchAllJobs({
          query: searchQuery,
          country,
          employmentType,
          experience,
        });
      }
      setJobs(results);
      setSelectedJob(results[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, country, employmentType, experience, activeTab]);

  useEffect(() => {
    if (hasApiKey) {
      searchJobs();
    }
  }, [activeTab]);

  // Re-search when filters change (only for regular tab)
  useEffect(() => {
    if (hasApiKey && searchQuery.trim() && activeTab === "regular") {
      const timer = setTimeout(() => searchJobs(), 300);
      return () => clearTimeout(timer);
    }
  }, [country, employmentType, experience]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchJobs();
  };

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const activeFilterCount = [country, employmentType, experience].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 relative">
        {/* Header with Aurora Background */}
        <div className="relative rounded-3xl overflow-hidden bg-background/5 border border-border/50 group">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
            <Aurora
              colorStops={['#3B82F6', '#60A5FA', '#93C5FD']}
              amplitude={0.8}
              blend={0.5}
              className="w-full h-full"
            />
          </div>

          <div className="relative z-10 p-8 sm:p-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">
                <GradientText>Job Search</GradientText>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Discover real opportunities from across the web.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2"
        >
          <button
            onClick={() => setActiveTab("regular")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              activeTab === "regular"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Briefcase className="w-4 h-4" />
            All Jobs
          </button>
          <button
            onClick={() => setActiveTab("remote")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              activeTab === "remote"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Wifi className="w-4 h-4" />
            Remote Jobs
          </button>
        </motion.div>

        {/* API Key Notice */}
        {!hasApiKey && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Real job listings require an API key</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add <code className="px-1.5 py-0.5 rounded bg-accent text-xs">VITE_RAPIDAPI_KEY</code> to your{" "}
                    <code className="px-1.5 py-0.5 rounded bg-accent text-xs">.env</code> file with a free JSearch API key from{" "}
                    <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      RapidAPI
                    </a>.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Search Bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === "remote" ? "Search remote jobs..." : "Search jobs (e.g. React Developer, Data Scientist)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              {activeTab === "regular" && (
                <AnimatedButton
                  type="button"
                  variant={showFilters ? "outline" : "glass"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </AnimatedButton>
              )}
              <AnimatedButton type="submit" variant="hero" disabled={loading || !hasApiKey}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Search
              </AnimatedButton>
            </div>
          </div>

          {/* Filter Dropdowns (only for regular tab) */}
          <AnimatePresence>
            {showFilters && activeTab === "regular" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-card border border-border">
                  {/* Country */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Country / Region</label>
                    <div className="relative">
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-10 px-3 pr-8 rounded-lg bg-accent/50 border border-border text-sm focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Employment Type</label>
                    <div className="relative">
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="w-full h-10 px-3 pr-8 rounded-lg bg-accent/50 border border-border text-sm focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        {EMPLOYMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Experience Level</label>
                    <div className="relative">
                      <select
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full h-10 px-3 pr-8 rounded-lg bg-accent/50 border border-border text-sm focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        {EXPERIENCE_LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Active filters chips */}
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {country && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {COUNTRIES.find(c => c.code === country)?.flag} {COUNTRIES.find(c => c.code === country)?.label}
                        <button onClick={() => setCountry("")} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {employmentType && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {EMPLOYMENT_TYPES.find(t => t.value === employmentType)?.label}
                        <button onClick={() => setEmploymentType("")} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {experience && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {EXPERIENCE_LEVELS.find(l => l.value === experience)?.label}
                        <button onClick={() => setExperience("")} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    <button
                      onClick={() => { setCountry(""); setEmploymentType(""); setExperience(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <GlassCard className="border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm">{error}</p>
            </div>
          </GlassCard>
        )}

        {/* No Results */}
        {!loading && !error && hasApiKey && jobs.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No jobs found. Try a different search or adjust your filters.</p>
          </div>
        )}

        {/* Source badge info */}
        {!loading && jobs.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing {jobs.length} results</span>
            {activeTab === "regular" && (
              <>
                <span>·</span>
                <span>Sources: JSearch + Active Jobs DB</span>
              </>
            )}
            {activeTab === "remote" && (
              <>
                <span>·</span>
                <span>Source: Remote Jobs API</span>
              </>
            )}
          </div>
        )}

        {/* Job Listings */}
        {!loading && jobs.length > 0 && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Job List */}
            <div className="lg:col-span-2 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    className={`cursor-pointer transition-all ${selectedJob?.id === job.id
                      ? "ring-2 ring-primary border-primary"
                      : ""
                      }`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={job.company}
                            className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent-foreground/20 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-sm">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveJob(job.id);
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Bookmark
                          className={`w-5 h-5 ${savedJobs.includes(job.id) ? "fill-primary text-primary" : ""
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      {job.salary !== "Salary not listed" && (
                        <span className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          {job.salary}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.posted}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {job.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-accent text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="px-2 py-0.5 rounded-md bg-accent text-xs">
                              +{job.skills.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div />
                      )}
                      <div className="flex items-center gap-1.5">
                        {job.source && (
                          <span className="px-1.5 py-0.5 rounded-md bg-accent/70 text-[10px] text-muted-foreground">
                            {job.source}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                          {job.type}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Job Details */}
            <AnimatePresence mode="wait">
              {selectedJob && (
                <motion.div
                  key={selectedJob.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="lg:col-span-3"
                >
                  <GlassCard className="sticky top-24">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        {selectedJob.companyLogo ? (
                          <img
                            src={selectedJob.companyLogo}
                            alt={selectedJob.company}
                            className="w-16 h-16 rounded-xl object-contain bg-white p-2"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-primary-foreground" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-2xl font-display font-bold">{selectedJob.title}</h2>
                          <p className="text-muted-foreground">{selectedJob.company}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-accent/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs">Location</span>
                        </div>
                        <p className="font-medium text-sm">{selectedJob.location}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-accent/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <IndianRupee className="w-4 h-4" />
                          <span className="text-xs">Salary</span>
                        </div>
                        <p className="font-medium text-sm">{selectedJob.salary}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-accent/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Posted</span>
                        </div>
                        <p className="font-medium text-sm">{selectedJob.posted}</p>
                      </div>
                    </div>

                    {selectedJob.skills.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-3">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Job Description</h3>
                      <div className="text-muted-foreground leading-relaxed text-sm max-h-[30vh] overflow-y-auto whitespace-pre-wrap">
                        {selectedJob.description.slice(0, 2000)}
                        {selectedJob.description.length > 2000 && "..."}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <a href={selectedJob.applyUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <AnimatedButton variant="hero" className="w-full">
                          Apply Now
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </AnimatedButton>
                      </a>
                      <AnimatedButton
                        variant="glass"
                        onClick={() => toggleSaveJob(selectedJob.id)}
                      >
                        <Bookmark
                          className={`w-5 h-5 ${savedJobs.includes(selectedJob.id) ? "fill-current" : ""
                            }`}
                        />
                        {savedJobs.includes(selectedJob.id) ? "Saved" : "Save"}
                      </AnimatedButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
