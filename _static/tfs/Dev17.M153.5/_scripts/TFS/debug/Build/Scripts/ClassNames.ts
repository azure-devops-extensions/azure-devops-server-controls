export function combineClassNames(baseName: string, additionalName: string): string {
    if (!additionalName) {
        return baseName;
    }
    else {
        return baseName + " " + additionalName;
    }
}