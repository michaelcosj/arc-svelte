# Roadmap

Arc for Svelte is a work in progress. There are 96 implemented components with
demos: 51 are marked verified and 45 still need motion or variant verification.
Verification refers to exercised cases, not every browser or device combination.

| Area                                       | Status                                      |
| ------------------------------------------ | ------------------------------------------- |
| Foundation and shared motion helpers       | Implemented                                 |
| Shared building blocks (Phase 1)           | 15 verified                                 |
| Bits UI primitives (Phase 2)               | 6 verified; 9 need further verification     |
| Simple motion (Phase 3)                    | 9 verified; 13 need further verification    |
| Layout and shared-element motion (Phase 4) | 3 verified; 21 need further verification    |
| Badge and Tabs                             | Implemented; further verification pending   |
| Pointer and gesture (Phase 5)              | All 18 verified within the documented scope |
| Charts (Phase 6)                           | 13 planned                                  |
| Composed blocks (Phase 7)                  | 18 planned                                  |

## Remaining verification

Finish the earlier components' animation, interruption and variant checks against
the upstream demos and source. Preserve keyboard and reduced-motion behavior,
check controlled updates and record the scope of evidence with each change.
See [contributing](./CONTRIBUTING.md), the [porting notes](./docs/PORTING.md) and
[Phase 5 verification](./tests/phase5/VERIFICATION.md) for conventions and examples.

## Phase 6: charts

Port native SVG charts with in-view reveals and pointer interaction. Start with
LineChart and Sparkline because the planned hero block depends on them.

- Gauge
- SlopeChart
- Sparkline
- WaffleChart
- Treemap
- UsageMeter
- Ridgeline
- BarChart
- Streamgraph
- ActivityHeatmap
- DonutChart
- LineChart
- BrushChart

## Phase 7: blocks

Port 18 composed page sections once their component dependencies are verified:
LogoMarquee, PlanComparison, ComparisonTable, StatsBand, CtaSection, BlogGrid,
SignupForm, SiteFooter, FaqSection, EmptyStates, SignIn, NewsletterSignup,
ChangelogFeed, LoginCentered, ContactSection, PageHeader, SiteHeader and HeroSection.

## Distribution

The repository currently distributes source and a local gallery. An npm package
and a shadcn-compatible Svelte registry are not available yet. Retain the
[license and third-party notices](./THIRD_PARTY_NOTICES.md) when redistributing
source or preparing a release.
