import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { isDefinitionNameValid, isDefinitionFolderValid } from "Build.Common/Scripts/Validation";

const MAX_INT_VALUE = 2147483647;

export function isValidId(value: string): boolean {
    if (!value) {
        return false;
    }

    let match = value.match(/^\d+$/);
    let number = parseInt((match && match[0])? match[0] : "0", 10);
    if (number && number > 0 && number <= MAX_INT_VALUE) {
        return true;
    }

    return false;
}

export var getPathInvalidErrorMessage = (text: string) => {
    return !!text ? (isDefinitionFolderValid(text) ? "" : BuildResources.BuildFolderNameInvalid) : BuildResources.CannotBeEmptyText;
};

export var getDefinitionNameInvalidErrorMessage = (text: string) => {
    return !!text ? (isDefinitionNameValid(text) ? "" : BuildResources.BuildDefinitionNameInvalid) : BuildResources.CannotBeEmptyText;
};