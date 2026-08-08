import "server-only";

const NDJSON_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Accel-Buffering": "no",
} as const;

export function createNdjsonStreamResponse<TEvent extends object>(
  handler: (write: (event: TEvent) => void) => Promise<void>,
  onError: (error: unknown) => TEvent,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: TEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await handler(write);
      } catch (error) {
        write(onError(error));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}
