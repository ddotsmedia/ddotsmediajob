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
import { assessmentsRouter } from './routers/assessments';
import { messagesRouter } from './routers/messages';
import { scorecardsRouter } from './routers/scorecards';
import { eventsRouter } from './routers/events';
import { teamRouter } from './routers/team';
import { videoInterviewsRouter } from './routers/video-interviews';
import { successStoriesRouter } from './routers/success-stories';
import { pushRouter } from './routers/push';
import { amaRouter } from './routers/ama';
import { credentialsRouter } from './routers/credentials';
import { cultureRouter } from './routers/culture';
import { learnRouter } from './routers/learn';
import { employerAtsRouter } from './routers/employer-ats';
import { communityHubRouter } from './routers/community-hub';
import { feedbackRouter } from './routers/feedback';

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
  assessments: assessmentsRouter,
  messages: messagesRouter,
  scorecards: scorecardsRouter,
  events: eventsRouter,
  team: teamRouter,
  videoInterviews: videoInterviewsRouter,
  successStories: successStoriesRouter,
  push: pushRouter,
  ama: amaRouter,
  credentials: credentialsRouter,
  culture: cultureRouter,
  learn: learnRouter,
  employerAts: employerAtsRouter,
  communityHub: communityHubRouter,
  feedback: feedbackRouter,
});

export type AppRouter = typeof appRouter;
