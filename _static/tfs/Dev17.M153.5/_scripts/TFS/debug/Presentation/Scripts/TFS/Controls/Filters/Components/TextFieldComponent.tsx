import * as React from "react";

import * as Utils_String from "VSS/Utils/String";

import { TextField } from "OfficeFabric/TextField";
import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent";

export interface TextFieldComponentProps extends IFilterComponentProps {
    placeholder?: string;
    /**
     * The method is used to get the validation error message and determine whether the input value is valid or not.
     *
     *   When it returns string:
     *   - If valid, it returns empty string.
     *   - If invalid, it returns the error message string and the text field will
     *     show a red border and show an error message below the text field.
     *
     *   When it returns Promise<string>:
     *   - The resolved value is display as error message.
     *   - The rejected, the value is thrown away.
     *
     */
    onGetErrorMessage?: (value: string) => string | PromiseLike<string>;
}

export interface TextFieldComponentState {
    value: string;
}

export class TextFieldComponent extends React.Component<TextFieldComponentProps, TextFieldComponentState> {
    private readonly _deferrValidationMilliSeconds = 500;

    constructor(props: TextFieldComponentProps){
        super(props);
        this.state = {
            value: props.filterValue ? props.filterValue : "",
        };
    }

    public componentWillReceiveProps(nextProps: TextFieldComponentProps) {
        if (nextProps.filterValue !== this.props.filterValue) {
            this.setState({
                value: nextProps.filterValue ? nextProps.filterValue : "",
            });
        }
    }

    public render(): JSX.Element {
        return (
            <TextField
                className="filters-textfield"
                value={this.state.value}
                onChanged={this._onChanged}
                onNotifyValidationResult={this._onNotifyValidationResult}
                deferredValidationTime={this._deferrValidationMilliSeconds}
                placeholder={this.props.placeholder}
                onGetErrorMessage={this.props.onGetErrorMessage}
            />
        );
    }

    private _onChanged = (value: string): void => {
        this.setState({
            value,
        });
    }

    private _onNotifyValidationResult = (errorMessage: string, value: string): void => {
        if (errorMessage === "" && this.state.value === value) {
            this.props.onUserInput(this.props.filterKey, value);
        }
    }
}