import * as React from "react";

import { TextField, ITextFieldProps } from "OfficeFabric/TextField";
import { BaseComponent } from "OfficeFabric/Utilities";

export interface IValidatableTextFieldState {
    onNotifyValidationResult: (errorMessage: string, value?: string) => void;
}

/**
 * @brief Renders TextField. 
 * This also makes sure that validation notification doesn't happen during mounting for TextField
 * This is useful when an action is being triggered by notification handler, since triggering notification during mount might eventually case cascading actions, which we should avoid
 */
export class ValidatableTextField extends BaseComponent<ITextFieldProps, IValidatableTextFieldState> {
    private _textField: TextField = null;

    constructor(props: ITextFieldProps) {
        super(props);

        this.state = {
            onNotifyValidationResult: null
        };
    }

    public render(): JSX.Element {
        const { onNotifyValidationResult, ...props } = this.props;

        return <TextField
            ref={this._resolveRef("_textField")}
            onNotifyValidationResult={this.state.onNotifyValidationResult}
            {...props}
        />;
    }

    public focus() {
        if (this._textField) {
            this._textField.focus();
        }
    }

    public componentWillReceiveProps(nextProps: ITextFieldProps) {
        /**
         * <TextField> by default does validation on mount, there's validateOnLoad prop we can send to tell it to not do that
         *   but, we do need validation to happen on mount, it's just that, we don't want validation notification to happen
         *   it doesn't make sense for office fabric to do that for us, so by default we don't send that prop, instead we decide when to send it
         *   which is after mounting, this life cycle method won't be called during mounting, that is why we enable validation
         */

        // if state says don't validate, but props has it, ask component to validate
        if (!this.state.onNotifyValidationResult && nextProps.onNotifyValidationResult) {
            this.setState({
                onNotifyValidationResult: nextProps.onNotifyValidationResult
            });
        }
    }
}