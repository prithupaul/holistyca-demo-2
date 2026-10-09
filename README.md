# Holistyca mobile web demo

For web hosting setup and upload instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

Run `npm install` and `npm run dev`. `npm run build` creates the production bundle; `npm test` checks questionnaire logic and persistence.

## Questionnaire and storage

- `src/questions.js`: 47 question definitions across four sections (44–47 are asked, depending on meal and diabetes follow-ups).
- `src/classes/Question.js`: one primary system tag, related systems, input validation, applicability, answer formatting, and risk-positive evaluation.
- `src/classes/User.js`: identity, answer history, timestamps, recalculated scores, and local storage persistence under `holistyca.osa.user.v1`.
- `src/domain/scoring.js`: section inferences, weighted core subtotal, BMI changes, and system percentages.
- `getQuestion` and `submitAnswer` are the local service boundary for future API integration. Answers are saved before the next question is shown. Reloading resumes at the next unanswered applicable question.

Each saved answer records its question ID, section, primary system, normalized value, timestamp, and recalculated risk-positive status. Scores are recomputed on restoration rather than trusted from storage. Unknown and not-applicable responses advance the questionnaire but are excluded from percentage denominators.

## Interpretation of the supplied document

These custom rules implement the supplied document; they are not a validated diagnostic tool or a probability of OSA. Section point scores remain separate. The Home card's overall OSA risk label is the most severe achieved section classification, as requested: high, moderate, or low (below threshold). Pending, inconclusive, and unconfigured sections do not count as low. Before any classification is available, the card shows a dash and invites the user to answer questions. Partial results are labeled as such.

- Each question has **one primary tag**, as requested. Multiple systems named in the document are preserved in `relatedSystems` without double-counting. Primary tag choices, including those for untagged age/sex and Part 4 conditions, are provisional implementation assignments.
- A system's positive rate is `positive indicators / known evaluated indicators × 100`. Its contribution share is `system positives / all positives × 100`. Neither is a clinical estimate of causal contribution. Unanswered, unknown, dependent-but-unscorable, and not-applicable answers are excluded. Follow-ups supporting a parent indicator are not extra points.
- Core evaluation uses the supplied BMI boundary (25 or more), age 50 or more, neck 40 cm or more, and male sex. Supporting hypertension/age/sex only score when a primary core symptom or measurement is positive. Their raw positives remain visible. Snoring + fatigue + observed apnea produce strong suspicion even at 3 points.
- Specified core weights are recorded separately: snoring 10; fatigue 9 with snoring + observed apnea, otherwise 7; observed apnea 10; hypertension 9 if resistant, otherwise 6; BMI 6 at 25–30, 10 above 30; age 5; neck 8. Results recalculate when resistant hypertension is answered in Part 4. No male weight, female-snoring reduction, age multiplier, or weighted-score classification thresholds were supplied, so none are invented.
- BMI categories use continuous boundaries: below 18.5, 18.5–<25, 25–<30, 30–<35, 35–<40, and 40+. Any upward category change is positive. Missing current measurements make the comparison unknown.
- Part 2 has four indicators: BMI category increase, waist, waist-to-hip ratio, and meal pattern. For more than four meals, late-night snacks/heavy evening meals **or** a last meal strictly after 22:00 make the meal pattern positive. This combines the follow-ups into one indicator so 3/4 thresholds remain meaningful; the snack interpretation is an implementation assumption.
- Bedtime consistency is asked as variability in hours so the >2-hour boundary can be applied. Diet is one indicator, positive if any of the four listed components is missing. HbA1c uses the supplied >5.5% boundary. Medication-controlled diabetes and abnormal HbA1c are kept as separate answers; there is no prescribed numerical override of the diabetes question.
- Insulin is asked only when diabetes is confirmed. Meal follow-ups are asked only for more than four meals. Relevant questions offer “Not applicable”; numeric and yes/no questions offer an unknown answer.
- Part 4 contains 24 indicators and uses the corrected thresholds: 0–3 positive responses are below threshold, 4–9 are moderate risk, and 10 or more are high risk. This classification also contributes to the overall result.
- Photo/ML evaluation was a future suggestion in the document and is not implemented in this questionnaire.

The dashboard shows provisional results as answers arrive. Restarting replaces only this demo's saved user object after an in-app confirmation.

## Evaluation widget

`src/components/EvaluationWidget.jsx` provides a reusable rectangular card for Home, Dashboard, and recommendations. Its props are `title`, optional `icon`, `value` (text, number, percentage string, or React node), optional `valueLabel`, `description`, `percentage` (0?100, or null when not evaluated), `chartLabel`, `link` (`{ label, href?, onClick? }`), and `tone` (`neutral`, `high`, `moderate`, or `low`). Corner radius follows the shared 1rem default. Home's first instance is Overall OSA risk, with a learn-more link to Dashboard.

## Quick demo profiles

The user icon appears in the header on every screen. Its menu always includes **Log out** (a placeholder with no action) and **Clear data**, which removes the saved answers and evaluations and opens Chat at question one. Only Chat also offers **Answer all questions** and **Answer some questions**. Both replace the current saved user with a new randomly generated profile. Full profiles answer every applicable question; partial profiles answer a sequential 25–50% prefix so the chat can continue normally. Conditional follow-ups and input validation are respected. Generated measurements use typical demo input ranges, not clinical distributions. Demo actions play through Chat one question at a time: a 250ms loading indicator, then the full question for 250ms before submitting its random answer. Each answer and its updated scores are saved as they arrive. Answer controls and demo menu actions are disabled during playback; leaving Chat stops playback and preserves progress. The generator is in `src/domain/demoProfiles.js`.

Evaluation charts are single horizontal 0.5rem bars on a Google blue track. Fill is green through 33%, yellow through 67%, and red above 67%. Section percentages use scored points divided by available indicators; the overall percentage is the highest available section percentage. These percentages describe evaluation indicators, not the probability of OSA.

## Local demo accounts

New sessions begin at Log in with a Sign up option. Sign up requires only name, username and password; all evaluation questions, including age and biological sex, are answered in Chat. New accounts start with zero questionnaire answers. Accounts and their individual chat progress are kept in local storage. Passwords are stored as entered for this local demo; this is not production authentication. Clear data preserves account credentials while removing all questionnaire answers and evaluations, then returns to Home. Log out clears the active session while preserving the saved account and chat progress.

Chat questions have a default text answer field above their structured controls. Choices and multiple diet selections use inline pills; numbers, measurements and time retain their dedicated inputs. Typed answers are preserved in the transcript and storage. Unambiguous choices and values are normalized for scoring; other free text is retained as an unknown, unscored answer.
