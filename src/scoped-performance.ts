function normalizeEventListenerOptions(
    options: boolean | EventListenerOptions | undefined,
) {
    if (typeof options === 'boolean' || typeof options === 'undefined') {
        return { capture: Boolean(options) };
    } else {
        return options;
    }
}

export class ScopedPerformance implements Performance {
    public readonly randomId: string;
    public readonly glue = '::' as const;
    protected readonly _prototypeMap = {
        mark: PerformanceMark.prototype,
        measure: PerformanceMeasure.prototype,
    } as const;
    protected _addEventListenerCalls: Array<
        [
            type: string,
            listener: EventListenerOrEventListenerObject,
            EventListenerOptions,
        ]
    > = [];

    constructor(
        protected performance: Performance = globalThis.performance,
        protected randomIdGenerator: () => string = globalThis.crypto.randomUUID
            .bind(globalThis.crypto),
    ) {
        this.randomId = this.randomIdGenerator();
    }

    protected _prefixName(name: string): string {
        return `${this.randomId}${this.glue}${name}`;
    }

    protected _unprefixName(name: string): string {
        return name.replace(this._prefixName(''), '');
    }

    protected _isScopedName(name: string): boolean {
        return name.startsWith(this._prefixName(''));
    }

    protected _filterMap(entries: PerformanceEntryList): PerformanceEntryList {
        return entries.filter(({ name }) => this._isScopedName(name)).map((
            entry,
        ) => Object.setPrototypeOf({
            ...entry.toJSON(),
            name: this._unprefixName(entry.name),
        }, this._prototypeMap[entry.entryType as 'mark' | 'measure']));
    }

    protected _findListenerIndex(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions | undefined,
    ): number | undefined {
        const normalized = normalizeEventListenerOptions(options);
        for (let i = 0; i < this._addEventListenerCalls.length; i += 1) {
            const addEventListenerCall = this._addEventListenerCalls[i];
            if (
                addEventListenerCall[0] === type &&
                addEventListenerCall[1] === listener &&
                addEventListenerCall[2].capture === normalized.capture
            ) {
                return i;
            }
        }
    }

    [Symbol.dispose]() {
        // Remove our marks/measures from the global performance instance
        this.clearMarks();
        this.clearMeasures();
        // Remove our event listeners from the global performance instance
        for (const addEventListenerCall of this._addEventListenerCalls) {
            this.performance.removeEventListener(...addEventListenerCall);
        }
    }

    /** Returns a timestamp representing the start of the performance measurement. */
    get timeOrigin(): number {
        return this.performance.timeOrigin;
    }

    /**
     * Stores a timestamp with the associated scoped name (auto scoped).
     */
    mark(markName: string, options?: PerformanceMarkOptions): PerformanceMark {
        return this.performance.mark(this._prefixName(markName), options);
    }

    /**
     * Stores the `DOMHighResTimeStamp` duration between two marks along with the
     * associated name (auto scoped).
     */
    measure(
        measureName: string,
        startMarkOrOptions?: string | PerformanceMeasureOptions,
        endMark?: string,
    ): PerformanceMeasure {
        return this.performance.measure(
            this._prefixName(measureName),
            // @ts-ignore to avoid erroneous signature implementation on Deno side
            typeof startMarkOrOptions === 'string'
                ? this._prefixName(startMarkOrOptions)
                : startMarkOrOptions,
            endMark ? this._prefixName(endMark) : undefined,
        );
    }

    now(): number {
        return this.performance.now();
    }

    /**
     * Removes the stored timestamp with the associated name (auto scoped).
     *
     * When no markName is provided, will remove all the stored marks related to this scope.
     */
    clearMarks(markName?: string): void {
        if (markName) {
            return this.performance.clearMarks(this._prefixName(markName));
        }
        this.performance.getEntriesByType('mark').forEach(({ name }) => {
            if (this._isScopedName(name)) {
                this.performance.clearMarks(name);
            }
        });
    }

    /**
     * Removes the stored timestamp with the associated name (auto scoped).
     *
     * When no measureName is provided, will remove all the stored measures related to this scope.
     */
    clearMeasures(measureName?: string): void {
        if (measureName) {
            return this.performance.clearMeasures(
                this._prefixName(measureName),
            );
        }
        this.performance.getEntriesByType('measure').forEach(({ name }) => {
            if (this._isScopedName(name)) {
                this.performance.clearMeasures(name);
            }
        });
    }

    getEntries(): PerformanceEntryList {
        return this._filterMap(this.performance.getEntries());
    }

    getEntriesByType(type: string): PerformanceEntryList {
        return this._filterMap(this.performance.getEntriesByType(type));
    }

    getEntriesByName(name: string, type?: string): PerformanceEntryList {
        return this._filterMap(
            this.performance.getEntriesByName(this._prefixName(name), type),
        );
    }

    toJSON(): any {
        return this.performance.toJSON();
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void {
        // Keep a list of the listeners added to the global performance
        if (
            listener &&
            this._findListenerIndex(type, listener, options) === undefined
        ) {
            this._addEventListenerCalls.push([
                type,
                listener,
                normalizeEventListenerOptions(options),
            ]);
        }

        return this.performance.addEventListener(type, listener, options);
    }

    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions | undefined,
    ): void {
        // Remove the listener from our list
        const listenerIndex = this._findListenerIndex(type, listener, options);
        if (listenerIndex !== undefined) {
            this._addEventListenerCalls.splice(listenerIndex, 1);
        }

        return this.performance.removeEventListener(type, listener, options);
    }

    dispatchEvent(event: Event): boolean {
        return this.performance.dispatchEvent(event);
    }
}
