import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'https://koomn1.github.io/quiz-space/').replace(/\/?$/, '/');
const ROUTE_PAUSE_SECONDS = Number(__ENV.ROUTE_PAUSE_SECONDS || 1);
const PAGE_ROUTES = [
  'landing', 'dashboard-landing', 'explore', 'categories', 'community',
  'leaderboard', 'achievements', 'motivation', 'motivation-lucky',
  'motivation-brain', 'motivation-review', 'motivation-season',
  'motivation-duel', 'motivation-store', 'analytics', 'create', 'my-quizzes',
  'notifications', 'messages', 'classrooms', 'institution', 'bookmarks',
  'settings', 'support', 'billing', 'aichat', 'profile', 'quiz', 'join', 'admin',
];

const pageErrors = new Counter('stress_page_errors');
const pageAvailability = new Rate('stress_page_availability');
const stressResponseTime = new Trend('stress_response_time', true);

export const options = {
  scenarios: {
    stress_until_degradation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '20s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '20s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '20s', target: 400 },
        { duration: '30s', target: 400 },
        { duration: '20s', target: 800 },
        { duration: '30s', target: 800 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // Stop the run once a sustained service degradation is detected.
    http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '15s' }],
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '15s' }],
    stress_page_availability: [{ threshold: 'rate>0.90', abortOnFail: true, delayAbortEval: '15s' }],
  },
  discardResponseBodies: false,
};

function urlFor(route) {
  return `${BASE_URL}?k6_stress_route=${encodeURIComponent(route)}&run=${__ENV.RUN_ID || 'stress'}`;
}

export default function () {
  for (const route of PAGE_ROUTES) {
    group(`stress:page:${route}`, () => {
      const response = http.get(urlFor(route), {
        tags: { page: route, test_type: 'stress_read_only' },
        headers: { 'User-Agent': 'QuizSpace-k6-stress-readonly/1.0' },
      });
      const available = response.status === 200 && Boolean(response.body && response.body.length > 1000);
      pageAvailability.add(available, { page: route });
      stressResponseTime.add(response.timings.duration, { page: route });
      if (!available) pageErrors.add(1, { page: route, status: String(response.status) });
      check(response, {
        [`${route}: HTTP 200`]: (r) => r.status === 200,
        [`${route}: app shell present`]: (r) => Boolean(r.body && r.body.length > 1000),
      });
    });
    sleep(ROUTE_PAUSE_SECONDS);
  }
}
