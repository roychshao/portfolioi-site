// Single source of truth for all site content.
// Facts sourced from vault 40-職涯/職涯總覽.md + docs/2026-11-17-personal-site-design.md
// (§已定案補充). Copy is English; quantitative results are verbatim from the public thesis.

export interface CaseLink {
  label: string;
  url: string;
}
export interface ApproachStep {
  title: string;
  text: string;
}
export interface ResultMetric {
  metric: string;
  label: string;
}
export interface CaseBody {
  challenge: string;
  approach: ApproachStep[];
  results: ResultMetric[];
}
// Figure copy lives here; the component keeps only the key → astro:assets
// import map and the render width (static imports can't come from data).
export interface CaseFigure {
  key: string;
  alt: string;
}
export interface Case {
  id: string;
  title: string;
  tagline: string;
  badges: string[];
  techTags: string[];
  links: CaseLink[];
  figures: CaseFigure[];
  body: CaseBody;
}

export interface TimelineItem {
  period: string;
  title: string;
  org: string;
  text: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface WritingItem {
  title: string;
  url: string;
  date: string;
}


// Repeated copy lives in exactly one place; every consumer interpolates from here.
const EMAIL = 'roych.shao@gmail.com';
const GITHUB_URL = 'https://github.com/roychshao';
// Thesis headline stats — referenced by both results and the similarity figure's
// alt so no consumer restates them as a second copy.
const THESIS_N = '308';
const THESIS_MEAN = '0.954';
const THESIS_MEDIAN = '0.966';

export const profile = {
  name: 'Roy Shao (Ching-Hsiang Shao)',
  role: 'Software Engineer — Observability · Microservices · LLM Agents',
  location: 'Taipei, Taiwan',
  email: EMAIL,
  github: GITHUB_URL,
};

export const nav = {
  brand: '>_ Roy Shao',
  links: [
    { label: 'Work', href: '#work' },
    { label: 'Research', href: '#research' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ] satisfies NavItem[],
};

export const hero = {
  name: profile.name,
  status: 'NTU CSIE MS · Software Engineer',
  // Availability carries the green status dot (Hero.astro): a dot on the
  // credential line alone is ambiguous — it must read next to "Open to…".
  availability: 'Open to new grad roles',
  sub: 'Building useful things with code — from systems observability to LLM agents.',
  ctas: [
    { label: 'View Work', href: '#work' },
    { label: 'Get in touch', href: `mailto:${EMAIL}` },
  ],
};

export const cases: Case[] = [
  {
    id: 'sunbird',
    title: 'Sunbird — Kubernetes Telemetry, Push vs Pull',
    tagline:
      'A container-observability PoC: two OpenTelemetry collector topologies for Kubernetes — push (OTLP from apps) and pull (scraping components) — compared with a live WebSocket dashboard.',
    badges: ['3 demos · 3 source branches'],
    techTags: ['OpenTelemetry', 'Kubernetes', 'Docker', 'WebSocket', 'Java'],
    links: [{ label: 'Source (GitHub)', url: `${GITHUB_URL}/Sunbird-Container-Observability-Project` }],
    figures: [
      { key: 'traces', alt: 'Live trace stream from the Sunbird WebSocket dashboard' },
      { key: 'collector', alt: 'Push and pull OpenTelemetry collector topologies on Kubernetes' },
      { key: 'routing', alt: 'Fluentd routing configuration between collector modes' },
    ],
    body: {
      challenge:
        'In my NCCU SE Lab research (Sunbird-NCCU), the open question was how to collect container telemetry on Kubernetes at meaningful fidelity without taxing the workloads — and which collection model actually behaves better once clusters scale.',
      approach: [
        {
          title: 'Push collector topology',
          text: 'Applications emit OTLP telemetry directly to an OpenTelemetry Collector deployment — data flows as soon as it exists, exercising exporter routing and batching under load.',
        },
        {
          title: 'Pull collector topology',
          text: 'Collectors scrape metrics from Kubernetes components on an interval — trading latency for back-pressure control. Both topologies ran side by side for a like-for-like comparison.',
        },
        {
          title: 'Live WebSocket dashboard',
          text: 'A dashboard streamed normalized traces and metrics over WebSocket so the routing behavior of each topology was visible in real time, not just in post-hoc charts.',
        },
      ],
      results: [
        { metric: '3 demos', label: 'working demos delivered for the PoC' },
        { metric: '3 source branches', label: 'push and pull collector implementations kept as separate reviewable branches' },
      ],
    },
  },
  {
    id: 'dcim',
    title: 'Spec-Driven E2E Regression for a Commercial DCIM Platform',
    tagline:
      'As a research assistant, I turned a vendor\u2019s functional spec into a 100+ test Cypress E2E suite — now the lab\u2019s standing regression harness for an enterprise platform.',
    badges: ['100+ Cypress E2E · adopted as lab standard'],
    techTags: ['Cypress', 'JavaScript / TypeScript', 'CI/CD'],
    links: [{ label: 'GitHub profile', url: GITHUB_URL }],
    // No images by design (Global Constraints: dcim ships zero figures).
    figures: [],
    body: {
      challenge:
        'A commercial enterprise DCIM platform needed repeatable regression verification against vendor specs (Jan–Feb 2025, research assistant). Manual verification was slow and unfalsifiable — nobody could say what "still works" meant after a vendor change.',
      approach: [
        {
          title: 'Spec-to-scenario mapping',
          text: 'Worked from the vendor\u2019s functional specifications to derive a traceable E2E scenario matrix covering the platform\u2019s core workflows.',
        },
        {
          title: 'Suite engineering',
          text: 'Built the suite in Cypress with reusable page objects and fixtures so scenarios read like the spec and stayed maintainable as tests multiplied past 100.',
        },
        {
          title: 'Adoption as standard',
          text: 'The regression suite was adopted as the lab\u2019s continuous validation standard — the default gate for each vendor build.',
        },
      ],
      results: [
        { metric: '100+', label: 'Cypress E2E tests developed against vendor specs on an enterprise DCIM platform' },
        { metric: 'Adopted', label: 'suite became the lab\u2019s standard for continuous regression validation' },
      ],
    },
  },
];

// Research section — three items: (1) Roy's own NTU master's thesis (moved out of
// Work with its Chapter-4 metrics + DOI link intact), (2) the NTU monolith-to-
// microservices project continuing his senior Dong-Hong Wu's master's thesis —
// Roy (MS year 1) proposed the entity-relationship aggregate-root inference and
// was responsible for the aggregate repacking stage, (3) the TANET 2023 Best
// Paper OpenTelemetry+AOP research. Same Case shape as the Work items, so both
// sections share one accordion component (CaseList).
export const research: Case[] = [
  {
    id: 'thesis',
    title: 'Turning Natural Language into Real System Queries',
    tagline:
      "My master's thesis: a stage-based LLM agentic workflow — with a use-case spec as the middle representation — that answers real DCIM users' questions on a production data-center system.",
    badges: [`mean ${THESIS_MEAN} spec similarity · n=${THESIS_N}`, 'top-3 100% method matching', '27/27 final reply checks'],
    techTags: ['Python', 'LlamaIndex', 'vLLM', 'Qdrant', 'LLM Agents'],
    links: [{ label: 'Paper (DOI)', url: 'https://doi.org/10.6342/NTU202603218' }],
    // Display order: the headline similarity chart leads the panel.
    figures: [
      { key: 'similarity', alt: `Regenerated spec similarity distribution over ${THESIS_N} real DCIM queries (mean ${THESIS_MEAN}, median ${THESIS_MEDIAN})` },
      { key: 'architecture', alt: 'The commercial DCIM system architecture the agentic workflow targets' },
      { key: 'pipeline', alt: 'Stage-based agentic workflow pipeline: initial, controller, computation, reply' },
    ],
    body: {
      challenge:
        'Operators of a commercial DCIM (data-center infrastructure management) system can only get answers by navigating dense query UIs. Could natural language reliably drive a real management system? I built and validated a stage-based LLM agentic workflow that translates user queries into correct system behavior, independently owning the full pipeline — from dataset construction to the automated workflow. Evaluation used ' + THESIS_N + ' real DCIM user queries with manually annotated use-case specs, served by Gemma-4-31B-it via vLLM on an NVIDIA DGX Spark (temperature 0.0).',
      approach: [
        {
          title: 'Initial',
          text: 'Normalize the natural-language query and bind it to a use-case spec — an intermediate representation that bridges user intent and the system\u2019s API surface. Regenerated-spec similarity measured how faithfully this step preserved intent.',
        },
        {
          title: 'Controller',
          text: 'Select the right system methods via semantic retrieval of the top-10 candidates, then keyword boosting to disambiguate near-misses — evaluated over 929 workflow steps.',
        },
        {
          title: 'Computation',
          text: 'Compose and order the selected API operations into a correct computation path that produces the answer — evaluated over 3,348 steps.',
        },
        {
          title: 'Reply',
          text: 'Render the final answer and compare key data fields against ground-truth replies for format and value consistency.',
        },
      ],
      results: [
        { metric: `n=${THESIS_N}`, label: 'real DCIM user queries with manually annotated use-case specs (Gemma-4-31B-it @ vLLM, temp 0.0)' },
        { metric: `mean ${THESIS_MEAN}`, label: `regenerated spec similarity (median ${THESIS_MEDIAN}, σ 0.030)` },
        { metric: '96.02%', label: 'controller method matching — semantic retrieval top-10 over 929 steps' },
        { metric: 'top-1 95.05%', label: 'controller method matching with keyword boost added' },
        { metric: 'top-3 100%', label: 'controller method matching with keyword boost added' },
        { metric: '92.08%', label: 'computation operation matching — top-10 over 3,348 steps' },
        { metric: 'top-1 100%', label: 'computation operation matching with keyword boost added' },
        { metric: '27/27', label: 'final-reply key-data consistency checks passed on the format-consistent set (100%)' },
      ],
    },
  },
  {
    id: 'wu-microservices',
    title: 'Automated Monolith-to-Microservices Transformation',
    tagline:
      "An NTU SE Lab research project continuing my senior Dong-Hong Wu's master's thesis (same lab, same advisor, Prof. Jonathan Lee) — carried forward in my first master's year: static-analysis service-dependency extraction, aggregate roots inferred from entity relationships (my proposal), and the aggregate repacking stage, which I was responsible for.",
    badges: ['NTU SE Lab · continued from a senior\u2019s MS thesis', 'Roy: aggregate-root proposal + repack'],
    techTags: ['Java', 'Static Analysis', 'Spring', 'DDD', 'Microservices'],
    // The source note's only public pointer is the base thesis DOI (verified to
    // resolve to NTU's institutional repository). No public repo — never imply one.
    links: [{ label: 'Base Thesis (DOI)', url: 'https://doi.org/10.6342/NTU202503749' }],
    figures: [],
    body: {
      challenge:
        'Splitting a monolithic Java web application into microservices without hand-crafting the boundaries. The base project — later published as my senior’s master’s thesis, Transform Monolithic Web Applications into Microservice Architecture (NTU CSIE MS, Jul 2025) — defined an automated pipeline; I carried it forward during my first master\u2019s year, prototyping the static-analysis dependency extraction end to end and taking over how service boundaries would be derived and repacked.',
      approach: [
        {
          title: 'Service decomposition',
          text: 'Parse and analyze Java source (JavaParser / SootUp, with Spring bean handling) to extract dependencies and database models, yielding describable service components — the thesis pipeline I continued with static-analysis dependency extraction.',
        },
        {
          title: 'Aggregate roots from entity relationships',
          text: 'My own proposal for the composition stage: rather than leaving the domain model to purely structural clustering, infer DDD aggregate roots directly from the relationships between entities (one-to-one, one-to-many), so each aggregate\u2019s boundary follows the domain\u2019s own coupling. The thesis baseline clustered service components (silhouette-scored); the relationship-based inference gave those boundaries a modeling rationale.',
        },
        {
          title: 'Aggregate repacking (my part)',
          text: 'I was responsible for the repack: reassembling the decomposed components into new microservices around the inferred aggregates, including dependency repacking for background mechanisms (Eureka, Hibernate) so the repacked services stay runnable.',
        },
      ],
      // The source note carries no evaluation numbers — factual deliverables only.
      results: [
        { metric: 'Proposal', label: 'entity-relationship aggregate-root inference — my proposal, applied in the composition stage of the DDD aggregate definition' },
        { metric: 'Owned', label: 'the aggregate + dependency repacking stage, prototyped end to end in my first master\u2019s year' },
        { metric: 'Pipeline', label: 'static-analysis dependency extraction feeding service composition on a real monolithic web app' },
      ],
    },
  },
  {
    id: 'tanet',
    title: 'OpenTelemetry Instrumentation via Aspect-Oriented Programming',
    tagline:
      'My first-author research at the NCCU SE Lab — separating OpenTelemetry instrumentation logic from business code with AOP, keeping automatic-mode convenience without giving up manual-mode granularity. Awarded Best Paper at TANET 2023.',
    badges: ['TANET 2023 \u00b7 Best Paper Award', 'first author'],
    techTags: ['OpenTelemetry', 'AOP', 'Java', 'JPetStore'],
    links: [{ label: 'Source (GitHub)', url: `${GITHUB_URL}/TANET2023-JPetStore-OpenTelemetry` }],
    figures: [],
    body: {
      challenge:
        'OpenTelemetry offers two instrumentation modes and both hurt: automatic instrumentation is convenient but instruments too much, burns resources, and is limited to a few languages (.NET, Java, JavaScript, Python, Ruby), while manual instrumentation is fine-grained but sprinkles non-business logic through the code. Observability is a cross-cutting concern unrelated to business logic — the question was whether AOP could separate the two cleanly (research with me as first author, Jan\u2013Nov 2023, partially funded by MOST grant 112-2221-E-004-001).',
      approach: [
        {
          title: 'Instrumentation as aspects',
          text: 'Isolated the OpenTelemetry instrumentation logic into standalone aspects — day-to-day development touches only business code, and weaving merges the monitoring behavior back in, making instrumentation a flexible, reusable mechanism.',
        },
        {
          title: 'Trace semantics under AOP',
          text: 'Handled the hard parts of splitting spans across aspect boundaries: parent-child span relationships, context propagation, and link marking.',
        },
        {
          title: 'Benchmark study',
          text: 'Used the open-source JPetStore e-commerce system as the benchmark, building the same application under automatic, manual and AOP instrumentation, then comparing all three qualitatively and quantitatively.',
        },
      ],
      results: [
        { metric: 'Best Paper', label: 'TANET 2023 (first author) — the AOP approach balances convenience with high-granularity monitoring' },
        { metric: '3 modes', label: 'automatic vs manual vs AOP compared on the JPetStore benchmark' },
        { metric: 'Separation', label: 'business vs monitoring logic split improved maintainability' },
      ],
    },
  },
];

export const writingSection = {
  title: 'Writing',
};

export const writing: WritingItem[] = [
  {
    title: 'Building an AI Team to Develop Software for You — Multi-Agent SDLC with Hermes Agent Profiles & Kanban (Part 1)',
    url: 'https://medium.com/@roych.shao/建立一個ai團隊幫你開發軟體-利用hermes-agent-profiles與kanban機制之多agent-sdlc協作實務-一-413ff1fd54bc',
    date: '2026-09-13',
  },
  {
    title: 'Building an AI Team to Develop Software for You — Multi-Agent SDLC with Hermes Agent Profiles & Kanban (Part 2)',
    url: 'https://medium.com/@roych.shao/建立一個ai團隊幫你開發軟體-利用hermes-agent-profiles與kanban機制之多agent-sdlc協作實務-二-d81af3193a75',
    date: '2026-09-14',
  },
];

export const skills = {
  languages: ['Java', 'Python', 'JavaScript / TypeScript'],
  frameworks: ['Spring Boot', 'LlamaIndex', 'Node.js', 'React', 'OpenTelemetry', 'vLLM'],
  tools: ['Kubernetes', 'Docker', 'Jenkins', 'Git', 'Cypress', 'MySQL', 'Qdrant'],
};

// About-story prose: every claim here is a fact already carried by cases[] and
// timeline[] — no accolades beyond what the rest of the site substantiates.
export const about = {
  // Accessible name for the skill-pills group (About.astro) — no hardcoded
  // prose in components.
  skillsLabel: 'Skills',
  story: [
    'I am Roy — a software engineer in Taipei working where systems observability meets LLM agents. I came up through the NCCU SE Lab, where our OpenTelemetry instrumentation research (with me as first author) was awarded Best Paper at TANET 2023, and I later hardened a commercial data-center platform with 100+ Cypress regression tests as a research assistant in 2025.',
    'In my first year of NTU CSIE master’s study, I worked on monolith-to-microservices automation research (continuing a senior’s project); in my second year I built my own thesis — a stage-based LLM agentic workflow that turns natural-language questions into correct queries on a production DCIM system, validated on 308 annotated user queries. Outside the lab, I self-host Hermes Agent, my own AI assistant on Kubernetes with local models, a Discord bot, and FastMCP tools.',
    'I finished my master’s in August 2026 and I’m now looking for a new-grad role where I can build, ship, and operate software end to end.',
  ],
  imageAlt:
    'From a hillside old town: a stone fortress above tiled rooftops, with a vast city on the horizon',
};

export const contact = {
  email: `mailto:${EMAIL}`,
  github: GITHUB_URL,
  medium: 'https://medium.com/@roych.shao',
};

export const footer = {
  brand: '>_',
  copyright: `© 2026 ${profile.name.split(' (')[0]}`,
  sub: 'Email is the fastest way to reach me.',
  // Labels are the visible handles themselves so a recruiter can copy them
  // without clicking; hrefs stay the canonical contact URLs.
  contactLinks: [
    { label: EMAIL, href: contact.email, icon: 'mail' },
    { label: GITHUB_URL.replace('https://', ''), href: contact.github, icon: 'github' },
    { label: contact.medium.replace('https://', ''), href: contact.medium },
  ] satisfies { label: string; href: string; icon?: 'mail' | 'github' }[],
};

export const timeline: TimelineItem[] = [
  {
    period: '2020-09 – 2024-05',
    title: 'B.S. Computer Science & Information Engineering',
    org: 'NCCU',
    text: 'Undergraduate foundations and first research work in the NCCU SE Lab.',
  },
  {
    period: '2023',
    title: 'TANET 2023 Best Paper (first author)',
    org: 'NCCU SE Lab',
    text: 'OpenTelemetry + AOP instrumentation research awarded Best Paper.',
  },
  {
    period: '2024-09 – 2026-08',
    title: 'NTU CSIE MS',
    org: 'NTU SE Lab',
    text: 'Master\u2019s thesis in year two: a stage-based LLM agentic workflow validated on a real DCIM system, independently owning the full dataset-to-workflow pipeline.',
  },
  {
    period: '2024-09 – 2025-06',
    title: 'Research — monolith-to-microservices automation (MS year 1)',
    org: 'NTU SE Lab',
    text: 'First master\u2019s year: continued a senior\u2019s project — static analysis to extract service dependencies + DDD aggregate repacking, prototyped end to end.',
  },
  {
    period: '2025-01 – 2025-02',
    title: 'DCIM automated regression testing (Research Assistant)',
    org: 'NTU SE Lab',
    text: 'Delivered 100+ Cypress E2E tests from vendor specs; adopted as the lab\u2019s continuous validation standard.',
  },
  {
    period: '2026 – present',
    title: 'Hermes Agent — self-hosted AI assistant',
    org: 'Personal project',
    text: 'Kubernetes deployment with local models, a Discord bot, and FastMCP stock-market tools.',
  },
];

export const ghPinned: string[] = [
  'hermes-agent-k8s-config',
  'hermes-multi-agent-sdlc',
  'Sunbird-Container-Observability-Project',
  'TANET2023-JPetStore-OpenTelemetry',
  'AttackMonitor',
  'chatApp',
];
