/**
 * @brief Performs Task input validation
 */
import { InputValidationData } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputValidationTypes } from "DistributedTaskControls/Generated/DistributedTask.Constants";

import {
    InputValidationRequest,
    ExpressionValidationItem,
    InputValidationItem
} from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import { VssConnection } from "VSS/Service";
import { getDefaultWebContext } from "VSS/Context";

export class InputValidator {
    public static shouldPerformValidate(inputValue: string): boolean {
        // best effort, may be a variable is being used, nope, no validation
        if (inputValue && inputValue.indexOf("$") > -1) {
            return false;
        }

        return true;
    }

    public static getExpressionErrorMessage(expressionToValidate: string): PromiseLike<string> {
        const inputKey = "expression";
        let inputValidationRequest = { inputs: {} } as InputValidationRequest;
        inputValidationRequest.inputs[inputKey] = {
            type: InputValidationTypes.Expression,
            value: expressionToValidate
        } as ExpressionValidationItem;

        return InputValidator._getValidationMessage(inputValidationRequest, inputKey);
    }

    public static getInputErrorMessage(inputValue: string, inputValidation: InputValidationData): PromiseLike<string> {
        const inputKey = "input";
        let inputValidationRequest = { inputs: {} } as InputValidationRequest;
        inputValidationRequest.inputs[inputKey] = {
            type: InputValidationTypes.Input,
            value: inputValidation.expression,
            context: {
                value: inputValue
            },
            reason: inputValidation.reason
        } as InputValidationItem;

        return InputValidator._getValidationMessage(inputValidationRequest, inputKey);
    }

    private static _getValidationMessage(validationRequest: InputValidationRequest, key: string): PromiseLike<string> {
        return this._getTaskAgentClient().validateInputs(validationRequest).then((inputValidationRequestResult) => {
            const validation = inputValidationRequestResult.inputs[key];
            if (validation.isValid) {
                return "";
            }
            else {
                return validation.reason;
            }
        });
    }

    private static _getTaskAgentClient() {
        if (!InputValidator._taskAgentClient) {
            InputValidator._taskAgentClient = this._getVssConnection().getHttpClient<TaskAgentHttpClient>(TaskAgentHttpClient);
        }

        return InputValidator._taskAgentClient;
    }

    private static _getVssConnection() {
        if (!InputValidator._vssConnection) {
            InputValidator._vssConnection = new VssConnection(getDefaultWebContext());
        }

        return InputValidator._vssConnection;
    }

    private static _vssConnection: VssConnection;
    private static _taskAgentClient: TaskAgentHttpClient;
}