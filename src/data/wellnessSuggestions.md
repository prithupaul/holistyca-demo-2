# Nutrition and wellness suggestion library

`wellnessSuggestions.json` is a plain JSON array of 56 suggestions. Every one of the 47 current questionnaire IDs has at least one relevant suggestion. `wellnessSuggestionSources.json` records the two supplied PDFs and 17 public references. `wellnessSuggestions.schema.json` defines the data shape and allowed tags.

Each record has a stable `id`, a short `title`, display-ready `suggestion` text, questionnaire links, relevance rules, three tag arrays, an audience, a priority, context notes and source references. Each suggestion has at most one tag of each type, for a maximum of three tags total. Nonspecific and overlapping time tags are omitted. The For you screen selects suggestions from the normalized questionnaire answers without changing questionnaire scoring. Suggestions appear as speech bubbles with their context notes and icon-bearing tag pills. Time tags are blue, event tags green, and category tags yellow. Selecting multiple tags keeps only suggestions matching every selected tag. Filters persist across screen navigation for the current session; a new login resets them. Bubbles pop in on the first visit and after filter changes, but do not replay when returning to the screen.

## Tag conventions

- `timeOfDay`: `morning`, `day`, `evening`, or `night`. `day` groups daytime nutrition, movement and work routines; waking-related suggestions use `morning`. The array may be empty when there is no specific time of day. These are flexible display contexts, not clock-based deadlines.
- `events`: `cooking`, `meals`, `exercise`, `shopping`, `planning`, `work_break`, `driving`, and `procedure`. Meal planning, snacks and drinks are grouped under meals; dinner-specific timing uses evening. The complete allowed list is in the schema. Event tags can be empty; bedtime, pre-exercise and care-appointment tags are omitted.
- `categories`: `dietary`, `lifestyle`, `sleep`, `medical_follow_up`, and `safety`. Exercise, stress management, environment and self-monitoring are consolidated into lifestyle; suggestions retain their primary category, with safety and medical follow-up taking precedence where present.

Time and event tags help decide when to present an already relevant suggestion. They do not establish whether the person needs it. The questionnaire does not collect actual wake times, bedtimes, cooking times or exercise schedules.

## Relevance rules

Use the normalized `user.answerMap`, rather than free-text transcript strings. A record matches when at least one `anyOf` condition is true, every `allOf` condition is true and no `excludeIf` condition is true. Empty `allOf` and `excludeIf` arrays add no constraints. `questionIds` describe the inputs used, including dependencies; they do not independently trigger suggestions.

Unknown, absent and `not_applicable` answers must not match. In particular, an absent or null dietary checklist must not be treated as an empty checklist; a known empty checklist does mean no listed dietary components were selected. Dependent rules need valid dependent inputs before matching.

| Operator | Meaning |
| --- | --- |
| `risk_positive` | The applicable question's `evaluate(answerMap)` returns exactly `true`, using the existing app rules. This also applies to supporting STOPBANG indicators that may not independently add section points. |
| `equals` | A normalized answer exactly equals `value`. |
| `gt`, `gte` | A numeric answer is greater than / at least `value`. For time answers, compare valid `HH:mm` values by minutes since midnight. |
| `not_contains` | A known checklist answer does not include the specified component. |
| `bmi_category_increased` | For `previous_weight`, current weight and height produce a higher BMI category than the previous weight at the same height. This mirrors the app's weight-change rule. |
| `bmi_below` | For `body_measurements`, calculated BMI is below `value`, using valid height and weight. |
| `weight_decreased` | Current weight is lower than `previous_weight`; this is separate from risk scoring and does not assume intentional weight loss. |

`audience: adults` requires a known age of at least 18 before automated selection. `all_ages` records are care coordination or safety messages, not adult calorie, fluid or exercise prescriptions. Unknown age does not establish adulthood. `priority` is a presentation order: safety first, then important, then routine. A routine suggestion must not crowd out applicable care or driving-safety messages.

## Context and source handling

`contextNotes` contain qualifications that must accompany a suggestion or be used to adapt it before displaying it. They are not executable exclusion rules. The dataset is not a clinical triage or treatment engine. Current pregnancy, medicine details, allergies, prescribed fluid limits and exercise capacity are not fully collected; do not infer them from questionnaire flags. No record changes medicines, oxygen or PAP settings.

Source references resolve to the separate source registry. PDF references include one-based page numbers. Public sources include URLs and the access date. The questionnaire-to-suggestion mapping and event tags are editorial choices for this app, rather than rules directly prescribed by the reference documents.

The nutrition PDF's mindful eating and balanced-plate ideas and the wellness PDF's section-specific habits have been paraphrased. Where the PDFs offer differing percentages, this library uses the simple half-vegetable, quarter-protein, quarter-grain plate example, adapted to personal needs. Their scoring weights and thresholds do not override the app's current scoring.

Fixed three-litre fluid targets, a universal 7 pm food cutoff, automatic praise for weight loss, fat loss from targeted exercises, male-specific high-protein diets and unsupported thyroid-hormone explanations have not been carried into the catalog. Hydration follows individual needs; kidney advice is individualized; diabetes meal timing follows the medication plan; reflux timing is relative to lying down. These adaptations draw on [NIDDK kidney guidance](https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease), [NIDDK diabetes guidance](https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes), and [NIDDK reflux guidance](https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition).
