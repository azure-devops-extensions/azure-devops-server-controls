/**
 * Represents the state of a form field
 */
export interface IFormFieldState<T> {
    /** Current value of the field */
    value: T;
    /** Is the field pristine? i.e Never edited */
    pristine?: boolean;
    /** What is the current validation state of the field */
    validationResult: IValidationResult;
    /** Key to use for the field */
    key?: string;
}

/**
 * Represents field validation information
 */
export interface IValidationResult {
    /** The error message, blank if valid */
    errorMessage?: string;
    /** Is the field valid? */
    isValid: boolean;
}