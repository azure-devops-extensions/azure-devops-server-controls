/// <reference types="react" />
import * as React from "react";
import * as Q from "q";

import { ITaskDelegates, IInputControlStateBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { EditorExtensionButtonComponent, IEditorExtensionButtonComponentProps } from "DistributedTaskControls/SharedControls/InputControls/Components/EditorExtensionButtonComponent";
import { MultiLineInputComponent, IMultiLineInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Diag from "VSS/Diag";
import * as VSS from "VSS/VSS";

export interface ITaskMultilineInputProps extends IMultiLineInputProps {
    inputDefinition: TaskInputDefinition;
    taskDelegates: ITaskDelegates;
    getAllInputValues: () => IDictionaryStringTo<string>;
}

export interface ITaskMultilineInputState extends IInputControlStateBase<string> {
    formattedDisplayValue?: string;
}

/**
 * @brief Implements Multi-line input control with entry point for extension
 */
export class MultilineInputWithEditorExtensionComponent extends MultiLineInputComponent<ITaskMultilineInputProps, ITaskMultilineInputState> {

    constructor(props: ITaskMultilineInputProps) {
        super(props);
        this._inputDefinition = this.props.inputDefinition;
        this._displayFormat = this._getDisplayFormat();
        this._isMounted = false;
    }

    public componentDidMount(): void {
        this._isMounted = true;
        super.componentDidMount();
        this._updateDisplayTextValue();
    }

    public componentWillUnmount(): void {
        this._isMounted = false;
        super.componentWillUnmount();
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[MultilineInputWithEditorExtensionComponent.getControl]: Method called.");
        let state: ITaskMultilineInputState = this.state;
        let isDisabled: boolean = !!this._displayFormat || this.props.disabled;

        return (
            <div className="input-control-with-editor-extension">
                <div className="string-input-component-value" >
                    {super.getControl(state.formattedDisplayValue, isDisabled)}
                </div>
                {!this.props.disabled && <EditorExtensionButtonComponent onOkCallback={this.onValueChanged.bind(this)} {...this.props as IEditorExtensionButtonComponentProps} />}
            </div>
        );
    }

    protected onNotifyValidationResult = (errorMessage: string, value: string) => {
        // here, the value returned by TextField is the formattedDisplayValue
        // we need to pass the actual value instead of formatted value for error check
        // actual value is what is stored in the TaskStore, formatted value is just a more readable version of actual value.
        if (this.props.onNotifyValidationResult) {
            this.props.onNotifyValidationResult(errorMessage, this.state.value);
        }
    }

    protected onValueChanged = (newValue: string) => {
        this._updateDisplayTextValue(newValue);
        this.props.onValueChanged(newValue);
    }

    private _updateDisplayTextValue = (newValue?: string): void => {
        let state: ITaskMultilineInputState = this.state;
        let isValueUpdated: boolean = !(newValue == null);
        state.value = isValueUpdated ? newValue : state.value;

        if (this._displayFormat) {
            try {
                let parsedValue = JSON.parse(state.value);
                this._resolveTemplateString(this._displayFormat, parsedValue).then((formattedValue: string) => {
                    state.formattedDisplayValue = formattedValue;
                    this._setStateSafely(state);
                }, (error: any) => {
                    state.formattedDisplayValue = state.value;
                    this._setStateSafely(state);
                });
            }
            catch (e) {
                state.formattedDisplayValue = state.value;
                this._setStateSafely(state);
            }
        }
        else if (isValueUpdated) {
            this.setState(state);
        }
    }

    private _resolveTemplateString(templateString: string, replacementObject: any): IPromise<string> {
        let deferred = Q.defer<string>();

        if (!templateString) {
            return Q.resolve(replacementObject);
        }

        if (replacementObject && templateString.indexOf("{{") >= 0) {
            VSS.using(["DistributedTaskControls/Common/3rdParty/mustache"], (mustache) => {
                try {
                    templateString = mustache.render(templateString, replacementObject);
                    deferred.resolve(templateString);
                }
                catch (ex) {
                    // Invalid template - just return the raw property value
                    deferred.resolve(replacementObject);
                }
            });
        }
        else {
            deferred.resolve(templateString);
        }

        return deferred.promise;
    }

    private _setStateSafely = (newState: ITaskMultilineInputState) => {
        if (this._isMounted) {
            this.setState(newState);
        }
    }

    /**
     * @brief Display format converts the json value of the text and applies a Mustache template to it.
     * This allows the complex json data to be displayed in a user-friendly format.
     * The input component which displays the result is disabled as we do not want the user to modify the input
     * because it will update the json value in the store with the display value and the json value will become invalid.
     */
    private _getDisplayFormat = () => {
        return !!(this._inputDefinition && this._inputDefinition.properties) ? this._inputDefinition.properties["displayFormat"] : null;
    }

    private _inputDefinition: TaskInputDefinition;
    private _displayFormat: string;
    private _isMounted: boolean;
}