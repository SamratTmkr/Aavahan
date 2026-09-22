# Usability evaluation — System Usability Scale (SUS)

For the user acceptance testing in Section 7.2 of the report.

The SUS is Brooke's ten-statement questionnaire. Cite it as:

> Brooke, J. (1996) 'SUS: a "quick and dirty" usability scale', in Jordan, P.W., Thomas, B.,
> Weerdmeester, B.A. and McClelland, I.L. (eds.) *Usability Evaluation in Industry*.
> London: Taylor & Francis, pp. 189–194.

---

## Before the session

Each participant is told the purpose of the study, gives consent, and is told they may stop
at any time. Responses are anonymised — record participants as P1, P2, P3 and so on, never
by name. Nothing here should be filled in by anyone who did not actually run the session.

Record for each participant: cohort (university student / general public / organiser),
device used, and whether they had used a similar platform before.

---

## Part 1 — Task list

Ask the participant to think aloud. Record whether each task was completed **unaided**,
**completed with a hint**, or **not completed**, plus the time taken.

| # | Task | Success criterion |
|---|---|---|
| 1 | Find an event happening in Kathmandu | Reaches a filtered list showing Kathmandu events |
| 2 | Find an event whose date is not confirmed yet | Identifies an event marked "Date TBA" |
| 3 | Create an account | Reaches a logged-in state |
| 4 | Register for an event and confirm you are registered | Sees the confirmation and their place in My Activities |
| 5 | Cancel that registration | Event no longer appears as joined |
| 6 | Ask the organiser a question about an event | Posts a comment on the event page |
| 7 | Create an event whose date is not yet decided | Publishes an event with "Date to Be Announced" set |
| 8 | Tell your attendees the venue has changed | Posts an announcement on their own event |
| 9 | Find the check-in code for a ticket you hold | Opens the ticket QR / code on My Activities |
| 10 | Recover access after forgetting your password | Requests a reset link from the login page |

Task completion rate = unaided completions ÷ total tasks attempted, expressed as a percentage.

---

## Part 2 — The SUS questionnaire

Give this immediately after the tasks, before any discussion. Scale:
**1 = Strongly disagree … 5 = Strongly agree.** Every statement must be answered.

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | I think that I would like to use this system frequently | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | I found the system unnecessarily complex | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | I thought the system was easy to use | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | I think that I would need the support of a technical person to be able to use this system | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | I found the various functions in this system were well integrated | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | I thought there was too much inconsistency in this system | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | I would imagine that most people would learn to use this system very quickly | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | I found the system very cumbersome to use | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | I felt very confident using the system | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | I needed to learn a lot of things before I could get going with this system | ☐ | ☐ | ☐ | ☐ | ☐ |

Two open questions afterwards, for the qualitative findings:

- What was the most confusing part of using Aavahan?
- What would make you choose this over a Facebook page and WhatsApp?

---

## Part 3 — Scoring

SUS is **not** a percentage. The result is a score out of 100 on its own scale.

1. Odd-numbered statements (1, 3, 5, 7, 9): contribution = **response − 1**
2. Even-numbered statements (2, 4, 6, 8, 10): contribution = **5 − response**
3. Add the ten contributions (gives 0–40)
4. Multiply by **2.5** → the participant's SUS score (0–100)

Report the **mean across participants**, with the standard deviation and the number of
participants. Interpretation, following Bangor et al. (2009) and Sauro:

| Score | Reading |
|---|---|
| Below 51 | Poor — serious usability problems |
| 51 – 67 | Marginal |
| 68 | The established average |
| 68 – 80 | Good |
| Above 80 | Excellent |

To score the responses, put them in `sus-responses.csv` (one row per participant, ten
columns `q1`–`q10`) and run:

```bash
node docs/score-sus.mjs docs/sus-responses.csv
```

---

## Part 4 — Recording the results

Fill this in **only with real numbers from real sessions.** Leave it blank until then.

| Participant | Cohort | Tasks unaided | SUS score |
|---|---|---|---|
| P1 | | / 10 | |
| P2 | | / 10 | |
| P3 | | / 10 | |
| P4 | | / 10 | |
| P5 | | / 10 | |
| **Mean** | | | |

Suggested minimum: five participants per cohort. Nielsen's rule of thumb is that five users
surface most usability problems, though for a stable SUS *mean* more is better — say so as a
limitation if your sample is small.
