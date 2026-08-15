# Live Extraction Speed Verification — 2026-08-15

## Test environment

The published Quiz Space site was tested while authenticated as the platform owner. Each input was uploaded through the Quiz Creator user interface, and the resulting extraction job was allowed to return a draft without publishing that draft as a shared quiz.

## Recorded observations

| Route | Input | Start observed | Completion observed | Result |
|---|---|---:|---:|---|
| Literal text extraction | 267-byte Arabic `.txt` file with two MCQs and one essay prompt | 12:25:46 UTC | 12:25:50 UTC | Completed in **3.54 seconds**; all three source questions appeared in the editable draft with their expected question types. |
| Narrative text generation | 514-byte Arabic `.txt` explanatory passage; requested three questions | 12:27:19 UTC | 12:27:58 UTC | Completed in **38.58 seconds** and returned three generated questions. The visible state progressed from “reading content” while waiting for the text-model response. |
| Native-text PDF generation — pre-fix | 1.4 KB one-page searchable PDF; requested three questions | 12:31:14 UTC | 12:31:57 UTC | Failed after **42.51 seconds** at 5% with a generic completion error. Isolated local parsing of the identical PDF took **137 ms** and yielded 211 characters, so the fault was downstream of PDF text extraction: a model response with unusable JSON ended the job instead of allowing a higher-level model fallback. |

The literal route confirms that the strict local parser remains fast after the queue redesign. The narrative test is intentionally separate because it requires an external text-model response and must not be compared to the local parser latency.

The failure above was fixed before retesting: the model that completed the narrative test, `nvidia/nemotron-3-super-120b-a12b:free`, now runs first for text and searchable-PDF generation; malformed JSON and empty-question responses now advance to the next model instead of immediately failing the job.

The post-fix retest of the identical PDF started at **12:40:25 UTC** on deployed revision `142908b` and completed at **12:40:46 UTC** in **20.96 seconds**. It returned three questions using `nvidia/nemotron-3-super-120b-a12b:free`, confirming that the text route and JSON-validation fallback now work for searchable PDFs.

## Scanned PDF queue verification

A 1.64 MB, 25-page raster PDF was uploaded at 12:42:33 UTC and its background job was started at **12:42:43 UTC**. The expected routing was five persisted vision chunks of at most five pages each.

| Measure | Observed result |
|---|---:|
| Persisted chunks | 5 chunks: pages 1–5, 6–10, 11–15, 16–20, and 21–25 |
| First completed chunk | 12:43:18 UTC, approximately 35 seconds after the parent job began |
| First visible saved progress | 4/5 chunks at 12:43:39 UTC; the UI displayed “less than a minute” rather than a misleading fixed promise |
| Automatic retry | One chunk entered `pending` after a failed attempt and completed automatically on retry at 12:44:30 UTC |
| Parent completion | 12:44:30 UTC, **106.73 seconds** end to end |
| Result integrity | The editable draft arrived in the browser with one valid MCQ. The source deliberately repeated the same question on all 25 pages, so normalization correctly removed duplicates rather than returning 25 copies. |

The per-chunk architecture eliminated the previous all-or-nothing 5% stall. Each vision chunk now has a durable state, independent retry behavior, and a persisted contribution to parent-job progress.

## Conclusion

The fast literal path completes in seconds. Text generation and searchable-PDF generation are model-bound and completed in tens of seconds for the small three-question test. The 25-page scanned PDF completed in under two minutes with usable progress after the first completed chunk, rather than remaining at 5% until the whole file pipeline ended. This is the appropriate path for long scanned documents: asynchronous, resumable, observable, and bounded by chunk-level retries.
