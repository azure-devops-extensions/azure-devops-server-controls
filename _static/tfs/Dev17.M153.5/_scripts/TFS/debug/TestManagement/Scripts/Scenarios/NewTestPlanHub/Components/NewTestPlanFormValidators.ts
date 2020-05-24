import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    IValidationResult
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export class NewTestPlanFormValidators {

    public static validateName(name: string): IValidationResult {
        if (!name.trim()) {
            return {
                isValid: false,
                errorMessage: Resources.RequiredFieldErrorMessage
            };
        }

        return { isValid: true };
    }

    public static validateNodeValue(selectedPath: string, selectedNode: INode) {
        if (!selectedPath) {
            return {
                isValid: false,
                errorMessage: Resources.RequiredFieldErrorMessage
            };
        }

        if (!selectedNode) {
            return {
                isValid: false,
                errorMessage: Resources.InvalidPathErrorMessage
            };
        }

        return { isValid: true };
    }


}
