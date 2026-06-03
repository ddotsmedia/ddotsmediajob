import { router } from './trpc';
import { authRouter } from './routers/auth';
import { jobsRouter } from './routers/jobs';
import { applicationsRouter } from './routers/applications';
import { jobseekersRouter } from './routers/jobseekers';
import { employersRouter } from './routers/employers';
import { alertsRouter } from './routers/alerts';
import { adminRouter } from './routers/admin';
import { searchRouter } from './routers/search';
import { contentRouter } from './routers/content';
import { aiRouter } from './routers/ai';
import { communityRouter } from './routers/community';
import { reviewsRouter } from './routers/reviews';
import { candidatesRouter } from './routers/candidates';
import { billingRouter } from './routers/billing';
import { notificationsRouter } from './routers/notifications';
import { linksRouter } from './routers/links';

export const appRouter = router({
  auth: authRouter,
  jobs: jobsRouter,
  applications: applicationsRouter,
  jobseekers: jobseekersRouter,
  employers: employersRouter,
  alerts: alertsRouter,
  admin: adminRouter,
  search: searchRouter,
  content: contentRouter,
  ai: aiRouter,
  community: communityRouter,
  reviews: reviewsRouter,
  candidates: candidatesRouter,
  billing: billingRouter,
  notifications: notificationsRouter,
  links: linksRouter,
});

export type AppRouter = typeof appRouter;
