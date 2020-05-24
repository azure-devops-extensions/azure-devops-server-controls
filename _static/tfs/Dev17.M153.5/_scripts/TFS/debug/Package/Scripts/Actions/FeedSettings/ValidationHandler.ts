import * as Utils_String from "VSS/Utils/String";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

export interface IValidationResult {
    /**
     * The name of the component associated with the error message
     */
    componentKey: string;

    /**
     * The error message. Null or empty for no error.
     */
    errorMessage: string;
}

/**
 * Keeps track of validation errors in components
 */
export class ValidationHandler {
    public static handle(state: IFeedSettingsState, emit: () => void, validation: IValidationResult): void {
        if (validation == null) {
            state.validationErrorBag = {};
            // components like button will get enabled or disabled based on validation result
            emit();
            return;
        }

        let hasChange = false;

        if (validation.errorMessage != null && validation.errorMessage !== Utils_String.empty) {
            if (state.validationErrorBag[validation.componentKey] == null) {
                // there is an error now but there was previously no error
                hasChange = true;
                state.validationErrorBag[validation.componentKey] = validation.errorMessage;
            } else if (state.validationErrorBag[validation.componentKey] !== validation.errorMessage) {
                // there is an error now, there was previously an error, but it was different
                hasChange = true;
                state.validationErrorBag[validation.componentKey] = validation.errorMessage;
            }
        } else if (state.validationErrorBag[validation.componentKey] != null) {
            // there isn't an error now, but previously there was one
            hasChange = true;
            state.validationErrorBag[validation.componentKey] = null;
        }

        if (hasChange) {
            emit();
        }
    }
}
