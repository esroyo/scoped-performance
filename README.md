# ScopedPerformance

[![codecov](https://codecov.io/gh/esroyo/scoped-performance/graph/badge.svg?token=)](https://codecov.io/gh/esroyo/scoped-performance)

A Performance API (User timing) wrapper to avoid mark/measure name collisions.

#### Problem

When working with the
[User Timing Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)
on a Deno server with async handlers. You may encounter interferences, as the
`performance` instance and entries are shared for all the concurrently executing
handlers on the same isolate.

The following code poses a problem:

```ts
Deno.serve(async (_req: Request => {
  performance.mark('start');

  // some async work here ...

  const measureEntry = performance.measure('total', 'start');

  return new Response(...);
});
```

Using `clearMarks()`/`clearMeasures()` does not help; It is even worse as it may
remove the entries of another request.

#### Solution

We can avoid the problem by making a new `ScopedPerformance` instance for each
request, which will automatically take care of prefixing the marks/measures
names with a unique prefix:

```ts
import { ScopedPerformance } from './mod.ts';

Deno.serve(async (_req: Request => {
  const scoped = new ScopedPerformance();
  scoped.mark('start');

  // some async work here ...

  const measureEntry = scoped.measure('total', 'start');

  return new Response(...);
});
```

Executing `getEntries()` in the ScopedPerformance instance will only return the
scoped entries:

```ts
import { ScopedPerformance } from './mod.ts';

performance.mark('global start');

const scoped = new ScopedPerformance();
scoped.mark('start');
scoped.measure('total', 'start');

console.log(scoped.getEntries());
/*
[
  PerformanceMark {
  name: "f5a8be11-610b-4745-afdd-98fa8ae0e6d0::start",
  entryType: "mark",
  startTime: 24,
  duration: 0,
  detail: null
},
  PerformanceMeasure {
  name: "f5a8be11-610b-4745-afdd-98fa8ae0e6d0::total",
  entryType: "measure",
  startTime: 24,
  duration: 0,
  detail: null
}
]
*/

console.log(performance.getEntries());
/*
[
  PerformanceMark {
  name: "global start",
  entryType: "mark",
  startTime: 24,
  duration: 0,
  detail: null
},
  PerformanceMark {
  name: "f5a8be11-610b-4745-afdd-98fa8ae0e6d0::start",
  entryType: "mark",
  startTime: 24,
  duration: 0,
  detail: null
},
  PerformanceMeasure {
  name: "f5a8be11-610b-4745-afdd-98fa8ae0e6d0::total",
  entryType: "measure",
  startTime: 24,
  duration: 0,
  detail: null
}
]
*/
```
