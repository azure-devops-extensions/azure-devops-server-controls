import { BuildRequestValidationResult, ValidationResult } from "TFS/Build/Contracts";

import * as StringUtils from "VSS/Utils/String";

export interface IErrorAndWarningMessage {
    errorMessage: string;
    warningMessage: string;
}

export class QueueBuildValidationResultHelper {

    public static getErrorAndWarningMessage(validationResults: BuildRequestValidationResult[]): IErrorAndWarningMessage {
        let errorMessage: string = StringUtils.empty;
        let warningMessage: string = StringUtils.empty;

        if (validationResults && validationResults.length > 0) {
            let errors = validationResults.filter((result: BuildRequestValidationResult) => {
                return result.result === ValidationResult.Error;
            });

            if (errors.length > 0) {
                errorMessage = this._joinValidateResults(errors);
            }
            else {
                warningMessage = this._joinValidateResults(validationResults);
            }
        }
        // Taking into account server errors also which comes not in form of array, like no build queue permissions
        else if (validationResults) {
            errorMessage = this._getErrorMessageFromServer(<any>validationResults);
        }

        return {
            errorMessage: errorMessage,
            warningMessage: warningMessage
        };
    }

    private static _joinValidateResults(validateResults: BuildRequestValidationResult[]): string {
        let resultMessages = validateResults.map((validationResult: BuildRequestValidationResult) => {
            return validationResult.message;
        });

        resultMessages = resultMessages.filter((message: string) => !!message);
        return resultMessages.join(",");
    }

    private static _getErrorMessageFromServer(validationResult: any): string {
        let errorMessage: string = StringUtils.empty;
        if (validationResult) {
            errorMessage = validationResult.message || StringUtils.empty;
        }
        if (validationResult && validationResult.serverError && errorMessage.length === 0) {
            errorMessage = validationResult.serverError.message || StringUtils.empty;
        }

        return errorMessage;
    }
}
