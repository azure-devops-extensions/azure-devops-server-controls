import * as Utils_String from "VSS/Utils/String";

import { IDependencyGroup } from "Feed/Common/Types/IDependency";

export class NuGetDependencyHelper {
    public static formatVersionRanges(dependencyGroups: IDependencyGroup[]): void {
        for (const dependencyGroup of dependencyGroups) {
            for (const dependency of dependencyGroup.dependencies) {
                dependency.versionRange = NuGetDependencyHelper._getFormattedVersionRange(dependency.versionRange);
            }
        }
    }

    /** Formats range of package dependencies. */
    private static _getFormattedVersionRange(range: string): string {
        if (range && range.length > 0) {
            // Handle the case where upper version bound and lower version bound of the dependency are the same.
            const replacedArray = range.replace(/[\[\]\(\)]/g, "").split(",");
            const version = range.replace(/[\[\]\(\),]/g, "").trim();

            if (replacedArray[0] && replacedArray[1]) {
                if (replacedArray[0].trim() === replacedArray[1].trim()) {
                    return Utils_String.format(" ({0})", replacedArray[0].trim()); // Example: [1.0, 1.0]
                }
            }

            // Regexes
            const strictlyLessThan = /\(, *([0-9]|[a-z]|[A-Z]|\.|-)*\)/; // Example: (, 1.0)
            const lessThanOrEqual = /\(, *([0-9]|[a-z]|[A-Z]|\.|-)*\]/; // Example: (, 1.0]
            const greaterThanOrEqual = /\[ *([0-9]|[a-z]|[A-Z]|\.|-)*, *([0-9]|[a-z]|[A-Z]|\.|-)*\)/; // Example: [1.0,)
            const exactly = /\[[^,]*\]/; // Example: [1.0]
            const singleVersion = /^([0-9]|[a-z]|[A-Z]|\.|-)*$/; // Example: 1.0 := [1.0)
            const strictlyGreaterThan = /\(([0-9]|[a-z]|[A-Z]|\.|-)*, *\)/; // Example (1.0, )
            const exclusiveInterval = /\(([0-9]|[a-z]|[A-Z]|\.|-)*, *([0-9]|[a-z]|[A-Z]|\.|-)*\)/; // Example: (1.0, 2.0)
            const inclusiveInterval = /\[([0-9]|[a-z]|[A-Z]|\.|-)*, *([0-9]|[a-z]|[A-Z]|\.|-)*\]/; // Example: [1.0, 2.0]

            if (strictlyLessThan.test(range)) {
                return Utils_String.format(" (< {0})", version);
            } else if (strictlyGreaterThan.test(range)) {
                return Utils_String.format(" (> {0})", version);
            } else if (lessThanOrEqual.test(range)) {
                return Utils_String.format(" (\u2264 {0})", version);
            } else if (greaterThanOrEqual.test(range)) {
                return Utils_String.format(" (\u2265 {0})", version);
            } else if (exclusiveInterval.test(range)) {
                const versionSplit = range
                    .replace(/[\[\]\(\)]/g, "")
                    .trim()
                    .split(",");
                return Utils_String.format(" (> {0} && < {1})", versionSplit[0].trim(), versionSplit[1].trim());
            } else if (inclusiveInterval.test(range)) {
                const versionSplit = range
                    .replace(/[\[\]\(\)]/g, "")
                    .trim()
                    .split(",");
                return Utils_String.format(
                    " (\u2265 {0} && \u2264 {1})",
                    versionSplit[0].trim(),
                    versionSplit[1].trim()
                );
            } else if (exactly.test(range)) {
                return Utils_String.format(" ({0})", version);
            } else if (singleVersion.test(range)) {
                return Utils_String.format(" (\u2265 {0})", range);
            } else {
                return "";
            }
        }

        return "";
    }
}
