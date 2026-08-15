# Cloudflare Queue Reference for Internal Extraction Jobs

The internal extraction-job worker uses one Cloudflare Queue as both producer and consumer. The producer writes an authenticated job reference after the job row and private upload have been persisted. The consumer receives one message at a time and runs the long extraction independently of the browser request.

Cloudflare’s official documentation requires a queue to exist before use, then a producer binding and consumer binding in the Worker configuration. It also documents that a consumer is invoked with queue messages and that batch size, timeout, and retry count are configurable.

References:

1. [Cloudflare Queues — Getting started](https://developers.cloudflare.com/queues/get-started/)
2. [Cloudflare Queues — Configure Queues](https://developers.cloudflare.com/queues/configuration/configure-queues/)
