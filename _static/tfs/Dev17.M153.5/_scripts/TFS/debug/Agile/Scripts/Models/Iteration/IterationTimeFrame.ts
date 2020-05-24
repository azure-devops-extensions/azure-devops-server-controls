export enum IterationTimeframe {
    Past = 0,
    Current = 1,
    Future = 2
}

export function parseIterationTimeframe(value: number | string): IterationTimeframe {
    if (value != null) {
        if (typeof value === "number") {
            return value;
        } else {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            return IterationTimeframe[value];
        }
    }
}