# Large PDF Extraction Queue Load Test — 2026-08-15

## Scope

This production test measured the internal extraction path for a large public educational PDF while the authenticated Quiz Space user was active. It checked client-side size admission, private upload, job creation, Cloudflare Queue hand-off, persisted progress, and terminal telemetry. The source was **OpenStax Biology 2e**, a publicly downloadable Creative Commons educational textbook.[1]

## Test inputs

| Scenario | Source | File size | Pages | Expected path |
|---|---:|---:|---:|---|
| Oversize admission test | Full OpenStax Biology 2e PDF | 382.71 MB | 1,475 | Reject before private upload or queue admission |
| Near-limit queue test | 37-page rasterized derivative of public OpenStax pages | 11.50 MB (12,061,082 bytes) | 37 | Private upload, queue delivery, then vision extraction in 8 five-page chunks |

The oversize test produced the visible Arabic validation message: **"حجم الملف يجب أن يكون أقل من 12 ميجابايت."** No extraction job was created. The cap is enforced in both the client and the private Storage bucket.

## Observed queue metrics

| Measurement | Observation |
|---|---|
| Job created | 2026-08-15 11:10:43.365 UTC |
| First `processing` update | 2026-08-15 11:10:46.961 UTC |
| Queue admission and first claim | At most 3.6 seconds from persisted creation to the first persisted processing state |
| Progress reached | 5%; `processed_chunks = 0`, `total_chunks = null` |
| Completion result | Not reached; the test job was stopped deliberately after repeated lease renewals and no chunk progress |
| Terminal performance record | No `ai_performance_logs` record was produced because the worker did not reach either its success or its caught-error path |

The original two-minute processing lease expired without a chunk update and caused the job to be re-claimed. A targeted fix was deployed during the test: the lease became five minutes, and large PDFs with no text in a three-page sample are routed to the chunked vision path without a full sequential text scan. The re-run still remained at 5% without emitting a chunk update, so this fix is unit-tested but **not sufficient as a production capacity solution** for a 37-page scanned PDF.

## Local isolation measurements

The local PDF preparation work ruled out basic PDF loading as the primary source of the delay. Loading the 37-page, 12.06 MB PDF, isolating its first three pages, and saving the sample took **56 ms** in total. Extracting text from that three-page raster sample took **168 ms** and returned no meaningful text. The remaining bottleneck is therefore in the long-running vision-chunk path or its external model requests, before the first persisted chunk update.

## Engineering conclusion

Cloudflare Queue performs its intended decoupling role: the browser received a task immediately and the job was claimed quickly. However, a single queue consumer invocation currently owns too much of the scanned-PDF pipeline. It prepares all chunks and then waits on external vision calls before saving the first progress checkpoint. For large scanned PDFs, this makes retries indistinguishable from progress and can exhaust execution time before the first observable chunk completes.

The recommended next implementation is **one queue message per PDF chunk**, with a parent job and child chunk records. Each consumer invocation would render or package one five-page chunk, call one model with a bounded timeout, persist that chunk's questions and status, and enqueue the next chunk. This preserves progress after a timeout, allows queue retries to target only the failed chunk, and makes the first progress update appear before external work on the whole document is complete. The 12 MB source limit should remain until a resumable multipart upload path and per-chunk storage strategy are introduced.

## Cleanup

The local test artifacts were removed. The persisted test job was changed to `error` with a user-facing message explaining that it was stopped after the performance measurement, so it no longer retries through Cloudflare Queue.

## References

[1] [OpenStax Biology 2e — official book page and PDF download](https://openstax.org/details/books/biology-2e)
