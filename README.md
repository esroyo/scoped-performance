# ScopedPerformance
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/scoped_performance/mod.ts) [![codecov](https://codecov.io/gh/esroyo/scoped-performance/graph/badge.svg?token=OVVLMQFJ3A)](https://codecov.io/gh/esroyo/scoped-performance)

Safely use the Performance API User timing features without fear of having name collisions with another concurrently running code.

#### Problem

When working with the
[User Timing Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)
on a Deno server with async handlers. You may encounter interferences, as the
`performance` instance (and entries) are shared for all the concurrently executing
handlers on the same isolate.

The following code poses a problem because the same names might be used for 
different requests if they overlap in time:

```ts
Deno.serve(async (_req: Request => {
  performance.mark('start');

  // some async work here ...

  const measureEntry = performance.measure('total', 'start');

  return new Response(...);
});
```

Using `clearMarks()`/`clearMeasures()` does not help. It might be even worse as you may
remove the entries of another request.

#### Solution

We can avoid the problem by making a new `ScopedPerformance` instance for each
request, which will automatically take care of prefixing the mark/measure
names with a unique prefix:

```ts
import { ScopedPerformance } from 'https://deno.land/x/scoped_performance/mod.ts';

Deno.serve(async (_req: Request => {
  const scoped = new ScopedPerformance();
  scoped.mark('start');

  // some async work here ...

  const measureEntry = scoped.measure('total', 'start');

  return new Response(...);
});
```

This effectively avoid name collisions among concurrent requests.

Executing `getEntries()` in the `ScopedPerformance` instance will only return the
entries created with that instance:

```ts
import { ScopedPerformance } from 'https://deno.land/x/scoped_performance/mod.ts';

// Let's make a mark in the global original `performance` instance
performance.mark('start');

// Then proceed to make an scoped instance, and some scoped marks
const scoped = new ScopedPerformance();
scoped.mark('start');
scoped.measure('total', 'start');

// When retrieving the entries of the scoped instance, we just get those...
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

// The global `performance` instance of course contains all the marks ...
console.log(performance.getEntries());

/*
[
  PerformanceMark {
  name: "start",
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
