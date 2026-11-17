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

export interface HonorItem {
  title: string;
  detail: string;
  year: string;
  url: string;
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
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ] satisfies NavItem[],
};

export const hero = {
  name: profile.name,
  status: 'NTU CSIE MS · Software Engineer',
  sub: 'Building useful things with code — from systems observability to LLM agents.',
  ctas: [
    { label: 'View Work', href: '#work' },
    { label: 'Get in touch', href: `mailto:${EMAIL}` },
  ],
};

export const cases: Case[] = [
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
        'Operators of a commercial DCIM (data-center infrastructure management) system can only get answers by navigating dense query UIs. Could natural language reliably drive a real management system? I built and validated a stage-based LLM agentic workflow that translates user queries into correct system behavior, independently owning the full pipeline — from dataset construction to the automated workflow. Evaluation used ' + THESIS_N + ' real DCIM user queries with manually annotated use-case specs, served by Gemma-4-31B-it via vLLM (temperature 0.0).',
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

export const honors: HonorItem[] = [
  {
    title: 'TANET 2023 Best Paper',
    detail:
      'First author — OpenTelemetry instrumentation via AOP (JPetStore case), NCCU SE Lab. Repo: TANET2023-JPetStore-OpenTelemetry.',
    year: '2023',
    url: `${GITHUB_URL}/TANET2023-JPetStore-OpenTelemetry`,
  },
];

export const honorsWriting = {
  title: 'Honors & Writing',
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
    'I am Roy — a software engineer in Taipei working where systems observability meets LLM agents. I came up through the NCCU SE Lab, where our OpenTelemetry instrumentation research (with me as first author) was awarded Best Paper at TANET 2023, and I later hardened a commercial data-center platform with 100+ Cypress regression tests as a research assistant.',
    'For my NTU CSIE master’s I built a stage-based LLM agentic workflow that turns natural-language questions into correct queries on a production DCIM system — validated on 308 annotated user queries. I now research monolith-to-microservices automation at the NTU SE Lab, and I self-host Hermes Agent, my own AI assistant on Kubernetes with local models, a Discord bot, and FastMCP tools.',
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
  contactLinks: [
    { label: 'Email', href: contact.email, icon: 'mail' },
    { label: 'GitHub', href: contact.github, icon: 'github' },
    { label: 'Medium', href: contact.medium },
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
    title: 'NTU CSIE MS — master\u2019s thesis on a stage-based LLM agentic workflow',
    org: 'NTU SE Lab',
    text: 'Thesis validated on a real DCIM system; independently owned dataset-to-workflow automation.',
  },
  {
    period: '2025-01 – 2025-02',
    title: 'DCIM automated regression testing (Research Assistant)',
    org: 'NTU SE Lab',
    text: 'Delivered 100+ Cypress E2E tests from vendor specs; adopted as the lab\u2019s continuous validation standard.',
  },
  {
    period: '2026-08 – present',
    title: 'Research — monolith-to-microservices automation',
    org: 'NTU SE Lab',
    text: 'Static analysis to extract service dependencies + DDD aggregate repacking, prototyped end to end.',
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
