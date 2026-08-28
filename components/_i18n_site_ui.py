# One-shot i18n replacements for site-ui.tsx. Not imported by the app.
from pathlib import Path

p = Path(__file__).with_name("site-ui.tsx")
s = p.read_text(encoding="utf-8")

repls: list[tuple[str, str]] = []

repls.append((
"""function DataStatus({ state, emptyLabel = 'Nothing to show yet.' }: { state: AsyncListState<unknown>; emptyLabel?: string }) {
  if (state.status === 'loading') return <p className="panel">Loading…</p>;
  if (state.status === 'error') return <p className="panel">{state.message}</p>;
  if (state.status === 'empty') return <p className="panel">{state.message || emptyLabel}</p>;
  return null;
}""",
"""function DataStatus({ state, emptyLabel }: { state: AsyncListState<unknown>; emptyLabel?: string }) {
  const { t } = useLocale();
  if (state.status === 'loading') return <p className="panel">{t('common.loading', { defaultMessage: 'Loading…' })}</p>;
  if (state.status === 'error') return <p className="panel">{state.message}</p>;
  if (state.status === 'empty') {
    return (
      <p className="panel">
        {emptyLabel || state.message || t('listing.empty', { defaultMessage: 'Nothing to show yet.' })}
      </p>
    );
  }
  return null;
}""",
))

repls.append((
"""function useAsyncList<T>(loader: () => Promise<{ data: T[] }>, deps: unknown[] = []): AsyncListState<T> {
  const [state, setState] = useState<AsyncListState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void loader()
      .then((result) => {
        if (cancelled) return;
        if (!result.data.length) setState({ status: 'empty', message: 'No published items yet.' });
        else setState({ status: 'ready', items: result.data });
      })""",
"""function useAsyncList<T>(loader: () => Promise<{ data: T[] }>, deps: unknown[] = []): AsyncListState<T> {
  const { t } = useLocale();
  const [state, setState] = useState<AsyncListState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void loader()
      .then((result) => {
        if (cancelled) return;
        if (!result.data.length) setState({ status: 'empty', message: t('listing.emptyPublished', { defaultMessage: 'No published items yet.' }) });
        else setState({ status: 'ready', items: result.data });
      })""",
))

repls.append((
"""function emptyListingMessage(path: string): string {
  if (path.includes('/mission/partners')) return 'No partners published yet.';
  if (path.includes('/mission/projects')) return 'No projects published yet.';
  if (path.includes('/mission/stories')) return 'No stories published yet.';
  if (path.includes('/online-church/sermons')) return 'No sermons published yet.';
  if (path.includes('/churches') || path.includes('/find-church') || path.includes('/home-churches')) {
    return 'No published churches yet.';
  }
  if (path.includes('/events')) return 'No events published yet.';
  if (path.includes('/press')) return 'No publications yet.';
  if (path.includes('/account/kca')) return 'KCA learning data is not available yet.';
  if (path.includes('/account/giving') || path.includes('/account/prayer') || path.includes('/account/need')) {
    return 'Nothing to show yet.';
  }
  if (path.includes('/account/messages')) return 'No conversations yet.';
  if (path.includes('/account/notifications')) return 'No notifications yet.';
  return 'No published items yet.';
}""",
"""function emptyListingMessage(path: string, t: (key: string, options?: TranslateOptions) => string): string {
  if (path.includes('/mission/partners')) return t('listing.emptyPartners', { defaultMessage: 'No partners published yet.' });
  if (path.includes('/mission/projects')) return t('listing.emptyProjects', { defaultMessage: 'No projects published yet.' });
  if (path.includes('/mission/stories')) return t('listing.emptyStories', { defaultMessage: 'No stories published yet.' });
  if (path.includes('/online-church/sermons')) return t('listing.emptySermons', { defaultMessage: 'No sermons published yet.' });
  if (path.includes('/churches') || path.includes('/find-church') || path.includes('/home-churches')) {
    return t('listing.emptyChurches', { defaultMessage: 'No published churches yet.' });
  }
  if (path.includes('/events')) return t('listing.emptyEvents', { defaultMessage: 'No events published yet.' });
  if (path.includes('/press')) return t('listing.emptyPress', { defaultMessage: 'No publications yet.' });
  if (path.includes('/account/kca')) return t('listing.emptyKca', { defaultMessage: 'KCA learning data is not available yet.' });
  if (path.includes('/account/giving') || path.includes('/account/prayer') || path.includes('/account/need')) {
    return t('listing.empty', { defaultMessage: 'Nothing to show yet.' });
  }
  if (path.includes('/account/messages')) return t('listing.emptyConversations', { defaultMessage: 'No conversations yet.' });
  if (path.includes('/account/notifications')) return t('listing.emptyNotifications', { defaultMessage: 'No notifications yet.' });
  return t('listing.emptyPublished', { defaultMessage: 'No published items yet.' });
}""",
))

repls.append((
"""          <small>{homeChurch ? homeChurchStepLabel(t, label) : label}</small>""",
"""          <small>{homeChurch ? homeChurchStepLabel(t, label) : t(`kca.step.${path}`, { defaultMessage: label })}</small>""",
))

# Home landing
repls.append((
"""function HomeLanding({ route }: { route: SiteRoute }) {
  const fixtures = useFixtures();""",
"""function HomeLanding({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const fixtures = useFixtures();""",
))
repls.append((
"""          setState({ status: 'empty', message: 'Home content is not published yet.' });""",
"""          setState({ status: 'empty', message: t('landing.emptyHome', { defaultMessage: 'Home content is not published yet.' }) });""",
))
repls.append((
"""        <DataStatus state={state} emptyLabel="Home content is not published yet." />""",
"""        <DataStatus state={state} emptyLabel={t('landing.emptyHome', { defaultMessage: 'Home content is not published yet.' })} />""",
))
repls.append((
"""              <span className="eyebrow">Our Four Pillars</span>
              <h2>Everything you need to belong, grow, and multiply</h2>""",
"""              <span className="eyebrow">{t('landing.fourPillars', { defaultMessage: 'Our Four Pillars' })}</span>
              <h2>{t('landing.belongGrowMultiply', { defaultMessage: 'Everything you need to belong, grow, and multiply' })}</h2>""",
))
repls.append((
"""            {pillarsCards.length ? <CardGrid cards={pillarsCards} /> : <p className="panel">No pillar cards published yet.</p>}""",
"""            {pillarsCards.length ? <CardGrid cards={pillarsCards} /> : <p className="panel">{t('landing.emptyPillars', { defaultMessage: 'No pillar cards published yet.' })}</p>}""",
))
repls.append((
"""              <span className="eyebrow">Get Started</span>
              <h2>Take your next Kingdom step</h2>""",
"""              <span className="eyebrow">{t('landing.getStarted', { defaultMessage: 'Get Started' })}</span>
              <h2>{t('landing.nextKingdomStep', { defaultMessage: 'Take your next Kingdom step' })}</h2>""",
))
repls.append((
"""            {actionCards.length ? <CardGrid cards={actionCards} /> : <p className="panel">No get-started cards published yet.</p>}""",
"""            {actionCards.length ? <CardGrid cards={actionCards} /> : <p className="panel">{t('landing.emptyGetStarted', { defaultMessage: 'No get-started cards published yet.' })}</p>}""",
))
repls.append((
"""      <BannerCta title="Ready to find your place in the family?" body="Search churches near you or join Online Church today." action="Find a Church" href="/find-church" />""",
"""      <BannerCta title={t('landing.findPlaceTitle', { defaultMessage: 'Ready to find your place in the family?' })} body={t('landing.findPlaceBody', { defaultMessage: 'Search churches near you or join Online Church today.' })} action={t('landing.findAChurch', { defaultMessage: 'Find a Church' })} href="/find-church" />""",
))

# About
repls.append((
"""function AboutLanding({ route }: { route: SiteRoute }) {
  const fixtures = useFixtures();""",
"""function AboutLanding({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const fixtures = useFixtures();""",
))
repls.append((
"""        if (!body && !result.cards.length) setState({ status: 'empty', message: 'About content is not published yet.' });""",
"""        if (!body && !result.cards.length) setState({ status: 'empty', message: t('landing.emptyAbout', { defaultMessage: 'About content is not published yet.' }) });""",
))
repls.append((
"""      <DataStatus state={state.status === 'ready' ? { status: 'ready', items: cards } : state} emptyLabel="About content is not published yet." />""",
"""      <DataStatus state={state.status === 'ready' ? { status: 'ready', items: cards } : state} emptyLabel={t('landing.emptyAbout', { defaultMessage: 'About content is not published yet.' })} />""",
))
repls.append((
"""              <span className="eyebrow">Who We Are</span>
              <h2>{route.title || 'A global family advancing the Kingdom together'}</h2>
              <p>{summary || 'About content will appear here when published.'}</p>""",
"""              <span className="eyebrow">{t('landing.whoWeAre', { defaultMessage: 'Who We Are' })}</span>
              <h2>{route.title || t('landing.globalFamily', { defaultMessage: 'A global family advancing the Kingdom together' })}</h2>
              <p>{summary || t('landing.aboutPlaceholder', { defaultMessage: 'About content will appear here when published.' })}</p>""",
))
repls.append((
"""                  <li>Biblical community across nations</li>
                  <li>Discipleship pathways for every season</li>
                  <li>Mission and compassion that transform lives</li>
                  <li>Training that equips Kingdom change agents</li>""",
"""                  <li>{t('landing.aboutPoint1', { defaultMessage: 'Biblical community across nations' })}</li>
                  <li>{t('landing.aboutPoint2', { defaultMessage: 'Discipleship pathways for every season' })}</li>
                  <li>{t('landing.aboutPoint3', { defaultMessage: 'Mission and compassion that transform lives' })}</li>
                  <li>{t('landing.aboutPoint4', { defaultMessage: 'Training that equips Kingdom change agents' })}</li>""",
))
repls.append((
"""              <h3>Our Identity</h3>
              {['One Family', 'One Faith', 'One Mission', 'Every Nation'].map((item) => (
                <div key={item}>
                  <b>{item}</b>
                  <small>Rooted in Christ and expressed through local and global ministry.</small>""",
"""              <h3>{t('landing.ourIdentity', { defaultMessage: 'Our Identity' })}</h3>
              {[
                t('landing.oneFamily', { defaultMessage: 'One Family' }),
                t('landing.oneFaith', { defaultMessage: 'One Faith' }),
                t('landing.oneMission', { defaultMessage: 'One Mission' }),
                t('landing.everyNation', { defaultMessage: 'Every Nation' }),
              ].map((item) => (
                <div key={item}>
                  <b>{item}</b>
                  <small>{t('landing.identityCopy', { defaultMessage: 'Rooted in Christ and expressed through local and global ministry.' })}</small>""",
))

# Vision
repls.append((
"""function VisionLanding({ route }: { route: SiteRoute }) {
  const fixtures = useFixtures();""",
"""function VisionLanding({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const fixtures = useFixtures();""",
))
repls.append((
"""          <h3>Our Vision</h3>
          <p>{summary || 'Vision content will appear here when published in the CMS.'}</p>
        </section>
        <section className="panel">
          <h3>Our Mission</h3>
          <p>To connect, disciple, and send believers through church, mission, training, and Spirit-filled resources.</p>""",
"""          <h3>{t('landing.ourVision', { defaultMessage: 'Our Vision' })}</h3>
          <p>{summary || t('landing.visionPlaceholder', { defaultMessage: 'Vision content will appear here when published in the CMS.' })}</p>
        </section>
        <section className="panel">
          <h3>{t('landing.ourMission', { defaultMessage: 'Our Mission' })}</h3>
          <p>{t('landing.missionCopy', { defaultMessage: 'To connect, disciple, and send believers through church, mission, training, and Spirit-filled resources.' })}</p>""",
))

# Contact
repls.append((
"""function ContactLanding() {
  return (
    <div className="split-panel contact-layout">
      <section className="panel">
        <span className="eyebrow">Get in Touch</span>
        <h2>We would love to hear from you</h2>
        <div className="contact-details">
          <div>
            <b>Headquarters</b>""",
"""function ContactLanding() {
  const { t } = useLocale();
  return (
    <div className="split-panel contact-layout">
      <section className="panel">
        <span className="eyebrow">{t('landing.getInTouch', { defaultMessage: 'Get in Touch' })}</span>
        <h2>{t('landing.loveToHear', { defaultMessage: 'We would love to hear from you' })}</h2>
        <div className="contact-details">
          <div>
            <b>{t('landing.headquarters', { defaultMessage: 'Headquarters' })}</b>""",
))
repls.append((
"""            <b>Email</b>
            <small>hello@familyhouseconnect.org</small>
          </div>
          <div>
            <b>Phone</b>""",
"""            <b>{t('landing.email', { defaultMessage: 'Email' })}</b>
            <small>hello@familyhouseconnect.org</small>
          </div>
          <div>
            <b>{t('landing.phone', { defaultMessage: 'Phone' })}</b>""",
))
repls.append((
"""            <b>Office Hours</b>""",
"""            <b>{t('landing.officeHours', { defaultMessage: 'Office Hours' })}</b>""",
))
repls.append((
"""          title: 'Contact Us',
          subtitle: 'Send Message',
          surface: 'public',
          kind: 'form',
          section: 'Home',
          action: 'Send Message',""",
"""          title: t('landing.contactUs', { defaultMessage: 'Contact Us' }),
          subtitle: t('landing.sendMessage', { defaultMessage: 'Send Message' }),
          surface: 'public',
          kind: 'form',
          section: 'Home',
          action: t('landing.sendMessage', { defaultMessage: 'Send Message' }),""",
))

# FAQ remaining
repls.append((
"""          placeholder="Search frequently asked questions..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="site-button" type="button" onClick={() => setOpen(0)}>
          {t('common.search', { defaultMessage: 'Search' })}
        </button>
      </div>
      <DataStatus state={faqState} emptyLabel="No FAQs published yet." />""",
"""          placeholder={t('landing.searchFaqPlaceholder', { defaultMessage: 'Search frequently asked questions...' })}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="site-button" type="button" onClick={() => setOpen(0)}>
          {t('common.search', { defaultMessage: 'Search' })}
        </button>
      </div>
      <DataStatus state={faqState} emptyLabel={t('landing.emptyFaqs', { defaultMessage: 'No FAQs published yet.' })} />""",
))
repls.append((
"""        {faqState.status === 'ready' && filtered.length === 0 ? <p className="panel">No FAQs match your search.</p> : null}""",
"""        {faqState.status === 'ready' && filtered.length === 0 ? <p className="panel">{t('landing.noFaqMatches', { defaultMessage: 'No FAQs match your search.' })}</p> : null}""",
))

# Search remaining
repls.append((
"""        <h2>Search Family House</h2>
        <p>Find churches, events, sermons, missions, and resources.</p>""",
"""        <h2>{t('landing.searchFamilyHouse', { defaultMessage: 'Search Family House' })}</h2>
        <p>{t('landing.searchCopy', { defaultMessage: 'Find churches, events, sermons, missions, and resources.' })}</p>""",
))
repls.append((
"""            placeholder="Search churches, events, sermons..."
          />
          <button className="site-button" type="button" onClick={() => setApplied(query)}>
            {t('common.search', { defaultMessage: 'Search' })}""",
"""            placeholder={t('landing.searchPlaceholder', { defaultMessage: 'Search churches, events, sermons...' })}
          />
          <button className="site-button" type="button" onClick={() => setApplied(query)}>
            {t('common.search', { defaultMessage: 'Search' })}""",
))
repls.append((
"""          {['All', 'Churches', 'Events', 'Mission', 'KCA', 'Press'].map((chip) => (
            <button className={category === chip ? 'active' : ''} key={chip} type="button" onClick={() => setCategory(chip)}>
              {chip}
            </button>
          ))}""",
"""          {[
            ['All', t('listing.filterAll', { defaultMessage: 'All' })],
            ['Churches', t('nav.church', { defaultMessage: 'Churches' })],
            ['Events', t('nav.events', { defaultMessage: 'Events' })],
            ['Mission', t('nav.mission', { defaultMessage: 'Mission' })],
            ['KCA', t('nav.kca', { defaultMessage: 'KCA' })],
            ['Press', t('nav.press', { defaultMessage: 'Press' })],
          ].map(([value, label]) => (
            <button className={category === value ? 'active' : ''} key={value} type="button" onClick={() => setCategory(value)}>
              {label}
            </button>
          ))}""",
))
repls.append((
"""          <h3>Popular Searches</h3>""",
"""          <h3>{t('landing.popularSearches', { defaultMessage: 'Popular Searches' })}</h3>""",
))
repls.append((
"""          <h3>Results</h3>
          {catalogueLoading ? <p>Loading…</p> : null}
          {catalogueError ? <p>{catalogueError}</p> : null}
          {results.length === 0 && catalogueReady ? <p>No matches for “{applied}”.</p> : null}""",
"""          <h3>{t('landing.results', { defaultMessage: 'Results' })}</h3>
          {catalogueLoading ? <p>{t('common.loading', { defaultMessage: 'Loading…' })}</p> : null}
          {catalogueError ? <p>{catalogueError}</p> : null}
          {results.length === 0 && catalogueReady ? <p>{t('landing.noMatches', { defaultMessage: 'No matches for “{query}”.', vars: { query: applied } })}</p> : null}""",
))

missing = []
ambiguous = []
applied = 0
for old, new in repls:
    c = s.count(old)
    if c == 0:
        missing.append(old[:120].replace("\n", " / "))
        continue
    if c > 1:
        ambiguous.append((c, old[:80].replace("\n", " / ")))
    s = s.replace(old, new, 1)
    applied += 1

p.write_text(s, encoding="utf-8")
print(f"applied={applied} missing={len(missing)} ambiguous={len(ambiguous)}")
for m in missing:
    print("MISSING:", m)
for c, m in ambiguous:
    print(f"AMBIGUOUS {c}:", m)
