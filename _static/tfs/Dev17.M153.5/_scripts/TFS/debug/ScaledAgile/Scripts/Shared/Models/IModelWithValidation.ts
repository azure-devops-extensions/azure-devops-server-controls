/**
 * What:
 * Possible state for a model class.
 *
 * Why:
 * Allow to provide more detail to the user depending of the state of the model
 */
export enum ValidationState {
    /**
     * Initial state, which tell the system that no validation code has been executed yet for the life of this model class.
     */
    NotEvaluated = 0,
    /**
     * The model comply to all validations rules
     */
    Success = 1,
    /**
     * Valid but still need to provide information to the user about some additionnal detail.
     */
    Warning = 2,
    /**
     * Error means that the model is in a bad state
     */
    Error = 3
}

/**
 * What: Interface that model class can inherit to give information about its validation state
 *
 * Why: Allow the UI to verify that a model extends the interface to provide feedback to the user
 */
export interface IModelWithValidation {
    /**
     * What: The state of the model
     * Why: Give information from the Action to the Store/Component about the data it is receiving
     */
    validationState: ValidationState;

    /**
     * What: Message linked to the validation state
     * Why: Some state needs to give futher information like when in error
     */
    message?: string;
}