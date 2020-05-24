/// <reference types="react" />

import * as React from "react";
import ReactDOM = require("react-dom");

import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import { Component } from "DistributedTaskControls/Common/Components/Base";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Common from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputValidator } from "DistributedTaskControls/SharedControls/InputControls/InputValidator";
import { KeyCodes } from "DistributedTaskControls/Common/ShortKeys";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";

import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import { logError } from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";

export abstract class InputBase<T, P extends Common.IInputControlPropsBase<T>, S extends Common.IInputControlStateBase<T>> extends Component<P, S> {

    public componentWillMount(): void {
        this._domId = InputControlUtils.getId(this.getType());

        this.setState({
            value: this.props.value
        } as S);
    }

    public componentWillReceiveProps(nextProps: P): void {
        this.setState({
            value: nextProps.value
        } as S);
    }

    public render(): JSX.Element {
        let info: JSX.Element = null;

        if (!!this.props.infoProps) {
            if (this.props.infoProps.calloutContentProps
                && !this.props.infoProps.calloutContentProps.calloutContentAriaLabel
                && !this.props.infoProps.calloutContentProps.calloutHeader
                && !!this.props.label) {
                this.props.infoProps.calloutContentProps.calloutContentAriaLabel =
                    Utils_String.format(Resources.InfoCalloutAriaLabel, this.props.label);
            }

            info = (
                <InfoButton
                    iconName={this.props.infoProps.iconName}
                    isIconFocusable={this.props.disabled}
                    iconAriaLabel={this.props.infoProps.iconAriaLabel || (this.props.label && Utils_String.format(Resources.MoreInformationForInputLabel, this.props.label))}
                    calloutContent={this.props.infoProps.calloutContentProps}
                    ref={(element) => { this._infoElement = element; }}
                    cssClass={(this.getType() === Common.InputControlType.INPUT_TYPE_BOOLEAN) ? "info-input-without-label" : "info-input-with-label"} />
            );
        }
        let className: string = this.getInputClassName();
        return (
            <div className={className}
                ref={this._resolveRef("_container")}
                id={this.getInputFieldComponentElementId()}
                onFocus={this._handleFocus}
                onBlur={this._handleBlur}
                onKeyDown={this._handleKeyDown}>
                {
                    /* If label is present in props then add label element */
                    this.addLabelControl() &&
                    <div>
                        <Label required={this.props.required}
                            className="input-field-label"
                            id={this.getInputFieldLabelElementId()}
                            htmlFor={this.getInputFieldControlElementId()}  
                            {...this.props.ariaLevel ?
                                {
                                    role: "heading",
                                    "aria-level": this.props.ariaLevel
                                } : {}
                            } >
                            {this.props.label}
                        </Label>
                        {
                            /* Add info next to label element */
                            info
                        }
                        {
                            /* Add additional controls next to label element */
                            this.getAdditonalLabelControls()
                        }
                    </div>
                }
                {
                    this._getDescriptionElement()
                }

                {this.getControl()}

                {
                    /* If label is not present in props then add info next to the control */
                    (!this.addLabelControl()) && info
                }

                {
                    /* Add a footer for the control if footer is given */
                    this._getFooter()
                }

            </div>
        );
    }

    private _getDescriptionElement(): JSX.Element {
        let description: string = null;
        if (this.props.ariaDescription) {
            description = this.props.ariaDescription;
        }
        else {
            if (this.props.infoProps && this.props.infoProps.calloutContentProps && this.props.infoProps.calloutContentProps.calloutMarkdown) {
                description = this.props.infoProps.calloutContentProps.calloutMarkdown;
            }
        }

        /* Add description element if description is present in the props in any form */
        if (description) {
            return (<div className="input-field-description hidden" id={this.getInputFieldDescriptionElementId(true)}>
                {description}
            </div>);
        }
    }

    private _doesDescriptionExists(): boolean {
        //  Is aria description available or if the info callout markdown text is available
        if (this.props.ariaDescription || (this.props.infoProps && this.props.infoProps.calloutContentProps && this.props.infoProps.calloutContentProps.calloutMarkdown)) {
            return true;
        }
        return false;
    }

    public componentDidMount() {
        this._mounted = true;
    }

    public componentWillUnmount() {
        this._mounted = false;
    }

    public abstract getType(): string;

    protected abstract getControl(): JSX.Element;

    protected getInputClassName(): string {
        return "input-field-component";
    }

    protected getAdditonalLabelControls(): JSX.Element {
        return null;
    }

    protected addLabelControl(): boolean {
        return !!(this.props.label);
    }

    protected getInputValue(): T {
        return this.state.value;
    }

    protected onValueChanged = (newValue: T) => {
        if (!this.props.disabled) {
            this.setState({
                value: newValue
            } as S);
            this.props.onValueChanged(newValue);
        }
    }

    protected getContainer(): HTMLDivElement {
        return this._container;
    }

    private _getFooter(): JSX.Element {
        //ToDo: Attach the control to this text as a description for accessibility
        if (this.props.getFooterElement) {
            return (
                <div ref={this._resolveRef("_inputbaseFooterContainer")} aria-live="polite" />
            );
        }
    }

    // We are using focus and blur handlers as notification channels to the consumer here.
    // We notify the consumer that the input has focus or has lost focus.
    // This way we give the consumer a chance to react as it wishes to.

    //Focus handler
    private _handleFocus = () => {
        if (this.props.getFooterElement && this._inputbaseFooterContainer) {

            //Passing true as input control has focus and Base wants to notify the consumer about it
            this._renderFooterElement(true);
        }
    }

    //Blur Handler
    private _handleBlur = (ev: React.FocusEvent<HTMLDivElement>) => {
        if (this._mounted) {
            let relatedTarget = ev.relatedTarget as HTMLElement || document.activeElement;

            if (this._container && !this._container.contains(relatedTarget)) {
                if (this.props.getFooterElement && this._inputbaseFooterContainer) {

                    //Passing false as input control has lost focus and Base wants to notify the consumer about it
                    this._renderFooterElement(false);
                }
            }
        }
    }

    private _renderFooterElement(inputIsFocussed: boolean) {
        let footerElement = this.props.getFooterElement(inputIsFocussed, this.getFooterDescriptionElementId());

        if (footerElement) {
            ReactDOM.render(footerElement, this._inputbaseFooterContainer);
        }
    }

    protected getErrorMessage = (newValue: T) => {
        let returnValue: string | PromiseLike<string> = Utils_String.empty;

        if (!!this.props.getErrorMessage) {
            returnValue = this.props.getErrorMessage(newValue);
        }

        // do further validation if needed
        const asyncValidator = this.props.asyncValidator;
        if (!returnValue && asyncValidator) {
            const stringValue = this.getStringValue(newValue);
            if (stringValue != null && InputValidator.shouldPerformValidate(stringValue)) {
                if (asyncValidator.type === Common.InputValidationType.Input) {
                    if (!asyncValidator.data) {
                        logError("validation should have data for input type");
                        return returnValue;
                    }

                    returnValue = InputValidator.getInputErrorMessage(this.getStringValue(newValue), {
                        expression: asyncValidator.data.expression,
                        reason: asyncValidator.data.reason
                    });
                }
                else {
                    returnValue = InputValidator.getExpressionErrorMessage(stringValue);
                }
            }
        }

        return returnValue;
    }

    protected getStringValue(value: T): string {
        let stringValue = null;
        if (typeof value !== "object") {
            stringValue = (value as string).toString();
        }
        else {
            logError(`Input with label ${this.props.label} has value that cannot be converted to a string, it should have getStringValue implementation.
                      Input validation cannot be performed.`);
        }

        return stringValue;
    }

    protected getInputFieldLabelElementId(): string {
        return "INPUT-FIELD-LABEL-" + this._domId;
    }

    protected getInputFieldDescriptionElementId(noFooterDesription: boolean = false): string {
        if (this._doesDescriptionExists()) {
            let describedById = "INPUT-FIELD-DESC-" + this._domId;
            if (!noFooterDesription && !!this.props.getFooterElement) {
                describedById = describedById.concat(" ", this.getFooterDescriptionElementId());
            }
            return describedById;
        }
        return null;
    }

    protected getFooterDescriptionElementId(): string {
        return "INPUT-FIELD-FOOTER-DESC-" + this._domId;
    }

    protected getInputFieldControlElementId(): string {
        return "INPUT-FIELD-" + this._domId;
    }

    private getInputFieldComponentElementId(): string {
        return "INPUT-FIELD-CONTAINER-" + this._domId;
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e && e.ctrlKey && e.altKey) {
            switch (e.keyCode) {
                case KeyCodes.Help:
                    if (this._infoElement) {
                        this._infoElement.toggleInfoCalloutState();
                    }
                    break;
                case KeyCodes.Link:
                    if (!!this.props.infoProps) {
                        if (!AppContext.instance().isCapabilitySupported(AppCapability.LinkProcessParameters)) {
                            break;
                        }
                        if (!!this.props.infoProps.linkToProcessParameterDelegate && !!this._infoElement) {
                            this.props.infoProps.linkToProcessParameterDelegate();
                        }
                        if (!!this.props.infoProps.unlinkToProcessParameterDelegate && !!this._infoElement) {
                            this.props.infoProps.unlinkToProcessParameterDelegate();
                        }
                    }
                    break;
            }
        }
    }

    // Marked as protected for UT
    protected _infoElement: InfoButton;
    private static readonly c_defaultDeferredOnChangeDuration = 500;

    private _inputbaseFooterContainer: HTMLDivElement;
    private _container: HTMLDivElement;
    private _domId: string;

    private _mounted: boolean;
}

