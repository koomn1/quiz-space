import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'https://koomn1.github.io/quiz-space/').replace(/\/?$/, '/');
const ROUTES = [
  'landing', 'dashboard-landing', 'explore', 'categories', 'community',
  'leaderboard', 'achievements', 'motivation', 'motivation-lucky',
  'motivation-brain', 'motivation-review', 'motivation-season',
  'motivation-duel', 'motivation-store', 'analytics', 'create', 'my-quizzes',
  'notifications', 'messages', 'classrooms', 'institution', 'bookmarks',
  'settings', 'support', 'billing', 'aichat', 'profile', 'quiz', 'join', 'admin',
];

export const options = {
  scenarios: {
    confirm_boundary: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '15s', target: 400 },
        { duration: '30s', target: 400 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }],
  },
  discardResponseBodies: false,
};

export default function () {
  for (const route of ROUTES) {
    group(`confirm:page:${route}`, () => {
      const response = http.get(`${BASE_URL}?k6_confirm_route=${encodeURIComponent(route)}&run=${__ENV.RUN_ID || 'confirm'}`, {
        tags: { page: route, test_type: 'stress_confirm_read_only' },
        headers: { 'User-Agent': 'QuizSpace-k6-stress-confirm-readonly/1.0' },
      });
      check(response, {
        [`${route}: HTTP 200`]: (r) => r.status === 200,
        [`${route}: app shell present`]: (r) => Boolean(r.body && r.body.length > 1000),
      });
    });
    sleep(1);
  }
}
