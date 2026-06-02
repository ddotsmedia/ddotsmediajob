export { appRouter, type AppRouter } from './root';
export { createContext, type Context } from './context';
export { createCallerFactory } from './trpc';
import { appRouter } from './root';
import { createCallerFactory } from './trpc';
import { createContext } from './context';

/** Server-side caller for use inside React Server Components / server actions. */
export const createCaller = createCallerFactory(appRouter);
export { createContext as createTRPCContext };

export async function createServerCaller() {
  const ctx = await createContext();
  return createCaller(ctx);
}
