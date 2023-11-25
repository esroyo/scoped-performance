export class ScopedPerformance implements Performance {
    public readonly randomId: string;
    public readonly glue = '::' as const;
    protected readonly prototypeMap = {
        mark: PerformanceMark.prototype,
        measure: PerformanceMeasure.prototype,
    } as const;

    constructor(
        protected performance: Performance = globalThis.performance,
        protected randomIdGenerator: () => string = globalThis.crypto.randomUUID
            .bind(globalThis.crypto),
    ) {
        this.randomId = this.randomIdGenerator();
    }

    protected prefixName(name: string): string {
        return `${this.randomId}${this.glue}${name}`;
    }

    protected unprefixName(name: string): string {
        return name.replace(this.prefixName(''), '');
    }

    protected isScopedName(name: string): boolean {
        return name.startsWith(this.prefixName(''));
    }

    protected filterMap(entries: PerformanceEntryList): PerformanceEntryList {
        return entries.filter(({ name }) => this.isScopedName(name)).map((
            entry,
        ) => Object.setPrototypeOf({
            ...entry.toJSON(),
            name: this.unprefixName(entry.name),
        }, this.prototypeMap[entry.entryType as 'mark' | 'measure']));
    }

    /** Returns a timestamp representing the start of the performance measurement. */
    get timeOrigin() {
        return this.performance.timeOrigin;
    }

    /**
     * Stores a timestamp with the associated scoped name (auto scoped).
     */
    mark(markName: string, options?: PerformanceMarkOptions): PerformanceMark {
        return this.performance.mark(this.prefixName(markName), options);
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
            this.prefixName(measureName),
            // @ts-ignore to avoid erroneous signature implementation on Deno side
            typeof startMarkOrOptions === 'string'
                ? this.prefixName(startMarkOrOptions)
                : startMarkOrOptions,
            endMark ? this.prefixName(endMark) : undefined,
        );
    }

    now() {
        return this.performance.now();
    }

    /**
     * Removes the stored timestamp with the associated name (auto scoped).
     *
     * When no markName is provided, will remove all the stored marks related to this scope.
     */
    clearMarks(markName?: string): void {
        if (markName) {
            return this.performance.clearMarks(this.prefixName(markName));
        }
        this.performance.getEntriesByType('mark').forEach(({ name }) => {
            if (this.isScopedName(name)) {
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
            return this.performance.clearMeasures(this.prefixName(measureName));
        }
        this.performance.getEntriesByType('measure').forEach(({ name }) => {
            if (this.isScopedName(name)) {
                this.performance.clearMeasures(name);
            }
        });
    }

    getEntries(): PerformanceEntryList {
        return this.filterMap(this.performance.getEntries());
    }

    getEntriesByType(type: string): PerformanceEntryList {
        return this.filterMap(this.performance.getEntriesByType(type));
    }

    getEntriesByName(name: string, type?: string): PerformanceEntryList {
        return this.filterMap(
            this.performance.getEntriesByName(this.prefixName(name), type),
        );
    }

    toJSON() {
        return this.performance.toJSON();
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void {
        return this.performance.addEventListener(type, listener, options);
    }

    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions | undefined,
    ): void {
        return this.performance.removeEventListener(type, listener, options);
    }

    dispatchEvent(event: Event): boolean {
        return this.performance.dispatchEvent(event);
    }
}
