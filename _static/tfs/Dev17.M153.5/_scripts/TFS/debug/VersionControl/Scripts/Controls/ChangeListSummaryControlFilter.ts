export interface Filter {
    path: string;
    recursive: boolean;
}

export function summaryFilterEquals(filter1: Filter, filter2: Filter) {
    let path1: string = null,
        path2: string = null,
        recursive1 = false,
        recursive2 = false;

    if (filter1) {
        if (filter1.path) {
            path1 = filter1.path;
        }
        if (filter1.recursive) {
            recursive1 = true;
        }
    }
    if (filter2) {
        if (filter2.path) {
            path2 = filter2.path;
        }
        if (filter2.recursive) {
            recursive2 = true;
        }
    }

    return path1 === path2 && recursive1 === recursive2;
}