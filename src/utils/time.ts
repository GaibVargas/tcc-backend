export async function delay(n = 2000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, n))
}