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
