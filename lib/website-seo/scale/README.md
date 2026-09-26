# W15 scale orchestration

The run is also the plan. Candidates are individual rows, never SystemSetting queue blobs. Import at most 100 rows per request, explicitly select candidates, mark the plan ready, then request batches of at most 25 (also capped by W13). Custom plans stop at 5,000. All six entity families share the same pipeline. Candidate metadata is W2's JSON object, limited to 16 KB. New W2 entities retain the existing DRAFT default; editorial activation/approval remains separate.

Dry runs only read data and invoke pure W2/W3/W4 functions. W4 primary keyword overlaps conservatively block generation pending mapping review; no invented separation justification or search metrics. Generation rechecks candidates, preserves existing pages, runs W4/W5/W6 and uses W7 preview as its final gate. No publish method, automatic schedule, or public renderer change is introduced. W12 and W13 approval modes are shown; batches are explicit manual actions. W13 generation toggles and batch limits are enforced before and during execution. Publication remains outside W15 and requires the existing central, W12, W13 and W7 controls.

Coverage uses server-side counts. W3 READY is explicitly a lifecycle count, not W7 approval. Stored non-pass quality counts exclude pages whose quality was never persisted; live W7 checks paginate 25 pages at a time. Terminal run COMPLETED means all selected items were processed, including BLOCKED; successful items are counted separately.

## Migration and concurrency

Manual additive migration: `20260912090000_website_seo_scale_up`. Not deployed by this milestone. The migration adds two tables, bounded run checks, indexes, and a PostgreSQL partial unique index allowing only one W15 execution token globally. The partial index is intentionally SQL-managed (Prisma 6 cannot express it). Deploying only a schema push would omit this concurrency invariant.

Plan mutations use short row-locking transactions. Engines execute outside those transactions. Pause stops after the current item; resume requires the active batch to release its token. Completed/blocked/failed items are never automatically repeated. Failure details are summarized publicly; engine errors are logged on the server. An administrator can create a new reviewed plan to retry a failed entity using its persisted W2/W3 state.

## Interrupted-process recovery

Worker ownership has no automatic expiry: an expired lease must not allow a second writer to race a still-running W3/W5 operation. Refreshing or closing the browser does not release ownership. If a server process is forcibly terminated, the lock remains deliberately fail-closed.

After an operator has **confirmed that the owning worker process has terminated and cannot resume**, release the affected run using a short maintenance transaction. Mark its RUNNING items FAILED with an interruption message, set the run PAUSED, and clear executionToken. Do not reset those items to READY. Resume then processes only the untouched READY items. Review the interrupted item's persisted entity/page state in a separate retry plan. Never clear ownership merely because heartbeatAt is old. This recovery is intentionally not an HTTP button that could create overlapping workers.

No migration, production candidate import, production execution, build, or W16 work is performed as part of implementation/testing. Tests use mocks and pure functions.
