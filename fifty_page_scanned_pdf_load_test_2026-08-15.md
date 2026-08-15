# Fifty-Page Scanned PDF Load Test

## Objective

Measure the production behavior of QuizSpace literal extraction for a controlled, rasterized 50-page PDF. The test remains private to the signed-in user, and the resulting draft will not be saved or published.

## Test specimen

The specimen will contain 100 unique multiple-choice questions: two questions on each of 50 rasterized pages. It will remain below the 12 MB upload admission limit and will contain no embedded selectable text, forcing the durable vision-chunk route.

## Metrics

| Metric | Measurement method | Success signal |
|---|---|---|
| File admission | Browser upload and job-creation response | Accepted without client or storage-limit error |
| Queue admission | Parent job `created_at` to first `processing` update | Bounded, recorded delay |
| Work partition | Persisted chunk rows | 10 chunks of at most 5 pages each |
| First useful progress | Parent job timestamps and browser progress | A completed chunk is persisted before final aggregation |
| End-to-end latency | Parent job `created_at` to `completed_at` | Measured, not assumed |
| Retry behavior | Per-chunk status and attempt outcomes | Only an affected chunk is retried |
| Resource proxy | Input byte size, chunks, elapsed time, and chunk throughput | Quantified operational load; CPU and memory are not exposed by the managed Worker runtime |
| Result fidelity | Comparison against deterministic 100-question manifest | Count, stems, options, and correct answers compared separately |

## Safety boundaries

Only the fresh job ID generated for this test will be queried. No public quiz will be created, and no other user job, file, or record will be altered. Any cleanup will be limited to this test job and its source object after results have been recorded.

## Prepared specimen

The generated raster PDF contains exactly 50 pages and 100 unique arithmetic MCQs, with the expected stem, option order, and answer captured in a local manifest. Its measured size is **6,549,115 bytes (6.25 MiB)**, which is below the current 12 MB upload limit. The live run will use literal extraction and automatic count.

The file was accepted by the production upload interface as `fifty_page_scanned_load_test.pdf` at 6.25 MiB. Literal extraction and automatic count remain selected for the live run.

## Live run result

| Measurement | Observed result |
|---|---:|
| Parent job | `5a5aa92a-fc68-44c5-9032-ac4c67f5ee16` |
| Queue admission to 10 persisted chunks | approximately **2.88 seconds** |
| Chunk layout | 10 chunks × 5 pages |
| First successful chunk | pages 16–20 at approximately **68.87 seconds** after job creation |
| Completed work before parent failure | 3 chunks, 15 pages, and 30 extracted questions |
| Last successful chunk | pages 21–25 at approximately **118.48 seconds** after job creation |
| Parent terminal state | `error` at **146.53 seconds** after job creation |
| Successful-chunk model | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` |
| Result integrity | Not measurable for the complete file because no final aggregated draft was produced |

The test was admitted and split correctly, but it did **not** complete. Page ranges 11–15, 16–20, and 21–25 completed with ten questions each. At least two chunks reached their retry limit with the generic extraction error, which moved the parent job to `error` at 30% progress; the remaining pending chunks were not aggregated. The available managed-runtime telemetry does not expose Worker CPU or memory use, and no performance-log row was written for this failed parent run. Therefore input size, 10 chunk records, elapsed time, completed chunks, and retry/failure states are the reliable resource proxies for this measurement.

## Finding

The current architecture proves that the queue can admit a 6.25 MiB / 50-page scan and make progress safely without a single long-running invocation. However, its current retry and finalization policy treats a repeatedly failing chunk as terminal for the whole parent job, and the generic stored error lacks provider-level diagnostic detail. This makes 50-page scans **not yet production-reliable** under the current free vision-model behavior, even though the same route passed at 9 and 25 pages.

## Resource proxies and engineering interpretation

| Proxy | Measured value | Interpretation |
|---|---:|---|
| Input payload | 6.25 MiB / 50 pages | Upload and storage admission remain within the 12 MB policy |
| Persisted work units | 10 chunks | The Worker avoided one oversized long-running request |
| First successful result | 68.869 seconds | Useful progress arrived, but later than the 9- and 25-page reference runs |
| Completed throughput before failure | 0.1024 pages/s, 0.2047 questions/s | Three successful chunks delivered 30 questions before terminal failure |
| Completion coverage | 30% of pages and questions | Insufficient for automatic finalization or fidelity scoring |
| Observability gap | No failed-parent performance-log row | The Worker needs an error-class field and a best-effort telemetry fallback that can be correlated to a parent job |

The direct failure mechanism is clear from the chunk processor: a chunk that returns unusable JSON or an empty question set is returned to the queue up to the delivery limit, then marked `error`; the parent immediately becomes `error` if any chunk is terminal. The retry repeats the same request path, instead of trying a validated alternate vision model inside the same chunk attempt.

### Recommended hardening before accepting fifty-page scans as reliable

1. Parse and validate the first vision response inside a chunk, then try the next vision model immediately if the response is not usable JSON or produces no normalized questions. This prevents spending all queue delivery attempts on the same model behavior.
2. Store a sanitized failure classification per chunk, such as `invalid_json`, `empty_questions`, `provider_timeout`, or `provider_rate_limit`, together with the model name. Keep the generic Arabic message for the user.
3. Do not terminally fail the parent until all chunks have completed their fallback sequence. Retain completed chunk results and offer one explicit resume action for only the failed ranges.
4. Log parent-job success and error telemetry with its job ID and completed-chunk count, so future load tests can distinguish model latency from queue delay and Worker overhead.
