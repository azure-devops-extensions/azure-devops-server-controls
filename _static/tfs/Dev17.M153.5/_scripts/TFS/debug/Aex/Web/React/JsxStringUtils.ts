import * as React from "react";

interface IStringSplitPart {
    isPlaceholder: boolean;
    placeholderId?: number;
    stringPart?: string;
}

function split(template: string): IStringSplitPart[] {
    const stringParts: string[] = template.split(/{\d+}/m);
    const matchedParts = template.match(/{\d+}/mg);
    const result: IStringSplitPart[] = [];
    for (let i = 0; i < stringParts.length - 1; ++i) {
        const stringPart: string = stringParts[i];
        result.push({
            isPlaceholder: false,
            stringPart,
        });
        if (matchedParts && matchedParts[i]) {
            const matchArray = matchedParts[i].match(/\d+/);
            if (matchArray) {
                const placeholderId: number = parseInt(matchArray[0], undefined);
                result.push({
                    isPlaceholder: true,
                    placeholderId,
                });
            }
        }
    }
    result.push({
        isPlaceholder: false,
        stringPart: stringParts[stringParts.length - 1],
    });
    return result;
}

/**
 * Format string template into React.ReactNode
 * @param template
 * @param args JSX element must be keyed
 */
export function jsxStringFormat(template: string, ...args: React.ReactNode[]): React.ReactNode {
    // prepare separators
    const parts = split(template);
    return parts.map((part: IStringSplitPart): React.ReactNode => {
        if (part.isPlaceholder) {
            return args[part.placeholderId as number];
        } else {
            return part.stringPart;
        }
    });
}
