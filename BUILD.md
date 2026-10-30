For your Web-Security-AI-Agent, I would build the frontend around one central idea: the user should be able to watch the AI investigate a website, understand why it is taking each action, and inspect the evidence behind its final verdict.

Your existing research architecture already supports this. The frontend should not look like a basic URL scanner that returns a red or green badge. It should feel like an interactive security investigation platform.

I'll preserve your research direction — Deception-Aware Autonomous Browser Agents for Active Behavioral Phishing Detection — including the temporal behavioral graph, information-gain exploration, cross-profile deception analysis, behavioral intent inference, and evidence-centric reporting.&#x20;

Pasted markdown.md



I'll also account for your existing backend choices: Hono.js + tRPC + your current Puppeteer implementation, with a cloud browser provider introduced behind an abstraction rather than rewriting everything immediately.

# 1. The product experience I recommend

[DarkInvader | External Attack Surface Management Platform](https://images.openai.com/static-rsc-4/lseA8FKRkNBOjwwycJTEo8jesI_aJTpz9HSC7JpgwOtapOZEITc_qiQbXZJnulnTLEVaxHE4ZxPM0sanu_ClRHgmUqJ06CzDQCcdeerYyCoqg7EjY9jd9ns3ziWLiI2AH9mu86Y9FiRhQbZjsLb-13M0IfvxJtECSOdZpxJ_fVY?purpose=inline)

01\. Investigation workspace

The user submits a URL, starts an investigation, sees its current status, and gets a live overview of the security analysis. The interface validates the URL and explains that the website will be opened in an isolated investigation environment.

[Off By One Security](https://images.openai.com/static-rsc-4/3Fyuh4GBKCbaf23ZJGoiIHGwOOs88_08XqRsos80Sf7-2cf1N3N6oouCtb7ZCWwH9jhUoREiIzOhUcKQYLeWbffEjAJu9QngVR23KjCiBLfMdO_unVVcWbkaM1Uk5AnZ_jBznF9UHyFxiW2K3F8mQfIKrw4peC-0ab3eblznQlI?purpose=inline)

02\. Live investigation graph

A React Flow graph activates nodes as real backend events arrive. The user can inspect each stage, its inputs, outputs, status, duration, and supporting evidence. The graph represents actual execution, not a fabricated animation.

[Getting Started with Session Replay](https://images.openai.com/static-rsc-4/J6dhFhT0gG9kc1uKFcUr0AssNBatZnhI-FgBBrNKLAERJAip5-vlatMRij4rmmcZBTFPZMlERQOViKSv4My9cd3vW4OwXYf5R7Nf4bAJ7BIeteRajpoJufXyreMYF-bDDrYHYH4PKG6MbkVULQE0LJkf4UzOVAL5zL5rvN_HiOo?purpose=inline)

03\. Browser session replay

The user can watch the investigator navigate the page, inspect screenshots, view its action timeline, and jump to interesting events such as suspicious redirects, login-form injection, or cross-origin requests.

[PhiShark - AI Phishing Analyst | PhiShark](https://images.openai.com/static-rsc-4/herPT3ThQDY-stCTQI_tesfKbPkuOZbebnnfC_GcrcEwG9mOjH6eHzlY9G_3adnBj4K1IfIk8XJPmbNUu5tIVL2SmcVXuiTyRmznVNWAIQ-jrwLMDBlJFz4ZgFn7so8RMz7GHO4ufcY8_n7oniJ_RpBOmoSKKnM8CSwLzvMfCBc?purpose=inline)

04\. Evidence and final assessment

Show phishing risk, cloaking risk, and agent-manipulation risk separately. Each score must be traceable to the evidence, graph events, and investigation actions that support it.

The differentiator is the connection between these four experiences. Clicking a suspicious event in the report should highlight the corresponding graph nodes and jump the replay to the relevant timestamp.

# 2. Cloud browser recording: yes, but choose the right provider

You remembered correctly. There are services that let your backend control a browser running in the cloud and provide a replay or video of what happened.

Here are the strongest candidates for this project, based on their documented capabilities.

[Session Recording - Browserbase Documentation](https://images.openai.com/static-rsc-4/FbtGJO7tB2SXTKTyGpKQaXUAOuuL1wy-U4vNO6T-cAOnbOGpnv9x8eUhA52TcblvPX9Ia2QeK2OC3OHDRZGlkHpzfFvWWg6_vXhi5u6jYhrYDu_kFvgVLbQqkrx_om2zkECW3GxsPpMp-v5jH7xkeBPTUgNkXrpNSEbQ90rLKV4?purpose=inline)

Browserbase — my first choice to evaluate

Provides cloud browser sessions and session replay. Its documented Session Replay API exposes HLS streams that can be embedded in a video player, which makes it particularly attractive for your investigation dashboard.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.browserbase.com\&sz=32)

Browserbase+1



Best fit: visual replay, session observability, multi-page navigation.

[Website](https://www.browserbase.com/?utm_source=chatgpt.com) · [Replay API documentation](https://dev.browserbase.com/blog/session-replay?utm_source=chatgpt.com)

[Session Replay | Browserless Documentation](https://images.openai.com/static-rsc-4/1xsnmg7aupIDjxZ6kPzyEhmRKnu_k5XkqoJRSYjnQyUIJ4MdgMXR0_G9Fa74H0kSHSfO0dtUIkRfa__sXdjx8QxLzH5eF21ySzBjAh_bAGDQq1lOC8OvnEFm0ZI-n5A6Z2wjiV_U2mhmxEd4HCN8P4Y3ZM-gmSWlfmSxB8ZqHN4?purpose=inline)

Browserless — especially suitable if you want to retain Puppeteer

Supports connecting existing Puppeteer automation to remote browsers, plus session replay and optional WebM screen recording. Recording features and availability depend on the connection mode and plan.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.browserless.io\&sz=32)

Browserless Documentation+2



Best fit: minimal changes to your current browser automation.

[Website](https://www.browserless.io/?utm_source=chatgpt.com) · [Screen recording guide](https://docs.browserless.io/examples/screen-recording?utm_source=chatgpt.com)

[Browser Run Changelog | Cloudflare Docs](https://images.openai.com/static-rsc-4/gPdq_-frcGFePhYaItYE37HaaC54IFxIwOvIWQm3bgENBmFVUahsuRBQX0UHMvhLnThi0FqUlSz6Glzi-eMec3BUCubp14LOXaKSo5NFit-xfets0qIcqJO6HqGgYwtR8agyl2xrnDiSnAk6OLaTF8d77IdGFnesV7jAWVn-kfg?purpose=inline)

Cloudflare Browser Run — worth considering for a Cloudflare-native deployment

Its documented session recording captures DOM changes, interactions and navigation as structured events, rather than a conventional video. That can be useful for an evidence timeline, but it is not equivalent to a video recording.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://developers.cloudflare.com\&sz=32)

Cloudflare Browser Run docs



Best fit: structured replay if your deployment is already Cloudflare-centric.

[Session recording documentation](https://developers.cloudflare.com/browser-run/features/session-recording/?utm_source=chatgpt.com)

My recommendation: prototype with Browserbase first if embedded video replay is a core requirement. Evaluate Browserless alongside it if keeping your current Puppeteer code nearly unchanged is the priority.

You do not necessarily need to replace Puppeteer. With a compatible cloud browser, you can keep your navigation, DOM inspection and interaction logic while changing how the browser session is created. For example, Browserless documents a `puppeteer-core` connection over a WebSocket endpoint.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.browserless.io\&sz=32)

Browserless Documentation+1



Keep in mind that a video recording, an interactive DOM replay, a screenshot timeline and a live browser view are four different things. Your architecture should support a replay capability without assuming every provider implements it the same way.

# 3. The exact frontend and backend architecture

I would organize the system around an investigation ID. Everything — graph events, browser session, recordings, evidence, risk scores and final report — belongs to that investigation.

URL submission

Validation · SSRF protection · investigation configuration

Hono.js + tRPC API

Create investigation · fetch status · authorize replay access

Investigation orchestrator

Static analysis

URL and page signals

Cloud browser

Puppeteer + provider adapter

Temporal graph

Nodes, edges, timestamps

Risk assessment

Evidence fusion and verdict

Persisted investigation events

Database + event stream + replay metadata + evidence artifacts

Live investigation dashboard

React Flow · browser replay · evidence explorer · final report

One important implementation detail: tRPC can provide the typed application API, while an event transport streams investigation progress. Use a tRPC subscription if your existing adapter supports it, or Server-Sent Events (SSE) through Hono. Persist events before publishing them so a reconnecting frontend can recover missed updates.

Also, a cloud browser is not automatically a safe sandbox. The backend must enforce URL and network restrictions, isolate sessions, and prevent the investigated page from reaching internal services or cloud metadata endpoints.

# 4. Copy-paste master prompt for your coding agent

The following prompt is designed for Cursor, Claude Code, Codex or another repository-aware coding agent. It instructs the agent to inspect your existing repository first and then implement the application without inventing a replacement architecture.

# Build Web-Security-AI-Agent: An Adaptive, Explainable Phishing Investigation Platform

Act as a senior full-stack engineer, security researcher, browser-automation engineer, and product designer. Build a production-oriented web application for my research project:

**Research title:** Deception-Aware Autonomous Browser Agents for Active Behavioral Phishing Detection

The application must let a user submit a website URL, watch an autonomous security investigator inspect the website in real time, understand the reasoning behind its investigative actions, inspect a live temporal behavioral graph, watch the browser session replay where supported, and receive an evidence-backed security assessment.

Do not build a conventional URL scanner with a single risk score. The main differentiator is an adaptive, closed-loop investigation system in which browser actions, observed behavior, temporal graph updates, and new evidence influence subsequent investigation decisions.

## 1. FIRST: Inspect the existing repository

Before changing any files:

1. Inspect the complete repository structure and identify the existing frontend, backend, database, authentication, browser automation, and deployment configuration.
2. Read package.json files, TypeScript configuration, environment variable examples, Hono application setup, tRPC routers, database schema, and existing Puppeteer code.
3. Identify which research pipeline components are already implemented and which are only planned.
4. Reuse existing modules, types, routers, database tables, components, and dependencies where practical.
5. Do not replace the existing application with a new scaffold or duplicate working implementations.
6. Preserve the current package manager, coding conventions, formatting, linting, and build commands.
7. Produce a short implementation plan and a list of existing components that will be reused.
8. Then implement the application in the repository, completing the end-to-end flow rather than stopping at a plan or mockup.

If a feature depends on an external provider or a model that is not configured, implement a clean interface and an explicit unavailable or simulated state. Never represent mock results as real security analysis.

## 2. Existing architecture and technology constraints

Preserve these architectural choices unless repository inspection reveals a concrete incompatibility:

- Frontend: use the existing framework and router.
- TypeScript throughout the application.
- React Flow / @xyflow/react for the interactive investigation graph, if compatible with the existing frontend.
- Hono.js for the backend HTTP application.
- tRPC for strongly typed client-server procedures.
- Existing database and ORM, if present.
- Existing Puppeteer implementation where useful.
- A cloud browser provider adapter for managed browser execution.
- SSE through Hono or a supported tRPC subscription for real-time investigation events.
- Existing authentication and authorization mechanisms.
- Existing deployment target and runtime constraints.

Do not add a second API framework, database, state-management library, or browser automation framework without a clear reason.

Pay particular attention to the deployment runtime. If the Hono backend runs in a Workers-style runtime, do not assume ordinary Node.js child processes, filesystem access, or direct browser launching are available. Browser execution may need to run through a managed provider or a separate compatible worker.

## 3. Product vision

The application should feel like a professional security investigation workstation.

A user submits a URL and sees the AI investigate it rather than simply waiting for a prediction.

The investigation has four connected surfaces:

A. Live investigation overview.\
B. Interactive temporal behavioral graph.\
C. Browser session replay and action timeline.\
D. Evidence explorer and final assessment.

These surfaces must share the same investigation ID and event data. Clicking a graph event should select the corresponding evidence. Clicking a replay event should highlight relevant graph nodes and open its associated evidence.

The UI must explain what the system has observed, what it is trying to establish, what action it selected, and how new observations affect the assessment.

Never expose hidden chain-of-thought or fabricate internal reasoning. Instead, provide concise, auditable explanations grounded in actual observations, action-selection metadata, policy rules, and recorded evidence.

## 4. Frontend pages and navigation

Implement the following pages using the existing routing system.

### 4.1 Investigation dashboard

Create a polished dashboard with:

- Product identity: Web Security AI Agent.
- Primary action: New Investigation.
- URL submission input.
- Recent investigations.
- Investigation status and last-updated time.
- Risk summary for phishing, cloaking, and agent-manipulation risk.
- Recent security findings.
- Failed or incomplete investigations.
- Filters for status, verdict, and time.
- A clear empty state for first-time users.

Each investigation should display its submitted URL, normalized hostname, creation time, current stage, progress status, and final verdict if available.

Never imply that a completed investigation guarantees a website is safe.

### 4.2 New investigation dialog or page

Provide a URL field with client-side and server-side validation.

Include configurable options:

- Investigation depth: Quick, Standard, Deep.
- Adaptive exploration: enabled by default.
- Differential execution: enabled where supported and appropriate.
- Browser session recording: enabled only when supported and permitted.
- Maximum investigation duration.
- Maximum browser actions.
- Optional user-selected browser profile variations.

Define these presets centrally and validate them on the backend. They must correspond to actual budgets and execution settings, not just UI labels.

Show a brief explanation of what will happen after submission.

Provide Start Investigation, Cancel, and validation feedback.

Do not accept arbitrary browser commands or user-provided JavaScript.

### 4.3 Investigation detail workspace

Build the primary investigation interface with these sections:

1. Overview.
2. Live Graph.
3. Browser Replay.
4. Network and Navigation.
5. DOM and Forms.
6. Differential Analysis.
7. Evidence.
8. Final Report.

Use tabs, resizable panels, or a well-organized workspace layout. On desktop, prioritize the graph and live investigation state. On smaller screens, stack panels and provide accessible navigation.

The page must be functional with real backend data and must handle loading, no-data, running, completed, failed, cancelled, and partially available states.

## 5. Live investigation graph using React Flow

This is the centerpiece of the application.

Use @xyflow/react with custom node types, animated active edges, a minimap, zoom controls, fit-to-view, a legend, and a contextual detail panel.

### 5.1 Pipeline-level graph

Represent the actual investigation pipeline with these stages:

1. URL Received and Validated.
2. Initial Static Risk Assessment.
3. Initial Confidence Evaluation.
4. Autonomous Investigator Browser.
5. DOM and JavaScript Observation.
6. Network and Navigation Observation.
7. Visual Observation.
8. Temporal Behavioral Graph.
9. Behavioral Intent Inference.
10. Information-Gain Action Selector.
11. Controlled Browser Action.
12. New Evidence Collection.
13. Temporal Graph Update.
14. Stopping Rule Evaluation.
15. Differential Execution and Deception Analysis, when enabled.
16. Evidence Fusion.
17. Phishing Risk Assessment.
18. Cloaking Risk Assessment.
19. Agent-Manipulation Risk Assessment.
20. Final Investigation Report.

Preserve the existing research architecture where it is already implemented.

The graph should reflect conditional execution. A high-confidence initial result may bypass unnecessary exploration if the actual backend policy permits it. Differential execution should run only when configured and supported.

Represent skipped stages as skipped, not completed.

### 5.2 Node states

Each pipeline node must support:

- Pending.
- Ready.
- Running.
- Completed.
- Warning.
- Failed.
- Skipped.

Use distinct visual indicators, subtle animation, and accessible status labels.

When the backend starts a stage, highlight that node. When it completes, persist the completed state. Animate an edge only when the corresponding transition or event actually occurs.

Never animate through the entire pipeline independently of backend execution.

### 5.3 Node detail panel

When a user selects a node, display:

- Stage name.
- Current status.
- Start and completion timestamps.
- Duration.
- Input summary.
- Output summary.
- Relevant configuration.
- Related evidence IDs.
- Related browser action IDs.
- Error details, if applicable.
- A concise explanation of what the stage established.

For the information-gain selector, show the actual candidate actions, their recorded scores or ranking metadata, the chosen action, the action budget remaining, and the selection rationale derived from recorded evidence.

Do not invent scores. If the algorithm does not yet calculate a score, show the actual ranking method or mark the metric as unavailable.

### 5.4 Evidence graph

In addition to the pipeline graph, implement a temporal behavioral evidence graph.

Node types:

- Page.
- DOM element.
- Script.
- Iframe.
- Domain.
- IP address.
- Network request.
- Form.
- Cookie.
- Storage object.
- Redirect.
- User or investigator action.
- Download.
- Permission.
- Browser profile.
- Security finding.

Edge types:

- Contains.
- Loads.
- Triggers.
- Redirects to.
- Communicates with.
- Submits to.
- Creates.
- Reads.
- Writes.
- Observed during.
- Diverges from.

Each graph event must retain timestamps and source information.

Use stable identifiers and incremental updates. Do not rebuild the entire graph from scratch after every event.

Support filtering by node type, edge type, time range, risk relevance, browser profile, and evidence category.

Selecting a node should open its details. Selecting an edge should show the associated action, timestamp, source and destination, and supporting observations.

Support graph search, fit-to-view, and highlighting of nodes related to a finding.

Large graphs should use filtering, incremental rendering, and sensible node limits.

## 6. Live event streaming

Create a typed, versioned event protocol shared between backend and frontend.

Events should include:

- investigation.created
- investigation.status_changed
- stage.started
- stage.completed
- stage.failed
- browser.session_started
- browser.navigation
- browser.action_started
- browser.action_completed
- browser.screenshot_available
- browser.recording_available
- dom.observed
- network.request_observed
- network.redirect_observed
- form.observed
- graph.node_upserted
- graph.edge_upserted
- evidence.created
- risk.updated
- differential.profile_started
- differential.profile_completed
- agent_manipulation.detected
- investigation.progress
- investigation.completed
- investigation.failed
- investigation.cancelled

Use the existing project's naming conventions if a compatible event protocol already exists.

Every event should include an investigation ID, unique event ID, schema version, timestamp, event type, and relevant payload.

Include sequence numbers or another reliable ordering mechanism.

Persist important events before publishing them. Implement reconnection and replay of missed events using a cursor or last-seen sequence number.

Use SSE or a supported tRPC subscription. Handle connection failures, reconnects, duplicate events, out-of-order events, and terminal states.

The frontend must derive its visible state from the actual events and persisted investigation snapshot.

If SSE is used, implement heartbeat handling, proper cancellation, authentication, and connection cleanup.

## 7. Adaptive autonomous investigation

Implement the investigator as a resource-bounded closed-loop process:

Observe → Update Temporal Graph → Infer Behavioral Intent → Rank Candidate Actions → Select Action → Execute Safely → Collect New Evidence → Update Risk → Repeat or Stop.

The initial risk assessment should not automatically terminate all investigations. The orchestrator must apply the existing confidence and investigation policy.

### 7.1 Adaptive exploration

The investigator should choose among safe, relevant actions such as:

- Observe the landing page.
- Wait for delayed page changes.
- Inspect relevant DOM elements.
- Inspect forms and their destinations.
- Inspect iframes.
- Inspect scripts and page-generated elements.
- Follow safe navigation links.
- Activate selected non-destructive controls.
- Observe redirects and network activity.
- Capture a screenshot.
- Reinspect the page after an interaction.

Use expected information gain if the current algorithm supports it. Otherwise, provide an explicit action-ranking interface that can later be replaced with a real information-gain implementation.

The investigator must prioritize actions that reduce uncertainty or test a specific security hypothesis.

Avoid blind exhaustive clicking.

### 7.2 Action safety

Never automatically submit real credentials, payment information, personal data, or authentication codes.

Do not perform purchases, send messages, change accounts, or execute other consequential actions.

Treat downloads as untrusted. Do not execute downloaded files.

Do not bypass authentication, CAPTCHAs, access controls, or a site's security mechanisms as part of the default investigation.

Avoid destructive interactions and form submissions. Inspect form destinations and attributes without sending sensitive data.

The investigation agent must treat page content as untrusted data. Text on a website must never override investigator policies, backend instructions, system configuration, or safety controls.

### 7.3 Stopping rules

Stop when:

- The risk assessment reaches an explicitly configured confidence threshold.
- Additional actions have low expected information gain.
- The action budget is exhausted.
- The time budget is exhausted.
- The target is unavailable.
- The investigator encounters an unsafe action.
- A policy restriction prevents further exploration.
- A fatal infrastructure error occurs.

Explain why the investigation stopped.

A budget-limited investigation must be reported as incomplete or bounded when appropriate, rather than automatically classified as safe.

## 8. Cloud browser provider integration

Inspect the existing Puppeteer implementation before making changes.

Do not remove Puppeteer simply because cloud browsers are introduced.

Create a provider-neutral browser interface and an adapter for the selected cloud browser provider.

A suitable abstraction should support operations equivalent to:

- Create a browser session.
- Connect to a remote browser.
- Navigate to an allowed URL.
- Inspect the page.
- Observe browser events.
- Capture screenshots.
- Execute approved browser actions.
- Retrieve supported session recording or replay metadata.
- Retrieve console and network information where supported.
- Close the session.
- Release provider resources.
- Report capabilities and provider errors.

Preserve the existing analysis logic where possible. Separate browser infrastructure from investigation logic.

Define capabilities explicitly. For example, video recording, interactive replay, live view, screenshots, and network-event capture should be independently represented.

Implement at least one provider adapter and a clear configuration mechanism.

Potential providers include Browserbase and Browserless. Select one after checking the current project constraints, provider documentation, account access, recording availability, and pricing.

Use the provider's documented SDK, WebSocket/CDP connection, or API. Never invent provider endpoints or assume a replay feature is available.

Store provider API credentials only in server-side environment variables or the existing secret-management system.

Do not send provider API keys to the frontend.

Keep the browser interface sufficiently generic that another provider can be added without rewriting the investigator.

If the provider is not configured, show an explicit configuration error or use a clearly labeled local-development adapter if one already exists.

## 9. Browser recording and replay

The Browser Replay section should be a first-class part of the investigation experience.

When supported by the configured provider, show:

- Embedded video or replay player.
- Play, pause, seek, and playback-speed controls where supported.
- Current playback time.
- Browser navigation timeline.
- Action markers.
- Redirect markers.
- Suspicious form and DOM mutation markers.
- Network activity markers.
- Screenshots associated with important events.
- A synchronized event log.
- Browser console errors where available.

Clicking a timeline event should seek to its timestamp when the replay format permits it and select the associated evidence.

If the provider supplies an HLS playlist, integrate a compatible HLS player using an authenticated backend access route.

If it supplies a WebM recording, use the native video element where appropriate.

If it supplies DOM-based replay, use its supported replay mechanism instead of pretending it is a video file.

If only screenshots are available, provide a timestamped screenshot timeline.

Do not claim that recording is available until the provider confirms the session recording or replay artifact exists.

Handle delayed recording availability, missing recordings, expired replay links, multi-tab sessions, and provider errors.

Generate short-lived authorized access to replay resources where supported. Do not expose long-lived provider credentials or unrestricted signed URLs.

Mask secrets and sensitive input values. Apply a retention policy to recordings, screenshots, DOM snapshots, network payloads, and other artifacts.

## 10. Network, DOM, and navigation inspectors

Provide dedicated views for observed network requests, redirects, forms, DOM changes, and browser actions.

For network requests, display only captured fields that are actually available:

- Timestamp.
- Method.
- Host and path, with sensitive query parameters redacted.
- Resource type.
- Initiator, when available.
- Status code, when available.
- Redirect chain.
- Duration, when available.
- Security-relevant annotations.
- Related evidence IDs.

Do not store authorization headers, session cookies, tokens, passwords, or full sensitive request bodies by default.

For forms, show:

- Form identifier.
- Input types.
- Form action URL.
- HTTP method.
- Same-origin or cross-origin classification.
- Whether submission was blocked by policy.
- Associated evidence.

For redirects, show the sequence of destinations and the reason the transition is security-relevant.

Provide filters, expandable details, empty states, and timestamps.

## 11. Differential execution and deception analysis

When enabled, allow the orchestrator to execute controlled sessions under approved browser profiles.

Represent the same URL being evaluated under Profile A, Profile B, and Profile C.

Possible controlled variations include viewport, locale, user-agent configuration, or other documented and ethically appropriate environmental parameters.

Do not claim to have tested multiple profiles if only one session actually ran.

For each profile, record:

- Profile configuration.
- Navigation trace.
- DOM observations.
- Network observations.
- Browser action sequence.
- Relevant screenshots.
- Temporal graph updates.
- Findings.

Compare the traces and display observed divergence in:

- DOM structure.
- Network destinations.
- Navigation.
- Action outcomes.
- Visual state, where measured.

Show a divergence score only if it is actually calculated by the backend. Display its method and contributing signals.

High divergence must trigger additional investigation or a warning; it must not automatically prove maliciousness.

Make the comparison visual through synchronized timelines, a side-by-side observation view, and highlighted graph differences.

## 12. Risk assessment and evidence-centric reporting

The final report must contain three separate assessments:

1. Phishing risk.
2. Cloaking or environment-dependent behavior risk.
3. Agent-manipulation risk.

For each assessment, show:

- Risk category.
- Score or confidence, if available.
- Severity label.
- Explanation.
- Supporting evidence.
- Contradicting or inconclusive evidence, where available.
- Investigation actions that produced the evidence.
- Limitations and missing observations.
- Recommended next steps.

Keep risk, model confidence, and investigation completeness conceptually separate.

Do not label a score as a calibrated probability unless calibration has actually been implemented and evaluated.

The report should also show:

- Final verdict.
- Investigation duration.
- Number of browser actions.
- Number of redirects.
- Number of observed network events.
- Number of graph nodes and edges.
- Profile count actually executed.
- Recording status.
- Stopping reason.
- Detection limitations.

Support exporting a report as JSON and, if compatible with the existing project, a downloadable PDF.

Every important conclusion must link to supporting evidence. Avoid unsupported explanations and invented findings.

## 13. Hono.js and tRPC backend

Preserve the current backend structure and existing router conventions.

Implement or extend typed procedures equivalent to:

- createInvestigation
- getInvestigation
- listInvestigations
- cancelInvestigation
- getInvestigationEvents
- getPipelineState
- getBehavioralGraph
- getEvidence
- getNetworkEvents
- getBrowserActions
- getDifferentialAnalysis
- getFinalReport
- getRecordingMetadata
- getAuthorizedReplayAccess

Use names consistent with the existing project where possible.

The backend must own all investigation state transitions, action selection, risk updates, browser execution, and final verdict generation.

Validate all inputs using the existing validation library or a suitable schema validator.

Add authorization checks for every investigation and artifact access.

Use the existing database and ORM to persist:

- Investigation records.
- Investigation configuration.
- Pipeline stage states.
- Browser sessions and provider references.
- Ordered investigation events.
- Temporal graph nodes and edges.
- Evidence records.
- Browser actions.
- Network and navigation observations.
- Differential execution results.
- Risk assessments.
- Recording metadata.
- Final reports.
- Error and cancellation information.

Avoid storing huge binary recordings or screenshots directly in ordinary relational rows. Use provider-managed storage or suitable object storage, retaining metadata and authorized references in the database.

Make background execution independent of a single frontend connection. Closing the dashboard must not silently terminate a valid investigation.

Use the existing job infrastructure if one exists. Otherwise, implement a runtime-compatible queue or durable execution mechanism appropriate to the deployment environment.

Ensure cancellation actually signals the orchestrator and releases browser resources.

Make operations idempotent where practical and handle duplicate events, provider retries, timeouts, partial failures, and cleanup.

## 14. Security requirements

This is a web-security research application, so its own infrastructure must be designed defensively.

Implement strict server-side URL validation and SSRF protections.

- Accept only permitted HTTP and HTTPS URLs.
- Reject localhost, private and link-local addresses, loopback addresses, cloud metadata endpoints, and prohibited IP ranges.
- Resolve hostnames and validate the resulting addresses.
- Revalidate destinations after redirects and DNS resolution changes.
- Block access to internal services at the network or egress layer as well as in application logic.
- Prevent redirects from bypassing URL restrictions.
- Do not trust DNS resolution performed only before navigation.
- Do not allow arbitrary user-supplied JavaScript to execute in the browser.
- Do not expose internal backend addresses or cloud credentials to the investigated page.
- Isolate browser sessions and apply resource, duration, and concurrency limits.
- Prevent one user from accessing another user's investigations or recordings.
- Rate-limit investigation creation.
- Redact sensitive information in logs and evidence.
- Keep secrets out of browser bundles and API responses.
- Handle untrusted page content as data, not instructions.
- Apply appropriate content security and response security headers to the application's own frontend.

A URL validation helper alone is not sufficient SSRF protection. Enforce network-level egress restrictions and account for DNS rebinding, redirects, alternate IP encodings, and provider networking behavior.

Never automatically execute downloaded files or submit real credentials during a phishing investigation.

## 15. Database and lifecycle design

Reuse existing database tables and migrations wherever possible.

If the project does not yet have an appropriate schema, design normalized entities with stable IDs and timestamps.

At minimum, model:

- Investigation.
- InvestigationEvent.
- PipelineStage.
- BrowserSession.
- BrowserAction.
- GraphNode.
- GraphEdge.
- Evidence.
- NetworkObservation.
- DifferentialRun.
- RiskAssessment.
- RecordingArtifact.
- FinalReport.

Choose JSON fields only for genuinely flexible provider payloads or event-specific metadata. Keep commonly queried fields indexed and structured.

Define valid status transitions.

For example:

queued → initializing → analyzing → completed

Also support failed, cancelled, and incomplete terminal states where appropriate.

Ensure event persistence and investigation state remain consistent. Add pagination to event and evidence queries.

## 16. UI design and interaction quality

Use the existing component system. If no established design system exists, build reusable components with the project's existing styling framework.

Design for a dark, high-contrast security workstation with restrained accent colors, clean typography, subtle motion, and readable technical data.

Use color as a supplement to status icons and text, not as the only signal.

Prioritize:

- Clear hierarchy.
- Real-time status visibility.
- Accessible controls.
- Keyboard navigation.
- Useful tooltips.
- Loading skeletons.
- Error recovery.
- Empty states.
- Responsive layouts.
- Reduced-motion support.
- Consistent timestamps.
- Copyable URLs and evidence identifiers.
- Useful hover and selection states.
- A clean distinction between observations, hypotheses, and confirmed findings.

Avoid excessive glowing borders, unnecessary animation, decorative gauges, and large empty cards.

The application should feel like a serious security analysis product rather than a generic AI landing page.

## 17. State management and data flow

Inspect the current frontend data-fetching and state-management libraries before adding dependencies.

Keep server state, live event state, and local UI state separate.

Server state includes persisted investigations, reports, evidence, and graph snapshots.

Live event state includes newly received investigation events and incremental graph changes.

Local UI state includes active tab, selected node, graph filters, replay position, and open detail panels.

Implement stable graph IDs, deduplication, incremental node and edge updates, and recovery from reconnects.

On opening an investigation, fetch its persisted snapshot and the latest event cursor before subscribing to updates. Ensure the subscription cannot create a gap between the snapshot and live events.

Use server data as the source of truth. Do not derive a final verdict from frontend animation or local mock calculations.

## 18. Testing requirements

Add tests using the existing testing stack.

Cover:

- URL validation.
- SSRF and redirect restrictions.
- Investigation creation and authorization.
- Valid and invalid lifecycle transitions.
- Event ordering and deduplication.
- Reconnection and missed-event recovery.
- Graph node and edge updates.
- Adaptive action selection and stopping rules.
- Differential trace comparison.
- Risk assessment rendering.
- Browser provider errors and timeouts.
- Recording availability and replay authorization.
- Cancellation and browser cleanup.
- Sensitive-data redaction.

Provide integration tests using a controlled local test website with synthetic scenarios:

1. A benign static page.
2. A page that injects a form after a delay.
3. A page that redirects after an approved interaction.
4. A page with a cross-origin form destination.
5. A page with different content under controlled profiles.
6. A page containing text that attempts to manipulate the investigator.
7. A page that fails to load or times out.

Use controlled, isolated test infrastructure. Do not perform real credential submissions or attack unrelated websites.

## 19. Environment configuration and documentation

Update the existing environment example and documentation.

Document the required variables for:

- Database connection.
- Cloud browser provider.
- Provider API key.
- Provider region or project settings, if applicable.
- Recording configuration.
- Event transport.
- Storage configuration.
- Investigation budgets.
- Allowed and blocked URL policies.
- Logging and retention.

Never commit secrets.

Explain how to configure the provider, start the frontend and backend, run database migrations, run tests, and execute a local end-to-end investigation against the synthetic test website.

Document which features work without a cloud provider and which require external credentials.

## 20. Acceptance criteria

Do not consider the implementation complete until these conditions are met:

1. A user can submit a URL and create an investigation.
2. The backend validates the URL and applies SSRF protections.
3. The investigation executes independently of the dashboard connection.
4. The frontend receives real-time status updates.
5. The pipeline graph activates nodes based on actual backend events.
6. The temporal evidence graph updates incrementally.
7. Users can inspect graph nodes, edges, timestamps, and associated evidence.
8. The investigator selects actions using the configured adaptive policy and budget.
9. Unsafe browser actions are blocked.
10. Browser execution works through the configured provider adapter.
11. Recording or replay is displayed only when genuinely available.
12. Network observations, redirects, forms, and browser actions are inspectable.
13. Differential execution shows only profiles that were actually run.
14. The final report separates phishing, cloaking, and agent-manipulation assessments.
15. Conclusions link to their supporting evidence.
16. Failed, cancelled, incomplete, and unavailable states are handled correctly.
17. Events and investigation state survive page refreshes and reconnects.
18. Authentication, authorization, redaction, resource limits, and cleanup are implemented.
19. Existing project builds, types, lint checks, and tests remain healthy.
20. The end-to-end workflow works against a controlled test website.

## 21. Implementation workflow

Implement in small, coherent stages:

Phase 1: Repository audit, architecture plan, and dependency assessment.

Phase 2: Investigation domain types, database persistence, lifecycle, and event protocol.

Phase 3: Hono/tRPC API and durable investigation execution.

Phase 4: Cloud browser adapter and secure browser execution.

Phase 5: Live event transport and dashboard state management.

Phase 6: Investigation workspace and pipeline graph.

Phase 7: Temporal evidence graph, inspectors, and synchronized replay.

Phase 8: Adaptive investigation, differential analysis, and evidence-based reporting.

Phase 9: Security hardening, testing, documentation, and end-to-end verification.

At the end of each phase, run the relevant type checks, linting, tests, and build commands.

Do not stop after implementing the frontend. Wire the UI to the actual backend, event stream, browser adapter, persistence layer, and report generation.

If a feature cannot be completed because an external credential, provider account, existing algorithm, or deployment capability is missing, implement the integration boundary, identify the missing dependency, and report precisely what remains unverified.

**Final objective:** deliver a working, adaptive, explainable web-security investigation platform in which the user can see what the autonomous browser investigator observes, which action it chooses next, how the temporal behavioral graph evolves, what the browser actually did, and why the resulting security assessment is justified by the available evidence.

# 5. Three design decisions I would prioritize

These are the improvements that make the frontend more than a visualization layer.

## A. Two connected graphs, not one overloaded graph

Investigation pipeline

Answers: What is the AI doing right now?

Initial assessment

Investigation

Evidence fusion

Temporal behavioral graph

Answers: What did the website actually do?

Page

Form

External destination

The pipeline graph is relatively small and easy to understand. The evidence graph can grow as the investigation discovers pages, forms, scripts, requests, redirects and interactions. Keeping them separate avoids turning the main interface into an unreadable graph.

## B. Make the investigator's next action understandable

When the investigator decides to inspect a login form, the interface could show:

### Next action selected

Investigating

Inspect form destination

Objective: determine whether the observed login form sends data to a different origin.

Reason for selection

Relevant unresolved hypothesis

Action budget remaining

Display actual backend value

Result

Pending observation

The important distinction is that the explanation must come from the investigator's actual action-selection metadata. Do not show made-up information-gain scores simply to make the interface look intelligent.

## C. Synchronize evidence with the browser replay

This is the most compelling demonstration feature for your research.

For example, the user clicks a suspicious redirect in the event timeline. The application should:

1. Seek to the corresponding replay time, if supported.
2. Highlight the redirect edge in the temporal graph.
3. Open the network event details.
4. Show the source and destination URLs, with sensitive parameters redacted.
5. Display why the event contributed to the risk assessment.

That turns the investigation into an explainable, traceable workflow rather than just a video and a score.

# 6. The implementation order I would use

Do not try to implement every advanced feature in the first pass. Build the vertical slice first.

1. URL → persisted investigation → live pipeline graph

   Establish the complete frontend/backend event loop and lifecycle.
2. Cloud browser → real observations → temporal graph

   Connect your existing Puppeteer logic to the provider and persist actual browser events.
3. Browser replay → synchronized evidence

   Add the provider's actual replay mechanism and link it to recorded actions and graph events.
4. Adaptive exploration → differential execution

   Add information-gain selection, controlled profiles, divergence analysis and budget-aware stopping.
5. Evidence fusion → final report

   Finish the three risk assessments, evidence traceability, limitations and export functionality.

One final recommendation: before the coding agent starts implementing the cloud integration, have it inspect your current Puppeteer code and identify exactly where the browser is launched. That is usually the cleanest boundary for introducing a provider adapter without rewriting your existing investigation logic.

The target experience is simple: a user submits a URL, watches the investigation unfold, can inspect the browser's actions and evolving graph, and receives a verdict that is traceable to actual evidence.