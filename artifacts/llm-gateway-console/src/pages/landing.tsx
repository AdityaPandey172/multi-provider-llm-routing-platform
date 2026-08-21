import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Database,
  Gauge,
  KeyRound,
  LockKeyhole,
  Network,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';

/* ─── tiny helpers ─────────────────────────────────────────────────── */

function useInView(threshold = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── nav ──────────────────────────────────────────────────────────── */

function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300"
      style={{
        background: scrolled ? 'hsl(214 37% 17% / .96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid hsl(214 28% 25% / .7)' : '1px solid transparent',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-500 text-[10px] font-black text-slate-900">CP</div>
        <span className="text-sm font-semibold tracking-tight text-white">Command Post</span>
        <span className="mono ml-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">v0.1</span>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/20"
      >
        Enter control plane <ArrowRight className="h-3 w-3" />
      </Link>
    </header>
  );
}

/* ─── hero ─────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(hsl(210 28% 35% / .15) 1px, transparent 1px), linear-gradient(90deg, hsl(210 28% 35% / .15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[520px] w-[820px] rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>
      <div className="relative z-10 max-w-4xl">
        {/* pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-4 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          <span className="mono text-[11px] font-medium text-cyan-300">Production-grade LLM gateway control plane</span>
        </div>
        {/* headline */}
        <h1
          className="text-[clamp(2.6rem,6vw,5rem)] font-bold leading-[1.05] tracking-[-0.04em] text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          One plane to rule
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent">
            every model call.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-white/55">
          Command Post routes your AI workloads across hosted and local LLMs enforcing budgets, fallbacks, caching,
          and security so engineering teams ship faster without losing cost or quality control.
        </p>
        {/* ctas */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 active:scale-[.98]"
          >
            Try it open dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white/70 ring-1 ring-white/12 transition hover:text-white hover:ring-white/25"
          >
            See what's inside <ChevronDown className="h-4 w-4" />
          </a>
        </div>
      </div>
      {/* scroll hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/25">
        <ChevronDown className="h-5 w-5" />
      </div>
    </section>
  );
}

/* ─── stats bar ─────────────────────────────────────────────────────── */

const STATS = [
  { value: '10 k+', label: 'requests / second' },
  { value: '99.99%', label: 'gateway availability' },
  { value: '< 100 ms', label: 'overhead added' },
  { value: '6', label: 'provider adapters' },
];

function StatsBar() {
  const { ref, visible } = useInView(0.3);
  return (
    <div ref={ref} className="border-y border-white/8 bg-white/3 px-6 py-10">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="text-center"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity .5s ease ${i * 90}ms, transform .5s ease ${i * 90}ms`,
            }}
          >
            <div className="mono text-3xl font-semibold text-cyan-400">{stat.value}</div>
            <div className="mt-1 text-[13px] text-white/45">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── capabilities ──────────────────────────────────────────────────── */

const CAPS = [
  {
    icon: Server,
    title: 'Provider fabric',
    accent: 'cyan',
    desc: 'Register OpenAI, Anthropic, Gemini, Ollama, vLLM, and TGI in one place. Enable, disable, or watch health metrics per provider with automatic circuit breaking on error spikes.',
    detail: ['Hosted + local adapters', 'Per-provider enable / disable', 'Latency & error-rate telemetry', 'Circuit-breaker protection'],
  },
  {
    icon: Route,
    title: 'Intelligent routing',
    accent: 'amber',
    desc: 'Choose a routing strategy lowest latency, lowest cost, or round-robin and set per-tier latency guardrails and a daily cost ceiling that prevents runaway spend.',
    detail: ['Alias-based model abstraction', 'Canary traffic splitting', 'Retry & fallback chains', 'Cost guardrail enforcement'],
  },
  {
    icon: Boxes,
    title: 'Async job engine',
    accent: 'cyan',
    desc: 'Every request becomes a durable, cancellable job. Non-streaming calls return a job ID instantly; streaming requests open an OpenAI-compatible SSE channel. Jobs persist for 24 hours.',
    detail: ['HTTP 202 + job polling', 'Submission-time SSE streaming', 'Batch up to 1 000 items', 'Full timeline inspection'],
  },
  {
    icon: Database,
    title: 'Semantic & exact cache',
    accent: 'amber',
    desc: 'Serve identical and near-identical requests from cache before they reach a provider. 31 % hit rate means real money saved on every billing cycle, with no change to application code.',
    detail: ['Exact-match deduplication', 'Vector-similarity matching', 'Per-provider cache bypass', 'Saved-token accounting'],
  },
  {
    icon: BarChart3,
    title: 'Usage & cost control',
    accent: 'cyan',
    desc: 'Per-user token quotas, daily budget limits, and provider-cost versus internal-cost reconciliation all visible in one panel that refreshes every 30 seconds.',
    detail: ['Input / output token quotas', 'Daily budget ceiling', 'Provider vs internal cost', '30 s auto-refresh'],
  },
  {
    icon: ShieldCheck,
    title: 'Security governance',
    accent: 'amber',
    desc: 'Audit every credential access, content redaction, and replay attempt in a chronological event stream. PII is stripped before trace persistence. SAML 2.0 with JIT provisioning for the operator console.',
    detail: ['PII & credential redaction', 'Replay detection', 'SAML 2.0 / JIT provisioning', 'Severity-filtered event log'],
  },
];

function CapabilityCard({ cap, index }: { cap: typeof CAPS[0]; index: number }) {
  const { ref, visible } = useInView();
  const Icon = cap.icon;
  const isAmber = cap.accent === 'amber';
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity .55s ease ${(index % 3) * 80}ms, transform .55s ease ${(index % 3) * 80}ms`,
      }}
      className="flex flex-col gap-5 rounded-xl border border-white/8 bg-white/4 p-6 backdrop-blur-sm transition hover:border-white/14 hover:bg-white/6"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isAmber ? 'bg-amber-500/15' : 'bg-cyan-500/15'}`}>
        <Icon className={`h-5 w-5 ${isAmber ? 'text-amber-400' : 'text-cyan-400'}`} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{cap.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/50">{cap.desc}</p>
      </div>
      <ul className="mt-auto space-y-1.5">
        {cap.detail.map((d) => (
          <li key={d} className="flex items-center gap-2 text-[12px] text-white/55">
            <span className={`h-1 w-1 rounded-full ${isAmber ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Capabilities() {
  return (
    <section id="capabilities" className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-4 text-center">
          <span className="mono text-xs font-medium uppercase tracking-widest text-cyan-400">What's inside</span>
        </Reveal>
        <Reveal delay={80} className="mb-14 text-center">
          <h2 className="text-[clamp(1.9rem,3.5vw,3rem)] font-bold leading-tight tracking-[-0.03em] text-white">
            Eight control surfaces.<br />One operator console.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
            Every layer your team needs to run LLM infrastructure at production scale without stitching together six separate tools.
          </p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((cap, i) => <CapabilityCard key={cap.title} cap={cap} index={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── operator controls ─────────────────────────────────────────────── */

const CONTROLS = [
  { icon: Server,          label: 'Register & toggle providers',         desc: 'Bring a new hosted or local upstream online in seconds. Disable it without redeploying.' },
  { icon: Route,           label: 'Set routing strategy & guardrails',   desc: 'Switch between latency, cost, and round-robin strategies. Dial in p99 budgets per request tier.' },
  { icon: CircleDollarSign,label: 'Enforce daily spend ceilings',        desc: 'Hard-stop spending above your daily limit per user or globally before the bill lands.' },
  { icon: Zap,             label: 'Submit & cancel live jobs',           desc: 'Trigger test requests, inspect their timelines, and cancel runaway jobs from the console.' },
  { icon: RefreshCw,       label: 'Tune cache & semantic similarity',    desc: 'Configure hit-rate thresholds, force cache invalidation, and monitor token savings in real time.' },
  { icon: KeyRound,        label: 'Manage credentials & redaction',      desc: 'Rotate provider credentials, audit access events, and enforce PII redaction policies.' },
  { icon: Users,           label: 'Administer identities & roles',       desc: 'Provision operators via SAML, assign roles, and track last-seen activity for every account.' },
  { icon: Terminal,        label: 'Send live gateway probes',            desc: 'Fire real message, embedding, and batch requests through the configured gateway from the Settings panel.' },
];

function OperatorControls() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-4 text-center">
          <span className="mono text-xs font-medium uppercase tracking-widest text-amber-400">Operator controls</span>
        </Reveal>
        <Reveal delay={80} className="mb-14 text-center">
          <h2 className="text-[clamp(1.9rem,3.5vw,3rem)] font-bold leading-tight tracking-[-0.03em] text-white">
            Full control nothing hidden.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
            Every action your platform team takes during an incident, a cost spike, or a model rollout is one click away not a Slack thread away.
          </p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CONTROLS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.label} delay={(i % 4) * 60} className="h-full">
                <div className="flex h-full flex-col gap-3 rounded-xl border border-white/8 bg-white/3 p-5 transition hover:border-amber-500/25 hover:bg-amber-500/4">
                  <Icon className="h-5 w-5 text-amber-400" />
                  <div className="text-sm font-semibold text-white">{c.label}</div>
                  <p className="text-[12px] leading-relaxed text-white/45">{c.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── business case ─────────────────────────────────────────────────── */

const BUSINESS = [
  {
    icon: CircleDollarSign,
    headline: 'Stop overpaying providers',
    body: 'Teams running unmanaged LLM calls routinely spend 3–5× more than necessary. Command Post\'s caching, cost guardrails, and cheapest-compliant-route routing cut provider bills from day one without touching application code.',
    stat: 'Up to 40 % cost reduction',
    accent: 'cyan',
  },
  {
    icon: Activity,
    headline: 'Ship features, not scaffolding',
    body: 'Building retry logic, fallbacks, token counting, and provider failover into every service is months of undifferentiated work. Command Post centralises all of it so product engineers focus on the features users care about.',
    stat: 'Weeks → days to production',
    accent: 'amber',
  },
  {
    icon: ShieldCheck,
    headline: 'Compliance you can prove',
    body: 'Every credential access, PII redaction, and replay event is logged with severity and timestamp. Audit reports that once took days of log-scraping are now a filtered table in the Security panel.',
    stat: 'Full audit trail, always on',
    accent: 'cyan',
  },
  {
    icon: Gauge,
    headline: 'Reliability your users feel',
    body: 'Circuit breakers, retries, and multi-provider fallbacks mean a single provider outage never reaches end users. With p99 latency targets per request tier, your SLAs stay intact even during provider incidents.',
    stat: '99.99 % gateway availability',
    accent: 'amber',
  },
  {
    icon: Network,
    headline: 'Governance across every team',
    body: 'Per-user quotas, role-based access, and SAML-provisioned operator accounts ensure finance, security, and ML teams all work from the same source of truth not from separate spreadsheets.',
    stat: 'One control plane, every team',
    accent: 'cyan',
  },
  {
    icon: LockKeyhole,
    headline: 'Stay ahead of risk',
    body: 'Canary aliases let you roll new models to 10 % of traffic before full release. Cost guardrails block runaway spend automatically. Security event severity filters surface the signals that matter before they become incidents.',
    stat: 'Risk contained by design',
    accent: 'amber',
  },
];

function BusinessCase() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-4 text-center">
          <span className="mono text-xs font-medium uppercase tracking-widest text-white/40">Why it matters</span>
        </Reveal>
        <Reveal delay={80} className="mb-14 text-center">
          <h2 className="text-[clamp(1.9rem,3.5vw,3rem)] font-bold leading-tight tracking-[-0.03em] text-white">
            The business case for a gateway.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
            An LLM gateway isn't infrastructure overhead it's the control layer that turns AI from a cost centre into a competitive advantage.
          </p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BUSINESS.map((b, i) => {
            const Icon = b.icon;
            const isAmber = b.accent === 'amber';
            return (
              <Reveal key={b.headline} delay={(i % 3) * 70}>
                <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/8 bg-gradient-to-b from-white/5 to-white/2 p-7 backdrop-blur-sm">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isAmber ? 'bg-amber-500/12' : 'bg-cyan-500/12'}`}>
                    <Icon className={`h-5 w-5 ${isAmber ? 'text-amber-400' : 'text-cyan-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{b.headline}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/48">{b.body}</p>
                  </div>
                  <div className={`mt-auto rounded-lg border px-3 py-2 text-[11px] font-semibold ${isAmber ? 'border-amber-500/20 bg-amber-500/8 text-amber-300' : 'border-cyan-500/20 bg-cyan-500/8 text-cyan-300'}`}>
                    {b.stat}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── final cta ─────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section className="px-6 py-32">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-transparent to-amber-500/5 p-[1px]">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-900/60 px-10 py-16 text-center backdrop-blur-xl">
          {/* ambient */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-96 rounded-full bg-cyan-500/10 blur-[80px]" />
          </div>
          <Reveal>
            <div className="mono mb-4 text-xs font-medium uppercase tracking-widest text-cyan-400">Command Post</div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold leading-tight tracking-[-0.03em] text-white">
              Your gateway is already running.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/50">
              Six providers seeded, routing policies live, jobs queued, cache warm. Open the operator dashboard and see your LLM infrastructure in motion.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-xl shadow-cyan-500/30 transition hover:bg-cyan-400 active:scale-[.98]"
              >
                Open the control plane
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── footer ────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/8 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500 text-[9px] font-black text-slate-900">CP</div>
          <span className="text-sm font-semibold text-white/60">Command Post</span>
        </div>
        <Link href="/dashboard" className="text-xs text-white/35 underline-offset-2 hover:text-white/60 hover:underline">
          Enter dashboard →
        </Link>
      </div>
    </footer>
  );
}

/* ─── page ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'hsl(214 36% 9%)',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <TopNav />
      <Hero />
      <StatsBar />
      <Capabilities />
      <OperatorControls />
      <BusinessCase />
      <FinalCTA />
      <Footer />
    </div>
  );
}
