import {
    assertEquals,
    assertSpyCallArg,
    spy,
} from '../dev_deps.ts';

import { ScopedPerformance } from './scoped-performance.ts';

Deno.test('ScopedPerformance', async (t) => {
    const markSpy = spy(performance, 'mark');
    const measureSpy = spy(performance, 'measure');
    const addEventListenerSpy = spy(performance, 'addEventListener');
    const removeEventListenerSpy = spy(performance, 'removeEventListener');
    const dispatchEventSpy = spy(performance, 'dispatchEvent');
    const scopedPerf = new ScopedPerformance(performance, () => 'server');
    const anotherScopedPerf= new ScopedPerformance(performance, () => 'client');

    await t.step('should create a mark scoping the name', async () => {
        scopedPerf.mark('my-mark-1');
        anotherScopedPerf.mark('my-mark-1');

        assertSpyCallArg(markSpy, 0, 0, 'server::my-mark-1');
        assertSpyCallArg(markSpy, 1, 0, 'client::my-mark-1');
    });

    await t.step('should return only the entries corresponding to the given scope', async (t) => {
        assertEquals(scopedPerf.getEntries().length, 1);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 2);
    });

    await t.step('should clearMarks(name) of the given scope', async (t) => {
        scopedPerf.clearMarks('my-mark-1');

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 1);
    });

    await t.step('should clearMarks() of the given scope', async (t) => {
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

    await t.step('should create a measure scoping the name', async () => {
        scopedPerf.measure('my-measure-1');
        anotherScopedPerf.measure('my-measure-1');

        assertSpyCallArg(measureSpy, 0, 0, 'server::my-measure-1');
        assertSpyCallArg(measureSpy, 1, 0, 'client::my-measure-1');
    });

    await t.step('should getEntries() of the given scope', async (t) => {
        assertEquals(scopedPerf.getEntries().length, 1);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 2);
    });

    await t.step('should return the same toJSON() as injected performance', async (t) => {
        assertEquals(scopedPerf.toJSON(), performance.toJSON());
        assertEquals(anotherScopedPerf.toJSON(), performance.toJSON());
    });

    await t.step('should getEntriesByType() of the given scope', async (t) => {
        assertEquals(scopedPerf.getEntriesByType('measure').length, 1);
        assertEquals(anotherScopedPerf.getEntriesByType('measure').length, 1);
        assertEquals(performance.getEntriesByType('measure').length, 2);
    });

    await t.step('should getEntriesByName() of the given scope', async (t) => {
        assertEquals(scopedPerf.getEntriesByName('my-measure-1').length, 1);
        assertEquals(anotherScopedPerf.getEntriesByName('my-measure-1').length, 1);
        assertEquals(performance.getEntries().length, 2);
    });

    await t.step('should clearMeasures(name) of the given scope', async (t) => {
        scopedPerf.clearMeasures('my-measure-1');

        assertEquals(scopedPerf.getEntries().length, 0);
        assertEquals(anotherScopedPerf.getEntries().length, 1);
        assertEquals(performance.getEntries().length, 1);
    });

    await t.step('should clearMeasures() of the given scope', async (t) => {
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

    await t.step('should be able to call measure() will all the signatures', async (t) => {
        const measure2 = scopedPerf.measure('my-measure-2');
        assertEquals(measure2.duration, performance.now());

        scopedPerf.mark('my-mark-3', { startTime: 1 });
        scopedPerf.mark('my-mark-4', { startTime: 5 });
        const measure3 = scopedPerf.measure('my-measure-3', 'my-mark-3', 'my-mark-4');

        assertEquals(measure3.duration, 4);

        const measure4 = scopedPerf.measure('my-measure-3', {}, 'my-mark-4');
        assertEquals(measure4.duration, 5);
    });

    await t.step('should return the same now() value as injected performance', async (t) => {
        assertEquals(scopedPerf.now(), performance.now());
        assertEquals(anotherScopedPerf.now(), performance.now());
    });

    await t.step('should return the same timeOrigin value as injected performance', async (t) => {
        assertEquals(scopedPerf.timeOrigin, performance.timeOrigin);
        assertEquals(anotherScopedPerf.timeOrigin, performance.timeOrigin);
    });


    const addEventListenerArgs = ['mark', () => {}, false] as const;

    await t.step('should forward calls to addEventListener to the injected performance', async (t) => {
        scopedPerf.addEventListener(...addEventListenerArgs);
        assertSpyCallArg(addEventListenerSpy, 0, 0, addEventListenerArgs[0]);
        assertSpyCallArg(addEventListenerSpy, 0, 1, addEventListenerArgs[1]);
        assertSpyCallArg(addEventListenerSpy, 0, 2, addEventListenerArgs[2]);
    });

    await t.step('should forward calls to dispatchEvent to the injected performance', async (t) => {
        const event = new CustomEvent('foo');
        scopedPerf.dispatchEvent(event);
        assertSpyCallArg(dispatchEventSpy, 0, 0, event);
    });

    await t.step('should forward calls to removeEventListener to the injected performance', async (t) => {
        scopedPerf.removeEventListener(...addEventListenerArgs);
        assertSpyCallArg(removeEventListenerSpy, 0, 0, addEventListenerArgs[0]);
        assertSpyCallArg(removeEventListenerSpy, 0, 1, addEventListenerArgs[1]);
        assertSpyCallArg(removeEventListenerSpy, 0, 2, addEventListenerArgs[2]);
    });
});
