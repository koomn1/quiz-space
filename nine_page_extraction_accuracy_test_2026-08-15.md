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

The fresh automatic-count request was accepted with HTTP 202 and created job `ece3c4fa-e759-455b-9484-2007e822d65d`, confirming that zero no longer blocks queue admission. It then failed at 5% because the prior routing only created durable vision chunks for scans of at least 20 pages. The subsequent deployed fix extends no-text sample detection to short scanned PDFs, so the nine-page file is now expected to produce two persisted vision chunks: pages 1–5 and pages 6–9.

## Final live result

| Measurement | Result |
|---|---:|
| Final job ID | `efafd196-c4fc-4567-88cd-ffc284274dd5` |
| Extraction mode | Literal, automatic count |
| Vision chunks | 2 persisted chunks: pages 1–5 and 6–9 |
| Start → complete | 14:21:28 → 14:22:00 UTC (**32.75 seconds**) |
| Model recorded by the completed job | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` |
| Expected / actual count | **18 / 18** |
| Question-stem matches | **18 / 18** |
| Ordered option-list matches | **18 / 18** |
| Correct-answer matches | **18 / 18** |
| Unexpected questions | **0** |

The complete 18-question editable draft appeared in Quiz Creator, including each expected option and selected correct answer. The comparison was performed against the deterministic manifest created with the test file rather than a visual count alone. The draft was **not saved or published**.

## Conclusion

The literal extraction path passed this controlled scanned-PDF test with **100% count, stem, option, and answer fidelity**. The test also exposed and resolved two admission/routing defects: the automatic-count sentinel is now normalized safely, and short scanned PDFs now use the same durable, observable vision-chunk architecture as large scans.
