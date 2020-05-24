export interface QueryResult<T> {
    pending: boolean;
    result: T;
}

export function createQueryResult<T>(result: T): QueryResult<T> {
    return {
        pending: false,
        result: result
    };
}