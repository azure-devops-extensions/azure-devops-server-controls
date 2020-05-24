import * as Diag from "VSS/Diag";

export interface IBatchResult<T> {
    done: boolean;
    data?: T;
}

export function partition<T>(values: T[], selector: (T) => string): IDictionaryStringTo<T[]>;
export function partition<T>(values: T[], selector: (T) => number): IDictionaryNumberTo<T[]>;
export function partition<T>(values: T[], selector: (T) => string | number): any {
    const map = {};
    values.forEach(value => {
        const key = selector(value);
        if (!map.hasOwnProperty(key)) {
            map[key] = [];
        }
        map[key].push(value);
    });
    return map;
}

export interface IBatchIterator<T> {
    next(): IBatchResult<T>;
}

export class BatchException<T> extends Error {
    constructor(message?: string, public readonly batchResults?: T[], public readonly errorResults?: Error[]) {
        super(message);
    }
}

export class BatchGenerator<T> implements IBatchIterator<T[]> {
    private current;
    private readonly length;

    constructor(public readonly input: T[], public readonly batchSize: number) {
        Diag.Debug.assertParamIsNotNull(input, "input");
        if (batchSize <= 0 || batchSize !== Math.floor(batchSize)) {
            throw new RangeError("Batch size must be a positive integer");
        }
        this.current = 0;
        this.length = input.length;
    }

    public next(): IBatchResult<T[]> {
        if (this.current >= this.length) {
            return { done: true };
        }

        const result = {
            done: false,
            data: this.input.slice(this.current, this.current + this.batchSize)
        };

        this.current += result.data.length;

        return result;
    }

    get batchCount(): number {
        return Math.ceil(this.input.length / this.batchSize);
    }
}

export class TransformingBatchGenerator<T, S> implements IBatchIterator<S[]> {
    private readonly generator: IBatchIterator<T[]>;
    constructor(input: T[], batchSize: number, private transformer: (batch: T) => S) {
        this.generator = new BatchGenerator(input, batchSize);
    }

    public next(): IBatchResult<S[]> {
        const { done, data } = this.generator.next();

        let transformedData: S[];
        if (data && data.length) {
            transformedData = data.map(this.transformer);
        }

        return {
            done,
            data: transformedData
        };
    }
}

export class BatchExecutor {
    public static readonly MAX_PARALLELISM = 3;

    public static executeSerially<T, S>(generator: IBatchIterator<T>, action: (batch: T) => Promise<S>): Promise<S[]> {
        return BatchExecutor.execute(generator, 1, action);
    }

    public static executeInParallel<T, S>(generator: IBatchIterator<T>, action: (batch: T) => Promise<S>): Promise<S[]>;
    public static executeInParallel<T, S>(
        generator: IBatchIterator<T>,
        maxParallelism: number,
        action: (batch: T) => Promise<S>
    ): Promise<S[]>;
    public static executeInParallel<T, S>(
        generator: IBatchIterator<T>,
        // tslint:disable-next-line:ban-types
        maxParallelism: number | Function,
        action?: (batch: T) => Promise<S>
    ): any {
        if (typeof maxParallelism === "function") {
            action = maxParallelism as (batch: T) => Promise<S>;
            maxParallelism = BatchExecutor.MAX_PARALLELISM;
        }

        if (maxParallelism < 1 || maxParallelism > BatchExecutor.MAX_PARALLELISM) {
            throw new Error(`maxParallelism must be between 1 and ${BatchExecutor.MAX_PARALLELISM}`);
        }

        return BatchExecutor.execute(generator, maxParallelism, action);
    }

    private static async execute<T, S>(
        generator: IBatchIterator<T>,
        maxParallelism: number = 1,
        action: (batch: T) => Promise<S>
    ): Promise<S[]> {
        const executing: Array<Promise<void>> = [];
        const batchResults: S[] = [];
        const batchErrors: Error[] = [];

        const executeBatch = async (data: T) => {
            try {
                batchResults.push(await action(data));
            } catch (error) {
                batchErrors.push(error);
            }

            const batch = generator.next();
            if (!batch.done) {
                await executeBatch(batch.data);
            }
        };

        while (maxParallelism-- > 0) {
            const batch = generator.next();
            if (batch.done) {
                break;
            }
            executing.push(executeBatch(batch.data));
        }

        await Promise.all(executing);

        if (batchErrors.length) {
            throw new BatchException(undefined, batchResults, batchErrors);
        }
        return batchResults;
    }
}
