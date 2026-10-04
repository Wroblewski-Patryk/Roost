// Some governed reads maintain the source fence inside a serializable
// transaction. Concurrent console reads can abort one of those transactions.
// Retry only the explicit rolled-back conflict result, never an uncertain
// transport failure or a business command. Callers must supply a read operation.
export async function retryContextRead<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const result = await read();
    if (attempt >= 2 || !result || typeof result !== "object" ||
      !("error" in result) || result.error !== "task_ready_context_conflict") return result;
  }
}
