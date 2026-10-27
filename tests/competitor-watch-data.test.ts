import test from 'node:test'
import assert from 'node:assert/strict'

import {
  aggregatePostsByMonth,
  postEngagementRate,
} from '../lib/competitor-stats.ts'
import {
  monthRange,
  monthsBetween,
  nextMonthKey,
  prevMonthKey,
} from '../lib/month.ts'

test('aggregatePostsByMonth groups real post metrics by month', () => {
  const posts = [
    { publishedAt: '2026-10-05T10:00:00Z', likes: 100, comments: 20, shares: 10, views: 1000, impressions: 5000 },
    { publishedAt: '2026-10-20T10:00:00Z', likes: 50, comments: 5, shares: 5, views: 500, impressions: 2500 },
    { publishedAt: '2026-09-15T10:00:00Z', likes: 200, comments: 40, shares: 20, views: 2000, impressions: 10000 },
  ]

  const months = aggregatePostsByMonth(posts)

  assert.equal(months.length, 2)
  const october = months.find((m) => m.month === '2026-10')
  assert.ok(october)
  assert.equal(october.posts, 2)
  assert.equal(october.likes, 150)
  assert.equal(october.impressions, 7500)
  assert.ok(october.engagementRate > 0)
})

test('postEngagementRate computes only from real views', () => {
  assert.equal(postEngagementRate({ likes: 10, comments: 5, shares: 5, views: 100 }), 20)
  assert.equal(postEngagementRate({ likes: 10, comments: 0, shares: 0, views: 0 }), 0)
})

test('month helpers build a full calendar from the connection month (UTC-safe)', () => {
  const months = monthsBetween('2026-10-01T00:00:00Z', '2026-11-15T00:00:00Z')
  assert.deepEqual(months, ['2026-10', '2026-11'])

  assert.equal(prevMonthKey('2026-11'), '2026-10')
  assert.equal(nextMonthKey('2026-10'), '2026-11')

  const range = monthRange('2026-10')
  assert.ok(range.start.startsWith('2026-10-01'))
  assert.ok(range.end.startsWith('2026-11-01'))
})
