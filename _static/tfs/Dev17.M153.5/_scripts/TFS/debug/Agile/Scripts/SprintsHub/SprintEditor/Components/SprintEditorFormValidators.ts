import { NodeUtilities } from "Agile/Scripts/Common/NodeUtilities";
import { IValidationResult } from "Agile/Scripts/Common/ValidationContracts";
import * as SprintEditorResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.SprintEditor";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import Utils_String = require("VSS/Utils/String");

export const VALID_NAME_REGEX = /^[^\\\/$?*:"&<>#%|\+]*$/;
export const ILLEGAL_REGEX = /^(prn|com1|com2|com3|com4|com5|com6|com7|com8|com9|com10|lpt1|lpt2|lpt3|lpt4|lpt5|lpt6|lpt7|lpt8|lpt9|nul|con|aux|\.|\.\.)$/;
export const MAX_NAME_LENGTH = 255;

export namespace SprintEditorFormValidators {
    export function validateName(name: string, parentNode: INode): IValidationResult {
        if (!name) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.RequiredErrorMessage
            };
        }

        if (name.length > MAX_NAME_LENGTH) {
            return {
                isValid: false,
                errorMessage: Utils_String.format(SprintEditorResources.NameTooLongErrorMessage, MAX_NAME_LENGTH.toString())
            }
        }

        if (!VALID_NAME_REGEX.test(name)) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.NameInvalidCharactersErrorMessage
            };
        };

        if (ILLEGAL_REGEX.test(name)) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.NameInvalidNameErrorMessage
            };
        }

        if (parentNode && parentNode.children) {
            for (const sibling of parentNode.children) {
                if (Utils_String.equals(sibling.name, name, true)) {
                    return {
                        isValid: false,
                        errorMessage: SprintEditorResources.NameAlreadyExistsErrorMessage
                    };
                }
            }
        }

        return {
            isValid: true
        };
    }

    export function validateStartDate(startDate: Date): IValidationResult {
        if (!startDate) {
            return {
                isValid: false
            };
        }

        return {
            isValid: true
        };
    }

    export function validateEndDate(startDate: Date, endDate: Date): IValidationResult {
        if (!endDate) {
            return {
                isValid: false
            };
        }

        if (startDate && startDate.getTime() > endDate.getTime()) {
            return {
                isValid: false
            }
        }

        return {
            isValid: true
        };
    }

    export function validateParentIterationValue(parentPath: string, parentNode: INode, backlogIterationNode: INode): IValidationResult {
        if (!parentPath) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.RequiredErrorMessage
            };
        }

        if (!parentNode) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.IterationDoesNotExistErrorMessage
            };
        }

        if (backlogIterationNode && !Utils_String.equals(backlogIterationNode.guid, parentNode.guid, true) && !NodeUtilities.isDescendant(backlogIterationNode, parentNode)) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.SelectedNodeNotDescendantError
            };
        }

        return { isValid: true };
    }

    export function validateSelectedIteration(selectedPath: string, selectedNode: INode, rootNode: INode, selectedPaths: string[], backlogIterationNode: INode): IValidationResult {
        if (!selectedPath) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.RequiredErrorMessage
            };
        }

        if (!selectedNode) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.IterationDoesNotExistErrorMessage
            };
        }

        if (selectedNode === rootNode) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.RootIterationSelectedMessage
            };
        }

        if (backlogIterationNode && !NodeUtilities.isDescendant(backlogIterationNode, selectedNode)) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.SelectedNodeNotDescendantError
            };
        }

        if (selectedPaths.some((existingPath) => Utils_String.equals(existingPath, selectedPath, true))) {
            return {
                isValid: false,
                errorMessage: SprintEditorResources.IterationAlreadySelectedErrorMessage
            };
        }

        return { isValid: true };
    }
}