# Nine-Page Scanned PDF Extraction Accuracy Test — 2026-08-15

## Test design

The test input is a 1.29 MB raster PDF with nine pages. Every page contains two unique, clearly printed English MCQs with four options and a marked correct answer. The controlled source inventory therefore contains **18 unique questions** across pages 1–9.

The live run uses **literal extraction mode**, so the expected result is 18 extracted questions without generated additions, removals, or duplicate questions. The resulting draft will be inspected but not published.

| Criterion | Pass threshold |
|---|---:|
| PDF page count | 9 |
| Expected questions | 18 |
| Extracted questions | Exactly 18 |
| Stem representation | All 18 intended stems present |
| Publication | No publication action performed |

## Live run

The 1.23 MB nine-page raster PDF was uploaded through Quiz Creator at 14:02:15 UTC. The extraction mode is being switched to literal mode with automatic question count so the platform is asked to recover the entire known inventory rather than generate a new quiz.

The job was started at **14:02:58 UTC**. Its parent and per-chunk rows, followed by the editable draft, will be compared with the 18-question reference inventory.

The first attempt exposed a request-validation defect: the UI represents automatic count as `0`, while the protected job endpoint only accepts a positive count or an omitted value. The request was rejected before queue admission. The deployed fix normalizes `0` to an omitted count in both the client and Worker, preserves the positive 1–500 database constraint, and adds a regression test.

The corrected literal-extraction retry started at **14:13:52 UTC** after deployment `451b1a9`.

During the retry, the page initially resumed a completed older job from the local pending-job key instead of creating a fresh test job. This is an unrelated client-resume artifact; the stale key is being cleared only after verifying its parent job is already complete, then the nine-page file will be submitted again as a fresh job.
