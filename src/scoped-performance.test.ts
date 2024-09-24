import { assertEquals, assertSpyCallArg, spy } from '../dev_deps.ts';

import { ScopedPerformance } from './scoped-performance.ts';

Deno.test('ScopedPerformance', async (t) => {
    // Spys on the original performance instance
    const markSpy = spy(performance, 'mark');
    const measureSpy = spy(performance, 'measure');
    const addEventListenerSpy = spy(performance, 'addEventListener');
    const removeEventListenerSpy = spy(performance, 'removeEventListener');
    const dispatchEventSpy = spy(performance, 'dispatchEvent');

    // Two scoped instances
    const scopedPerf = new ScopedPerformance(
        performance,
        () => 'server',
    );
    const anotherScopedPerf = new ScopedPerformance(
        performance,
        () => 'client',
    );

    await t.step('should create a mark scoping the name', () => {
        scopedPerf.mark('my-mark-1');
        anotherScopedPerf.mark('my-mark-1');

        assertSpyCallArg(markSpy, 0, 0, 'server::my-mark-1');
        assertSpyCallArg(markSpy, 1, 0, 'client::my-mark-1');
    });

    await t.step(
        'should getEntries() of the given scope',
        () => {
            assertEquals(scopedPerf.getEntries().length, 1);
            assertEquals(anotherScopedPerf.getEntries().length, 1);
            assertEquals(performance.getEntries().length, 2);
        },
    );

    await t.step(
        'should return entries removing the internal scope from the names',
        () => {
            assertEquals(scopedPerf.getEntries()[0].name, 'my-mark-1');
            assertEquals(anotherScopedPerf.getEntries()[0].name, 'my-mark-1');
            assertEquals(performance.getEntries()[0].name, 'server::my-mark-1');
            assertEquals(performance.getEntries()[1].name, 'client::my-mark-1');
        },
    );

    await t.step(
        'should return entries keeping the PerformanceMark prototype',
        () => {
            assertEquals(
                scopedPerf.getEntries()[0] instanceof PerformanceMark,
                true,
            );
        },
    );

    await t.step('should clearMarks(name) of the given scope', () => {
        scopedPerf.clearMarks('my-mark-1');

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 1);
    });

    await t.step('should clearMarks() of the given scope', () => {
        anotherScopedPerf.mark('my-mark-2');

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 2);
        assertEquals(performance.getEntries().length, 2);

        scopedPerf.clearMarks();

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 2);
        assertEquals(performance.getEntries().length, 2);

        anotherScopedPerf.clearMarks();

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 0);
        assertEquals(performance.getEntries().length, 0);
    });

    await t.step('should create a measure scoping the name', () => {
        scopedPerf.measure('my-measure-1');
        anotherScopedPerf.measure('my-measure-1');

        assertSpyCallArg(measureSpy, 0, 0, 'server::my-measure-1');
        assertSpyCallArg(measureSpy, 1, 0, 'client::my-measure-1');
    });

    await t.step('should getEntries() of the given scope', () => {
        assertEquals(scopedPerf.getEntries().length, 1);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 2);
    });

    await t.step(
        'should return entries removing the internal scope from the names',
        () => {
            assertEquals(scopedPerf.getEntries()[0].name, 'my-measure-1');
            assertEquals(
                anotherScopedPerf.getEntries()[0].name,
                'my-measure-1',
            );
            assertEquals(
                performance.getEntries()[0].name,
                'server::my-measure-1',
            );
            assertEquals(
                performance.getEntries()[1].name,
                'client::my-measure-1',
            );
        },
    );

    await t.step(
        'should return entries keeping the PerformanceMeasure prototype',
        () => {
            assertEquals(
                scopedPerf.getEntries()[0] instanceof PerformanceMeasure,
                true,
            );
        },
    );

    await t.step(
        'should return the same toJSON() as injected performance',
        () => {
            assertEquals(scopedPerf.toJSON(), performance.toJSON());
            assertEquals(anotherScopedPerf.toJSON(), performance.toJSON());
        },
    );

    await t.step('should getEntriesByType() of the given scope', () => {
        assertEquals(scopedPerf.getEntriesByType('measure').length, 1);
        assertEquals(anotherScopedPerf.getEntriesByType('measure').length, 1);
        assertEquals(performance.getEntriesByType('measure').length, 2);
    });

    await t.step('should getEntriesByName() of the given scope', () => {
        assertEquals(scopedPerf.getEntriesByName('my-measure-1').length, 1);
        assertEquals(
            anotherScopedPerf.getEntriesByName('my-measure-1').length,
            1,
        );
        assertEquals(performance.getEntries().length, 2);
    });

    await t.step('should clearMeasures(name) of the given scope', () => {
        scopedPerf.clearMeasures('my-measure-1');

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 1);
    });

    await t.step('should clearMeasures() of the given scope', () => {
        anotherScopedPerf.measure('my-measure-2');

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 2);
        assertEquals(performance.getEntries().length, 2);

        scopedPerf.clearMeasures();

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 2);
        assertEquals(performance.getEntries().length, 2);

        anotherScopedPerf.clearMeasures();

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 0);
        assertEquals(performance.getEntries().length, 0);
    });

    await t.step(
        'should remove all marks and measures when leaving the scope',
        async () => {
            assertEquals(performance.getEntries().length, 0);

            {
                using thirdPerf = new ScopedPerformance(performance);
                thirdPerf.mark('using-mark');

                await new Promise((res) => {
                    setTimeout(res, 0);
                });

                thirdPerf.measure('using-duration', 'using-mark');

                assertEquals(thirdPerf.getEntries().length, 2);
                assertEquals(performance.getEntries().length, 2);
            }

            assertEquals(performance.getEntries().length, 0);
        },
    );

    await t.step(
        'should be able to call measure() with all the signatures',
        () => {
            const measure2 = scopedPerf.measure('my-measure-2');
            assertEquals(
                measure2.duration.toFixed(0),
                performance.now().toFixed(0),
            );

            scopedPerf.mark('my-mark-3', { startTime: 1 });
            scopedPerf.mark('my-mark-4', { startTime: 5 });
            const measure3 = scopedPerf.measure(
                'my-measure-3',
                'my-mark-3',
                'my-mark-4',
            );

            assertEquals(measure3.duration, 4);

            const measure4 = scopedPerf.measure(
                'my-measure-3',
                {},
                'my-mark-4',
            );
            assertEquals(measure4.duration, 5);
        },
    );

    await t.step(
        'should return the same now() value as injected performance',
        () => {
            assertEquals(
                scopedPerf.now().toFixed(0),
                performance.now().toFixed(0),
            );
            assertEquals(
                anotherScopedPerf.now().toFixed(0),
                performance.now().toFixed(0),
            );
        },
    );

    await t.step(
        'should return the same timeOrigin value as injected performance',
        () => {
            assertEquals(scopedPerf.timeOrigin, performance.timeOrigin);
            assertEquals(anotherScopedPerf.timeOrigin, performance.timeOrigin);
        },
    );

    const addEventListenerArgs = ['mark', () => {}, false] as const;

    await t.step(
        'should forward calls to addEventListener to the injected performance',
        () => {
            scopedPerf.addEventListener(...addEventListenerArgs);
            assertSpyCallArg(
                addEventListenerSpy,
                0,
                0,
                addEventListenerArgs[0],
            );
            assertSpyCallArg(
                addEventListenerSpy,
                0,
                1,
                addEventListenerArgs[1],
            );
            assertSpyCallArg(
                addEventListenerSpy,
                0,
                2,
                addEventListenerArgs[2],
            );
        },
    );

    await t.step(
        'should forward calls to dispatchEvent to the injected performance',
        () => {
            const event = new CustomEvent('foo');
            scopedPerf.dispatchEvent(event);
            assertSpyCallArg(dispatchEventSpy, 0, 0, event);
        },
    );

    await t.step(
        'should forward calls to removeEventListener to the injected performance',
        () => {
            scopedPerf.removeEventListener(...addEventListenerArgs);
            assertSpyCallArg(
                removeEventListenerSpy,
                0,
                0,
                addEventListenerArgs[0],
            );
            assertSpyCallArg(
                removeEventListenerSpy,
                0,
                1,
                addEventListenerArgs[1],
            );
            assertSpyCallArg(
                removeEventListenerSpy,
                0,
                2,
                addEventListenerArgs[2],
            );
        },
    );

    await t.step(
        'should remove all listeners that have not been removed when leaving the scope',
        async () => {
            const counters = {
                a: 0,
                b: 0,
                c: 0,
            };

            {
                using thirdPerf = new ScopedPerformance(performance);
                const callbacks = {
                    a: () => {
                        counters.a++;
                    },
                    b: () => {
                        counters.b++;
                    },
                    c: () => {
                        counters.c++;
                    },
                };
                thirdPerf.addEventListener('a', callbacks.a);
                thirdPerf.addEventListener('b', callbacks.b);
                // TODO: uncomment "c" listener code once Deno 2.0 is released
                // thirdPerf.addEventListener('c', callbacks.c, false);
                // thirdPerf.addEventListener('c', callbacks.c, false); // has no effect
                // thirdPerf.addEventListener('c', callbacks.c, true);

                performance.dispatchEvent(new CustomEvent('a'));
                performance.dispatchEvent(new CustomEvent('b'));
                performance.dispatchEvent(new CustomEvent('c'));

                assertEquals(counters.a, 1);
                assertEquals(counters.b, 1);
                // assertEquals(counters.c, 2); // called two times

                // thirdPerf.removeEventListener('c', callbacks.c, false);

                performance.dispatchEvent(new CustomEvent('a'));
                performance.dispatchEvent(new CustomEvent('b'));
                performance.dispatchEvent(new CustomEvent('c'));

                assertEquals(counters.a, 2);
                assertEquals(counters.b, 2);
                // assertEquals(counters.c, 3); // called one time
            }

            performance.dispatchEvent(new CustomEvent('a'));
            performance.dispatchEvent(new CustomEvent('b'));
            performance.dispatchEvent(new CustomEvent('c'));

            // no extra calls have been done
            assertEquals(counters.a, 2);
            assertEquals(counters.b, 2);
            // assertEquals(counters.c, 3);
        },
    );
});
