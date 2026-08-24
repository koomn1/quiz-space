import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'https://quiz-space-app.pages.dev/').replace(/\/?$/, '/');
const ROUTE_PAUSE_SECONDS = Number(__ENV.ROUTE_PAUSE_SECONDS || 1);
const PAGE_ROUTES = [
  { name: 'landing', hash: '#/' },
  { name: 'dashboard-landing', hash: '#/dashboard/landing' },
  { name: 'explore', hash: '#/dashboard/explore' },
  { name: 'categories', hash: '#/dashboard/categories' },
  { name: 'community', hash: '#/dashboard/community' },
  { name: 'leaderboard', hash: '#/dashboard/leaderboard' },
  { name: 'achievements', hash: '#/dashboard/achievements' },
  { name: 'motivation', hash: '#/dashboard/motivation' },
  { name: 'motivation-lucky', hash: '#/dashboard/motivation-lucky' },
  { name: 'motivation-brain', hash: '#/dashboard/motivation-brain' },
  { name: 'motivation-review', hash: '#/dashboard/motivation-review' },
  { name: 'motivation-season', hash: '#/dashboard/motivation-season' },
  { name: 'motivation-duel', hash: '#/dashboard/motivation-duel' },
  { name: 'motivation-store', hash: '#/dashboard/motivation-store' },
  { name: 'analytics', hash: '#/dashboard/analytics' },
  { name: 'create', hash: '#/dashboard/create' },
  { name: 'my-quizzes', hash: '#/dashboard/my-quizzes' },
  { name: 'notifications', hash: '#/dashboard/notifications' },
  { name: 'messages', hash: '#/dashboard/messages' },
  { name: 'classrooms', hash: '#/dashboard/classrooms' },
  { name: 'institution', hash: '#/dashboard/institution' },
  { name: 'bookmarks', hash: '#/dashboard/bookmarks' },
  { name: 'settings', hash: '#/dashboard/settings' },
  { name: 'support', hash: '#/dashboard/support' },
  { name: 'billing', hash: '#/dashboard/billing' },
  { name: 'aichat', hash: '#/dashboard/aichat' },
  { name: 'profile', hash: '#/profile' },
  { name: 'quiz', hash: '#/quiz/k6-readonly-smoke' },
  { name: 'join', hash: '#/join/k6-readonly-smoke' },
  { name: 'admin', hash: '#/dashboard/admin' },
];

const pageErrors = new Counter('page_errors');
const pageRequests = new Counter('page_requests');
const pageAvailability = new Rate('page_availability');
const pageResponseTime = new Trend('page_response_time', true);

export const options = {
  scenarios: {
    all_pages_100_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '90s', target: 100 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'spa_read_only', concurrency: '100' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    page_availability: ['rate>0.98'],
    page_response_time: ['p(95)<1500'],
  },
  discardResponseBodies: false,
};

function pageUrl(route) {
  // The fragment is retained as a route label in this test. Browsers do not
  // send fragments to the origin, so a cache-busting query makes each logical
  // SPA page observable as its own k6 tag while exercising the same app shell.
  return `${BASE_URL}?k6_route=${encodeURIComponent(route.name)}`;
}

export default function () {
  for (const route of PAGE_ROUTES) {
    group(`page:${route.name}`, () => {
      const response = http.get(pageUrl(route), {
        tags: { page: route.name, hash_route: route.hash },
        headers: { 'User-Agent': 'QuizSpace-k6-readonly/1.0' },
      });
      pageRequests.add(1, { page: route.name });
      pageResponseTime.add(response.timings.duration, { page: route.name });
      const available = response.status === 200 && response.body && response.body.length > 1000;
      pageAvailability.add(available, { page: route.name });
      if (!available) pageErrors.add(1, { page: route.name, status: String(response.status) });
      check(response, {
        [`${route.name}: HTTP 200`]: (r) => r.status === 200,
        [`${route.name}: app shell present`]: (r) => Boolean(r.body && r.body.length > 1000),
      });
    });
    sleep(ROUTE_PAUSE_SECONDS);
  }
}
