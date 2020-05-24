import * as _TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";

export function normalizePath(path: string, separator: string): string {
    path = path.replace(/[\/\\]+/g, separator).trim().toLowerCase();
    if (path[path.length - 1] === separator) {
        path = path.substring(0, path.length - 2);
    }

    return path;
}

export function getActiveDescendantIndex(
    items: _TreeStore.IItem[],
    path: string,
    separator: string,
    matchPartial: boolean = false): number {
    const isMatch = (left: string, right: string) => {
        if (matchPartial) {
            return left.indexOf(right) >= 0;
        }
        else {
            return left === right;
        }
    }

    let idx = -1;
    const itemCount = items.length;
    path = normalizePath(path, separator);
    for (let i = 0; i < itemCount; i++) {
        if (isMatch(items[i].fullName.toLowerCase(), path)) {
            idx = i;
            break;
        }
    }

    return idx;
}