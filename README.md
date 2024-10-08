# ScopedPerformance


[![JSR](https://jsr.io/badges/@esroyo/scoped-performance)](https://jsr.io/@esroyo/scoped-performance) [![JSR Score](https://jsr.io/badges/@esroyo/scoped-performance/score)](https://jsr.io/@esroyo/scoped-performance) [![codecov](https://codecov.io/gh/esroyo/scoped-performance/graph/badge.svg?token=OVVLMQFJ3A)](https://codecov.io/gh/esroyo/scoped-performance)

Safely use the Performance API User timing features without fear of having name
collisions with another concurrently running code.

### Motivation

#### Problem

When working with the
[User Timing Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)
on a Deno server with async handlers. You may encounter interferences, as the
`performance` instance (and entries) are shared for all the concurrently
executing handlers on the same isolate.

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

Using `clearMarks()`/`clearMeasures()` does not help. It might be even worse as
you may remove the entries created by another request!

#### Solution

We can avoid the problem by making a new `ScopedPerformance` instance for each
request, which will automatically take care of prefixing the mark/measure names
with a unique prefix:

```ts
import { ScopedPerformance } from 'jsr:@esroyo/scoped-performance';

Deno.serve(async (_req: Request => {
  const scoped = new ScopedPerformance();
  scoped.mark('start');

  // some async work here ...

  const measureEntry = scoped.measure('total', 'start');

  return new Response(...);
});
```

This effectively avoid name collisions among concurrent requests.

Executing `getEntries()` in the `ScopedPerformance` instance will only return
the entries created with that instance:

```ts
import { ScopedPerformance } from 'jsr:@esroyo/scoped-performance';

// Let's make a mark in the global original `performance` instance
performance.mark('global-start');

// Then proceed to make an scoped instance, and some scoped marks
const scoped = new ScopedPerformance();
scoped.mark('start');
scoped.measure('total', 'start');

// When retrieving the entries of the scoped instance, we just get those.
// The "name" of the entry will be unscoped/unprefixed back to the original name.
console.log(scoped.getEntries());

/*
[
  PerformanceMark {
  name: "start",
  entryType: "mark",
  startTime: 24,
  duration: 0,
  detail: null
},
  PerformanceMeasure {
  name: "total",
  entryType: "measure",
  startTime: 24,
  duration: 0,
  detail: null
}
]
*/

// The global `performance` instance of course contains all the marks.
// Here we can see that the "name" of the entries created with the scoped instance
// are internally scoped/prefixed with an unique id to avoid collisions.
console.log(performance.getEntries());

/*
[
  PerformanceMark {
  name: "global-start",
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
### Usage

As of Deno [1.37.0 (2023-09-19)](https://github.com/denoland/deno/releases/tag/v1.37.0), it is recommended to use the `using` keyword to take advantage of [explicit resource management](https://github.com/tc39/proposal-explicit-resource-management). With this language feature, scoped performance entries will be cleared from the global `performance` instance once the scoped performance instance leaves scope, avoiding memory leaks.

```ts
import { ScopedPerformance } from 'jsr:@esroyo/scoped-performance';

Deno.serve(async (_req: Request => {
  using scoped = new ScopedPerformance();
  scoped.mark('start');

  // some async work here ...

  const measureEntry = scoped.measure('total', 'start');

  // once the handler has returned, scoped.clearMarks() and scoped.clearMeasures()
  // will be executed, avoiding the continuous growth of global entries
  return new Response(...);
});
```

In case you are on an older version of Deno (or any other platform that does not support `using`) remember to explicitly call `clearMarks()` and `clearMeasures()` once access to the scoped instance is not needed:

```ts
import { ScopedPerformance } from 'jsr:@esroyo/scoped-performance';

Deno.serve(async (_req: Request => {
  const scoped = new ScopedPerformance();
  scoped.mark('start');

  // some async work here ...

  const measureEntry = scoped.measure('total', 'start');

  // ...

  // Explicit tear down
  scoped.clearMarks();
  scoped.clearMeasures();

  return new Response(...);
});
```
