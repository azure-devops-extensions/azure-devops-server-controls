import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import Utils_String = require("VSS/Utils/String");

import { IModelWithValidation, ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

export class WizardBusinessLogic {
    public static MAX_NAME_LENGTH = 128;
    public static MAX_DESCRIPTION_LENGTH = 256;
    // Invalid characters are InvalidFileNameChars in mscorlib/system/io/path.cs. We just check for printable characters on the client.
    public static INVALID_PRINTABLE_NAME_CHARACTER_CODES: number[] = [
        0x22, // "
        0x3c, // <
        0x3e, // >
        0x7c, // |
        0x3a, // :
        0x2a, // *
        0x3F, // ?
        0x5C, // \
        0x2F, // /
    ];

    public static _isInvalidCharacterFound(text: string): boolean {
        if (text) {
            for (let i = 0, length = text.length; i < length; ++i) {
                if (WizardBusinessLogic.INVALID_PRINTABLE_NAME_CHARACTER_CODES.indexOf(text.charCodeAt(i)) > -1) {
                    return i > -1;
                }
            }
        }
        return false;
    }

    public static validatePlanName(planName: string): IModelWithValidation {
        let validationResults: IModelWithValidation = {
            message: "",
            validationState: ValidationState.Success
        };
        planName = planName.trim();
        if (!planName || planName.length === 0) {
            validationResults = {
                message: ScaledAgileResources.PlanEmptyNameMessage,
                validationState: ValidationState.Error
            };
        } else if (planName.length > WizardBusinessLogic.MAX_NAME_LENGTH) {
            validationResults = {
                message: Utils_String.format(ScaledAgileResources.PlanNameTooLongMessage, WizardBusinessLogic.MAX_NAME_LENGTH),
                validationState: ValidationState.Error
            };
        } else if (WizardBusinessLogic._isInvalidCharacterFound(planName)) {
            validationResults = {
                message: ScaledAgileResources.PlanNameContainsInvalidCharacters_Client,
                validationState: ValidationState.Error
            };
        }

        return validationResults;
    }

    public static validatePlanDescription(description: string): IModelWithValidation {
        if (description && description.length > WizardBusinessLogic.MAX_DESCRIPTION_LENGTH) {
            return {
                message: Utils_String.format(ScaledAgileResources.PlanDescriptionTooLongMessage, WizardBusinessLogic.MAX_DESCRIPTION_LENGTH),
                validationState: ValidationState.Error
            };
        }

        return {
            message: "",
            validationState: ValidationState.Success
        };
    }
}