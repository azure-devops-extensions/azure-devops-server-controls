
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class DefinitionNameUtils {
    
    public static getNonConflictingDefinitionName(currentDefinitionName: string, fetchedDefinitionName: string[]): string {
        let currentNameForRegex: string = currentDefinitionName.replace(RegexConstants.RegexSpecialCharactersRegex, "\\$&");
        // ignoring case as server treats build definition name as case insensitive
        let regexForName: RegExp = RegexConstants.DefaultDefinitionNameFormatRegex(currentNameForRegex);
        let nonConflictingNamesIndices: number[] = [];

        fetchedDefinitionName.forEach((definitionName) => {
            let regexMatch = regexForName.exec(definitionName);

            // first index will contain the whole name and second index will contain the number
            if (!!regexMatch && regexMatch.length === 2) {
                let nonConflictingIndex: number = parseInt(regexMatch[1]);
                nonConflictingNamesIndices.push(nonConflictingIndex);
            }
        });

        Utils_Array.sortIfNotSorted<number>(nonConflictingNamesIndices, this._defaultNumberComparer);

        // Find the first missing index
        let missingIndex: number = -1;
        nonConflictingNamesIndices.every((nonConflictingNamesIndex: number, index: number) => {
            if (nonConflictingNamesIndex === index + 1) {
                return true;
            }
            else {
                // exit from the loop after setting the missing index
                missingIndex = index + 1;
                return false;
            }
        });

        // if missing index is still not set, means there were no holes and it should be assigned the new largest index
        if (missingIndex === -1) {
            missingIndex = nonConflictingNamesIndices.length + 1;
        }

        return Utils_String.localeFormat(Resources.DefinitionDefaultNameFormat, currentDefinitionName, missingIndex.toString());
    }

    public static isNameAlreadyTaken(definitionName: string, fetchedDefinitionNames: string[]): boolean {
        let lookedUpDefinitionName: string = Utils_Array.first(fetchedDefinitionNames, (fetchedDefinitionName: string) => {
            return !Utils_String.localeIgnoreCaseComparer(definitionName.trim(), fetchedDefinitionName.trim());
        });

        return !!lookedUpDefinitionName;
    }

    private static _defaultNumberComparer = (number1: number, number2: number): number => {
        return number1 - number2;
    }
}