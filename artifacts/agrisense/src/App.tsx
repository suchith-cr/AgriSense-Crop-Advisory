import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  CloudRain,
  CloudSun,
  FileImage,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sprout,
  SunMedium,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Wheat,
  X,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  useAnalyzeDisease,
  useCreateMarketInsight,
  useCreateWeatherAdvisory,
  useGetDashboard,
} from '@workspace/api-client-react';
import type {
  Dashboard,
  DiseaseAnalysis,
  MarketInsight,
  WeatherAdvisory,
} from '@workspace/api-client-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';

const queryClient = new QueryClient();
const USER_ID = import.meta.env.VITE_AGRISENSE_USER_ID ?? 'farmer-001';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutIcon },
  { href: '/disease-scanner', label: 'Disease scanner', icon: ScanLine },
  { href: '/weather-alerts', label: 'Weather alerts', icon: CloudSun },
  { href: '/market-insights', label: 'Market insights', icon: TrendingUp },
];

function LayoutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => item.href === location);

  return (
    <div className="agri-shell">
      <aside className={`agri-sidebar ${mobileOpen ? 'agri-sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Sprout size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-name">AgriSense</div>
            <div className="brand-caption">Crop advisory</div>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            data-testid="button-close-navigation"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-rule" />
        <p className="sidebar-label">Workspace</p>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === location;
            return (
              <Link
                href={item.href}
                key={item.href}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                onClick={() => setMobileOpen(false)}
                data-testid={`link-${item.label.toLowerCase().replaceAll(' ', '-')}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {active && <span className="nav-active-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="field-note">
            <div className="field-note-top">
              <span className="field-note-kicker">FIELD NOTE</span>
              <CircleDashed size={14} />
            </div>
            <p>Small checks today keep big problems from reaching harvest.</p>
            <div className="field-note-line">
              <span>Season 02</span>
              <span>•</span>
              <span>On track</span>
            </div>
          </div>
          <div className="account-chip" data-testid="text-user-account">
            <div className="account-avatar">FM</div>
            <div>
              <strong>Field manager</strong>
              <span>North plot · active</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
          data-testid="button-close-navigation-overlay"
        />
      )}

      <main className="agri-main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            data-testid="button-open-navigation"
          >
            <Menu size={21} />
          </button>
          <div className="topbar-context">
            <span className="context-overline">FIELDWORK / 2025</span>
            <span className="context-current">{current?.label ?? 'Overview'}</span>
          </div>
          <div className="topbar-right">
            <span className="sync-status"><span className="online-dot" /> All systems synced</span>
            <span className="topbar-date">{formatDate(new Date().toISOString())}</span>
          </div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-stack" data-testid="loading-dashboard">
      <div className="skeleton skeleton-hero" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-stat" key={item} />)}
      </div>
      <div className="dashboard-columns">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}

function EmptyState({ message, detail }: { message: string; detail: string }) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <div className="empty-icon"><Leaf size={20} /></div>
      <strong>{message}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ErrorState({ onRetry, message = 'We could not load your field data.' }: { onRetry: () => void; message?: string }) {
  return (
    <div className="error-state" data-testid="status-error">
      <AlertTriangle size={21} />
      <div>
        <strong>{message}</strong>
        <span>Check your connection and try again.</span>
      </div>
      <button className="button button-quiet" onClick={onRetry} data-testid="button-retry">
        <RefreshCw size={15} /> Retry
      </button>
    </div>
  );
}

function Dashboard() {
  const dashboardQuery = useGetDashboard(USER_ID, {
    query: { queryKey: getGetDashboardQueryKey(USER_ID), staleTime: 30_000 },
  });
  const dashboard = dashboardQuery.data as Dashboard | undefined;

  if (dashboardQuery.isLoading) return <DashboardSkeleton />;
  if (dashboardQuery.isError || !dashboard) {
    return <ErrorState onRetry={() => dashboardQuery.refetch()} />;
  }

  const stats = dashboard.stats;
  return (
    <div className="dashboard-stack">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <div className="eyebrow eyebrow-light">MONDAY · 07:40 FIELD BRIEF</div>
          <h1>Good morning, farmer.</h1>
          <p>Here is what your crops are telling you today. Start with the items marked <strong>attention</strong>; the rest can wait.</p>
          <div className="welcome-actions">
            <Link href="/disease-scanner" className="button button-light" data-testid="link-scan-from-dashboard">
              <ScanLine size={16} /> Scan a crop
            </Link>
            <Link href="/weather-alerts" className="button button-ghost-light" data-testid="link-weather-from-dashboard">
              Check weather <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="welcome-sun" aria-hidden="true">
          <SunMedium size={94} strokeWidth={1} />
          <div className="sun-orbit orbit-one" />
          <div className="sun-orbit orbit-two" />
        </div>
        <div className="welcome-field-lines" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
      </section>

      <div className="stats-grid">
        <StatCard label="Total analyses" value={stats.totalAnalyses} detail="Across this season" icon={Activity} tone="tone-sky" />
        <StatCard label="Healthy scans" value={stats.healthyScans} detail={stats.totalAnalyses ? `${Math.round((stats.healthyScans / stats.totalAnalyses) * 100)}% of scans` : 'No scans yet'} icon={ShieldCheck} tone="tone-leaf" />
        <StatCard label="Active alerts" value={stats.activeAlerts} detail={stats.activeAlerts ? 'Needs a look today' : 'Clear field'} icon={AlertTriangle} tone="tone-clay" />
        <StatCard label="Market signals" value={stats.marketSignals} detail="Timing insights ready" icon={TrendingUp} tone="tone-gold" />
      </div>

      <div className="dashboard-columns">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">RECENT ACTIVITY</div>
              <h2>Field notebook</h2>
            </div>
            <span className="panel-count">{dashboard.recentActivity.length} entries</span>
          </div>
          {dashboard.recentActivity.length === 0 ? (
            <EmptyState message="Your notebook is clear." detail="New scans and advisories will appear here." />
          ) : (
            <div className="activity-list">
              {dashboard.recentActivity.map((item) => (
                <div className="activity-item" key={item.id} data-testid={`activity-${item.id}`}>
                  <div className={`activity-marker marker-${item.type}`}>
                    {item.type === 'disease' && <ScanLine size={16} />}
                    {item.type === 'weather' && <CloudRain size={16} />}
                    {item.type === 'market' && <TrendingUp size={16} />}
                  </div>
                  <div className="activity-copy">
                    <div className="activity-title-row">
                      <strong>{item.title}</strong>
                      <span className={`status-pill status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span>
                    </div>
                    <span>{item.detail}</span>
                    <time>{formatRelativeDate(item.createdAt)}</time>
                  </div>
                  <ChevronRight size={16} className="activity-arrow" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel signals-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">LATEST SIGNALS</div>
              <h2>What needs attention</h2>
            </div>
            <div className="signal-pulse"><span /> Live</div>
          </div>
          <SignalSummary disease={dashboard.latestDisease} weather={dashboard.latestWeather} market={dashboard.latestMarket} />
        </section>
      </div>

      <section className="quick-nav">
        <div className="quick-nav-copy">
          <div className="eyebrow">QUICK NAVIGATION</div>
          <h2>Make the next call.</h2>
          <p>Three tools for the decisions that cannot wait.</p>
        </div>
        <div className="quick-links">
          <QuickLink href="/disease-scanner" icon={ScanLine} title="Scan a leaf" detail="Identify disease risk" />
          <QuickLink href="/weather-alerts" icon={CloudSun} title="Read the sky" detail="Plan around weather" />
          <QuickLink href="/market-insights" icon={Wheat} title="Time your sale" detail="Watch crop movement" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof ScanLine; title: string; detail: string }) {
  return (
    <Link href={href} className="quick-link" data-testid={`link-quick-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="quick-link-icon"><Icon size={18} /></div>
      <div><strong>{title}</strong><span>{detail}</span></div>
      <ArrowUpRight size={16} className="quick-link-arrow" />
    </Link>
  );
}

function SignalSummary({
  disease,
  weather,
  market,
}: {
  disease: DiseaseAnalysis | null;
  weather: WeatherAdvisory | null;
  market: MarketInsight | null;
}) {
  return (
    <div className="signal-list">
      <div className="signal-row">
        <div className="signal-icon signal-icon-disease"><ScanLine size={17} /></div>
        <div className="signal-copy">
          <span className="signal-type">CROP HEALTH</span>
          <strong>{disease?.diseaseName ?? 'No disease scans yet'}</strong>
          <span>{disease ? `${confidencePercent(disease.confidenceScore)}% confidence · ${disease.severity.toLowerCase()} severity` : 'Upload a leaf to get a read'}</span>
        </div>
        <Link href="/disease-scanner" className="signal-action" data-testid="link-latest-disease">Open <ArrowUpRight size={14} /></Link>
      </div>
      <div className="signal-row">
        <div className="signal-icon signal-icon-weather"><CloudSun size={17} /></div>
        <div className="signal-copy">
          <span className="signal-type">WEATHER</span>
          <strong>{weather?.alertLevel ?? 'No forecast brief'}</strong>
          <span>{weather ? `${weather.location} · ${weather.season}` : 'Set a location and season'}</span>
        </div>
        <Link href="/weather-alerts" className="signal-action" data-testid="link-latest-weather">Open <ArrowUpRight size={14} /></Link>
      </div>
      <div className="signal-row">
        <div className="signal-icon signal-icon-market"><TrendingUp size={17} /></div>
        <div className="signal-copy">
          <span className="signal-type">MARKET</span>
          <strong>{market?.estimatedPriceTrend ?? 'No price signal'}</strong>
          <span>{market ? `${market.cropType} · ${market.yieldTons} tons` : 'Run a timing recommendation'}</span>
        </div>
        <Link href="/market-insights" className="signal-action" data-testid="link-latest-market">Open <ArrowUpRight size={14} /></Link>
      </div>
    </div>
  );
}

function DiseaseScanner() {
  const [fileName, setFileName] = useState('');
  const [imageData, setImageData] = useState('');
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyzeDisease();

  const selectFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setFileName(file.name);
    setAnalysis(null);
    const reader = new FileReader();
    reader.onload = () => setImageData(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0]);
  };
  const handleAnalyze = () => {
    if (!imageData) return;
    analyzeMutation.mutate(
      { data: { userId: USER_ID, imageData, imageName: fileName } },
      { onSuccess: (result) => setAnalysis(result) },
    );
  };

  return (
    <div className="tool-page">
      <PageIntro eyebrow="CROP HEALTH / VISUAL CHECK" title="Read the leaf." description="Upload a clear crop image and get a practical diagnosis in under a minute." action={<span className="provider-note"><ShieldCheck size={15} /> Decision support, not a replacement for local expertise</span>} />
      <div className="tool-grid">
        <section className="panel upload-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">01 · CAPTURE</div><h2>Choose a crop image</h2></div>
            {fileName && <span className="file-ready"><Check size={14} /> Ready</span>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" data-testid="input-disease-file" />
          {imageData ? (
            <div className="image-preview-wrap">
              <img src={imageData} alt={`Selected crop sample ${fileName}`} className="image-preview" data-testid="img-disease-preview" />
              <div className="image-preview-bar">
                <div><FileImage size={16} /><span>{fileName}</span></div>
                <button className="text-button" onClick={() => fileInputRef.current?.click()} data-testid="button-replace-image">Replace</button>
              </div>
            </div>
          ) : (
            <button className="dropzone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} data-testid="button-upload-image">
              <div className="dropzone-icon"><UploadCloud size={25} /></div>
              <strong>Drop a leaf or crop photo here</strong>
              <span>or click to browse · JPG, PNG up to 10 MB</span>
            </button>
          )}
          <div className="capture-tips">
            <div className="eyebrow">FOR A CLEANER READ</div>
            <div className="tip-grid">
              <span><CheckCircle2 size={14} /> Use daylight</span>
              <span><CheckCircle2 size={14} /> Fill the frame</span>
              <span><CheckCircle2 size={14} /> Keep it in focus</span>
            </div>
          </div>
          <button className="button button-primary full-button" disabled={!imageData || analyzeMutation.isPending} onClick={handleAnalyze} data-testid="button-analyze-disease">
            {analyzeMutation.isPending ? <><LoaderCircle size={17} className="spin" /> Reading your crop...</> : <><ScanLine size={17} /> Analyze image</>}
          </button>
          {analyzeMutation.isError && <div className="inline-error" data-testid="status-disease-error"><AlertTriangle size={16} /> The analysis could not be completed. Try another image.</div>}
        </section>

        <section className="panel diagnosis-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">02 · DECISION</div><h2>Diagnosis</h2></div>
            {analysis && <span className="result-time">Just now</span>}
          </div>
          {analysis ? <DiseaseResult analysis={analysis} /> : <ResultPlaceholder icon={ScanLine} title="Your read will appear here" detail="Upload an image to see the likely issue, confidence, and the next sensible action." />}
        </section>
      </div>
    </div>
  );
}

function DiseaseResult({ analysis }: { analysis: DiseaseAnalysis }) {
  const confidence = confidencePercent(analysis.confidenceScore);
  const severityClass = analysis.severity.toLowerCase();
  return (
    <div className="result-content" data-testid="result-disease">
      <div className={`diagnosis-callout diagnosis-${severityClass}`}>
        <div className="diagnosis-symbol"><AlertTriangle size={20} /></div>
        <div><span className="signal-type">LIKELY IDENTIFICATION</span><h3>{analysis.diseaseName}</h3><span>{analysis.severity.toLowerCase()} attention · {confidence}% confidence</span></div>
      </div>
      <div className="confidence-block">
        <div className="confidence-heading"><span>Model confidence</span><strong>{confidence}%</strong></div>
        <div className="confidence-track"><span style={{ width: `${confidence}%` }} /></div>
      </div>
      <div className="advice-block">
        <div className="advice-heading"><div className="advice-icon advice-icon-clay"><Activity size={16} /></div><span>What to do now</span></div>
        <p>{analysis.treatmentPlan}</p>
      </div>
      <div className="advice-block">
        <div className="advice-heading"><div className="advice-icon advice-icon-leaf"><ShieldCheck size={16} /></div><span>Prevent it spreading</span></div>
        <p>{analysis.preventativeMeasures}</p>
      </div>
      <div className="result-footer"><span>Source: {analysis.provider}</span><span>{formatDate(analysis.createdAt)}</span></div>
    </div>
  );
}

function ResultPlaceholder({ icon: Icon, title, detail }: { icon: typeof ScanLine; title: string; detail: string }) {
  return <div className="result-placeholder" data-testid="empty-diagnosis"><div className="placeholder-icon"><Icon size={23} /></div><strong>{title}</strong><span>{detail}</span></div>;
}

function WeatherAlerts() {
  const [location, setLocation] = useState('');
  const [season, setSeason] = useState('Monsoon');
  const [advisory, setAdvisory] = useState<WeatherAdvisory | null>(null);
  const weatherMutation = useCreateWeatherAdvisory();
  const seasons = ['Spring', 'Summer', 'Monsoon', 'Autumn', 'Winter'];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (location.trim().length < 2) return;
    weatherMutation.mutate({ data: { userId: USER_ID, location: location.trim(), season: season as 'Spring' | 'Summer' | 'Monsoon' | 'Autumn' | 'Winter' } }, { onSuccess: setAdvisory });
  };

  return (
    <div className="tool-page">
      <PageIntro eyebrow="WEATHER / FIELD CONDITIONS" title="Plan around the sky." description="Turn a place and season into a simple action plan for the next days and the next crop cycle." action={<div className="location-badge"><MapPin size={15} /> North plot</div>} />
      <div className="tool-grid">
        <section className="panel form-panel weather-form-panel">
          <div className="panel-heading"><div><div className="eyebrow">01 · FIELD CONDITIONS</div><h2>Set the context</h2></div><CloudSun size={25} className="panel-heading-icon" /></div>
          <form onSubmit={handleSubmit} className="advisory-form">
            <label className="field-label" htmlFor="weather-location">Field or village</label>
            <div className="input-with-icon"><MapPin size={17} /><input id="weather-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Nashik, Maharashtra" data-testid="input-weather-location" /></div>
            <label className="field-label" htmlFor="weather-season">Growing season</label>
            <div className="season-options">
              {seasons.map((item) => <button type="button" className={`season-option ${season === item ? 'season-option-active' : ''}`} onClick={() => setSeason(item)} key={item} data-testid={`button-season-${item.toLowerCase()}`}>{item}</button>)}
            </div>
            <div className="form-hint"><CalendarDays size={15} /> We use the season to tune timing, not to replace the local forecast.</div>
            <button className="button button-primary full-button" disabled={weatherMutation.isPending || location.trim().length < 2} data-testid="button-get-weather-advisory">
              {weatherMutation.isPending ? <><LoaderCircle size={17} className="spin" /> Reading conditions...</> : <><CloudSun size={17} /> Get field advisory</>}
            </button>
          </form>
          {weatherMutation.isError && <div className="inline-error" data-testid="status-weather-error"><AlertTriangle size={16} /> We could not prepare that advisory. Check the location and try again.</div>}
        </section>
        <section className="panel advisory-result-panel">
          <div className="panel-heading"><div><div className="eyebrow">02 · ACTION PLAN</div><h2>Weather advisory</h2></div>{advisory && <span className="result-time">Just now</span>}</div>
          {advisory ? <WeatherResult advisory={advisory} /> : <ResultPlaceholder icon={CloudSun} title="No weather brief yet" detail="Choose a location and season to get the actions that matter for your field." />}
        </section>
      </div>
    </div>
  );
}

function WeatherResult({ advisory }: { advisory: WeatherAdvisory }) {
  const level = advisory.alertLevel.toLowerCase();
  return (
    <div className="result-content" data-testid="result-weather">
      <div className={`weather-level weather-level-${level}`}><div className="weather-level-icon"><CloudSun size={22} /></div><div><span className="signal-type">FIELD CONDITION</span><h3>{advisory.alertLevel}</h3><span>{advisory.location} · {advisory.season}</span></div></div>
      <div className="advice-block advice-block-emphasis"><div className="advice-heading"><div className="advice-icon advice-icon-gold"><SunMedium size={16} /></div><span>Next 48 hours</span></div><p>{advisory.shortTermAction}</p></div>
      <div className="advice-block"><div className="advice-heading"><div className="advice-icon advice-icon-sky"><CloudRain size={16} /></div><span>For this crop cycle</span></div><p>{advisory.longTermAdvice}</p></div>
      <div className="result-footer"><span>Source: {advisory.provider}</span><span>{formatDate(advisory.createdAt)}</span></div>
    </div>
  );
}

function MarketInsights() {
  const [cropType, setCropType] = useState('Wheat');
  const [yieldTons, setYieldTons] = useState('12.5');
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const marketMutation = useCreateMarketInsight();
  const crops = ['Wheat', 'Corn', 'Rice', 'Soybeans', 'Cotton', 'Sugarcane'];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const numericYield = Number(yieldTons);
    if (!Number.isFinite(numericYield) || numericYield <= 0) return;
    marketMutation.mutate({ data: { userId: USER_ID, cropType: cropType as 'Wheat' | 'Corn' | 'Rice' | 'Soybeans' | 'Cotton' | 'Sugarcane', yieldTons: numericYield } }, { onSuccess: setInsight });
  };

  return (
    <div className="tool-page">
      <PageIntro eyebrow="MARKET / HARVEST TIMING" title="Sell with a little more signal." description="Tell us what is coming off the field. We will turn it into a timing recommendation you can act on." action={<span className="provider-note provider-note-gold"><TrendingUp size={15} /> Estimates move with the market</span>} />
      <div className="tool-grid">
        <section className="panel form-panel market-form-panel">
          <div className="panel-heading"><div><div className="eyebrow">01 · HARVEST INPUT</div><h2>What are you holding?</h2></div><Wheat size={25} className="panel-heading-icon" /></div>
          <form onSubmit={handleSubmit} className="advisory-form">
            <label className="field-label">Crop type</label>
            <div className="crop-options">
              {crops.map((crop) => <button type="button" className={`crop-option ${cropType === crop ? 'crop-option-active' : ''}`} onClick={() => setCropType(crop)} key={crop} data-testid={`button-crop-${crop.toLowerCase()}`}>{crop}</button>)}
            </div>
            <label className="field-label" htmlFor="market-yield">Expected yield <span>(tons)</span></label>
            <div className="input-with-icon"><Wheat size={17} /><input id="market-yield" inputMode="decimal" type="number" min="0.1" step="0.1" value={yieldTons} onChange={(event) => setYieldTons(event.target.value)} data-testid="input-market-yield" /></div>
            <div className="form-hint"><Activity size={15} /> Use your best field estimate. A rough number is more useful than no number.</div>
            <button className="button button-primary full-button" disabled={marketMutation.isPending || Number(yieldTons) <= 0} data-testid="button-get-market-insight">
              {marketMutation.isPending ? <><LoaderCircle size={17} className="spin" /> Reading movement...</> : <><TrendingUp size={17} /> Read market timing</>}
            </button>
          </form>
          {marketMutation.isError && <div className="inline-error" data-testid="status-market-error"><AlertTriangle size={16} /> We could not read that market signal. Please try again.</div>}
        </section>
        <section className="panel advisory-result-panel">
          <div className="panel-heading"><div><div className="eyebrow">02 · TIMING RECOMMENDATION</div><h2>Market insight</h2></div>{insight && <span className="result-time">Just now</span>}</div>
          {insight ? <MarketResult insight={insight} /> : <ResultPlaceholder icon={TrendingUp} title="No timing read yet" detail="Choose a crop and add your expected yield to see the suggested sale window." />}
        </section>
      </div>
    </div>
  );
}

function MarketResult({ insight }: { insight: MarketInsight }) {
  const trend = insight.estimatedPriceTrend.toLowerCase();
  const TrendIcon = trend === 'falling' ? TrendingDown : TrendingUp;
  return (
    <div className="result-content" data-testid="result-market">
      <div className={`market-callout market-${trend}`}><div className="market-trend-icon"><TrendIcon size={22} /></div><div><span className="signal-type">ESTIMATED PRICE TREND</span><h3>{insight.estimatedPriceTrend}</h3><span>{insight.cropType} · {insight.yieldTons} tons expected</span></div></div>
      <div className="sell-window"><div className="sell-window-icon"><CalendarDays size={19} /></div><div><span className="signal-type">BEST TIME TO SELL</span><strong>{insight.bestTimeToSell}</strong></div></div>
      <div className="advice-block"><div className="advice-heading"><div className="advice-icon advice-icon-leaf"><Wheat size={16} /></div><span>Suggested strategy</span></div><p>{insight.strategyRecommendation}</p></div>
      <div className="result-footer"><span>Source: {insight.provider}</span><span>{formatDate(insight.createdAt)}</span></div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function confidencePercent(score: number) {
  return Math.round(score > 1 ? score : score * 100);
}

function formatRelativeDate(value: string) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/disease-scanner" component={DiseaseScanner} />
          <Route path="/weather-alerts" component={WeatherAlerts} />
          <Route path="/market-insights" component={MarketInsights} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;