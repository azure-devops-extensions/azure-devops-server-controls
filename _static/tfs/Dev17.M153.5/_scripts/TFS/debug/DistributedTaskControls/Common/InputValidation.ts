import { ITaskInputError } from "DistributedTaskControls/Common/Types";

export class InputValidation {
    /**
     * Updates input dictionary with latest value, this is used to determine whether to skip or proceed when error payload is received
     */
    public updateInputValue(inputName: string, value: string) {
        this._inputLatestValue[inputName] = value;
    }

    /**
     * Based on input state stored, returns whether the input is valid or not
     */
    public isValid(inputName: string): boolean {
        return !this._inputInvalidStates[inputName];
    }

    /**
     * Clears the invalid state and input value for input given
     */
    public clear(inputName: string) {
        delete this._inputInvalidStates[inputName];
        delete this._inputLatestValue[inputName];
    }

    /**
     * If there is any pending input error dispatch, this would then update the task invalid state
     * returns false if there's no pending operation to perform
     */
    public tryHandlePendingInputErrorDispatch(inputName: string, value: string): boolean {
        const payload = this._pendingInputErrorPayloadDispatch[inputName];
        if (!payload) {
            return false;
        }

        this._tryUpdateInputValidationInvalidState(payload);

        delete this._pendingInputErrorPayloadDispatch[payload.name];
    }

    /**
     * Defers or performs the input invalid state update based on the input's latest value and payload's value
     * returns false if the update is defered, true if the update is successfully executed
     */
    public tryHandleUpdateInputError(payload: ITaskInputError): boolean {
        if (this._tryUpdateInputValidationInvalidState(payload)) {
            return true;
        }
        else {
            // defer update, we don't have latest value yet
            this._pendingInputErrorPayloadDispatch[payload.name] = payload;
        }

        return false;
    }

    private _tryUpdateInputValidationInvalidState(payload: ITaskInputError): boolean {
        let updated = false;
        if (payload.value === this._inputLatestValue[payload.name]) {
            this._updateInputInvalidState(payload);
            updated = true;
        }

        return updated;
    }


    private _updateInputInvalidState(payload: ITaskInputError) {
        if (payload.message) {
            this._inputInvalidStates[payload.name] = !!payload.message;
        }
        else {
            delete this._inputInvalidStates[payload.name];
        }
    }

    private _inputInvalidStates: IDictionaryStringTo<boolean> = {};
    private _inputLatestValue: IDictionaryStringTo<string> = {};

    private _pendingInputErrorPayloadDispatch: IDictionaryStringTo<ITaskInputError> = {};
}