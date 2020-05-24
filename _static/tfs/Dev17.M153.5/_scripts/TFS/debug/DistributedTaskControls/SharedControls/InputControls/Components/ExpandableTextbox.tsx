/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ValidatableTextField } from "DistributedTaskControls/SharedControls/InputControls/Components/ValidatableTextField";
import { ClipboardUtils } from "DistributedTaskControls/Common/ClipboardUtils";

import * as CoreUtils from "VSS/Utils/Core";
import * as StrungUtils from "VSS/Utils/String";
import { showMessageDialog, IShowMessageDialogOptions } from "VSS/Controls/Dialogs";

import * as styles from "OfficeFabric/components/TextField/TextField.scss";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/ExpandableTextbox";

export interface IProps extends Base.IProps {
    borderless?: boolean;
    id?: string;
    value?: string;
    onChanged?: (newValue: string) => void;
    required?: boolean;
    disabled?: boolean;
    onGetErrorMessage?: (value: string) => string | PromiseLike<string>;
    deferredValidationTime?: number;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    type?: string;
    onBlur?: () => void;
    inputClassName?: string;
    textFieldRef?: (component: ValidatableTextField) => void;
    /** This won't triggered during mounting, only further validations are captured */
    onNotifyValidationResult?: (errorMessage: string, value: string) => void;
}


/**
 * This component implements an expandable text box. The basic design here is to 
 * use a hidden styling div to determine the dynamic height of the textarea control that is used for 
 * expandable text box. Whenever, the content of the textarea changes, 
 * the hidden div's content is set to textarea content. The computed height of hidden div is 
 * then set as the height of the text area control. 
 *  
 * Textarea control is selected because normal input textbox does not support text wrapping. 
 * Since textarea supports multiline, we need to custom handle keydown to ignore 'Enter'
 * 
 * We take a lot of dependency here on office fabric and this can break if office fabric changes
 * some of those dependencies. Below are all the dependencies:
 *
 * 1. Office fabric uses textarea for multiline text boxes. This will most likely not change
 * 2. The class name on the text area is 'ms-TextField-field' and that of one of the ancestors is ms-TextField ms-TextField--multiline. This can break. 
 */
export class Component extends Base.Component<IProps, Base.IStateless> {

    public componentDidMount() {

        let domNode = ReactDOM.findDOMNode(this);
        if (domNode) {

            // This assumes that office fabric uses textarea for multiline text box.
            this._input = $(domNode).find("textarea");
            this._input.attr({
                "id": this.props.id,
                "aria-describedby": this.props.ariaDescribedBy
            });

            this._input.css({
                "min-height": Component.c_minHeight,
                "max-height": Component.c_maxHeight,
                "overflow": "hidden"
            });

            let inputParent = $(domNode).find("." + styles.fieldGroup);
            inputParent.css({ "min-height": Component.c_parentMinHeight });

            // Custom handle keydown and paste events.
            this._input.on("keydown", this._keydownHandler);
            this._input.on("paste", this._pasteHandler);
            this._input.on("focusin", this._focusInHandler);
            this._input.on("focusout", this._focusOutHandler);
        }

        $(window).on("resize", this._windowResizeHandler);

        let sizingElement = this.refs[Component.c_sizingElementRefName];
        if (sizingElement) {
            this._sizingElement = $(sizingElement);
        }

        CoreUtils.delay(this, 0, () => {
            if (sizingElement) {

                // Initialize the width of the sizing element.
                if (this._input) {
                    this._sizingElement.width(this._input.width());
                }
            }
        });

        // Initialize the height of the text box. 
        this._adjustHeight(this.props.value, false);
    }

    public componentWillUnmount() {

        // Remove all event handlers 
        if (this._input) {
            this._input.off("keydown", this._keydownHandler);
            this._input.off("paste", this._pasteHandler);
            this._input.off("focusin", this._focusInHandler);
            this._input.off("focusout", this._focusOutHandler);
        }

        $(window).off("resize", this._windowResizeHandler);
    }

    public componentWillReceiveProps(newProps: IProps): void {
        if (newProps.value !== this._input.text()) {
            this._adjustHeight(newProps.value, false);
        }
    }

    public render(): JSX.Element {
        return (
            <div className="fabric-style-overrides">

                <div className="dtc-expandable-textbox">

                    {
                        /* 
                            Sizing div to determine the dynamic height of the textarea. The structure of dom has been mirrored
                            to match the structure of the fabric text field. Also the class names applied to all the elements in the
                            structure match that of TextField.
                        */
                    }
                    <div className={css("dtc-sizing-element-container", styles.root, styles.rootIsMultiline)} >
                        <div className={styles.fieldGroup}>
                            <div ref={Component.c_sizingElementRefName} className={css("dtc-sizing-element", styles.field)} />
                        </div>
                    </div>

                    <ValidatableTextField
                        borderless={this.props.borderless}
                        ref={(element) => { if (this.props.textFieldRef) { this.props.textFieldRef(element); } }}
                        id={this.props.id}
                        aria-labelledby={this.props.ariaLabelledBy}
                        aria-required={this.props.required}
                        value={this.props.value}
                        multiline={true}
                        onChanged={this._onChanged}
                        disabled={this.props.disabled}
                        resizable={false}
                        deferredValidationTime={this.props.deferredValidationTime || Component.c_defaultDeferredValidationTime}
                        onGetErrorMessage={this._onGetErrorMessage}
                        aria-disabled={this.props.disabled}
                        type={this.props.type}
                        onBlur={this.props.onBlur}
                        inputClassName={this.props.inputClassName}
                        onNotifyValidationResult={this.props.onNotifyValidationResult} />
                </div>
            </div>
        );
    }

    private _onChanged = (newValue: string): void => {
        this._adjustHeight(newValue);
        if (this.props.onChanged) {
            this.props.onChanged(newValue);
        }
    }

    private _onGetErrorMessage = (newValue: string) => {
        this._adjustHeight(newValue);
        if (this.props.onGetErrorMessage) {
            return this.props.onGetErrorMessage(newValue);
        }
        else {
            return StrungUtils.empty;
        }
    }

    private _windowResizeHandler = (eventObject: JQueryEventObject) => {

        // This is to handle sizing when window is resized or splitter is resized
        if (this._input && this._sizingElement) {
            this._sizingElement.width(this._input.width());
            this._adjustHeight(this._input.text());
        }
    }

    private _pasteHandler = (eventObject: JQueryEventObject) => {

        let pastedText: string = this._getPastedText(eventObject);
        if (pastedText) {

            // Prevent pasting large contents
            if (pastedText.length > Component.c_maxPasteContentSize) {
                let options: IShowMessageDialogOptions = {
                    title: Resources.ErrorText,
                    buttons: [{
                        id: "ok-button",
                        text: Resources.OK
                    }]
                };

                showMessageDialog(Resources.ClipboardPasteLargeDataError, options);
                eventObject.preventDefault();
            }
            else {

                CoreUtils.delay(this, 0, () => {

                    // Replace new lines in the textbox.
                    let text = this._input.text();
                    let newLineStrippedText = text.replace(this.c_newLinePattern, " ");

                    // Replace only if newline was present.
                    if (newLineStrippedText !== text) {
                        this._adjustHeight(newLineStrippedText);
                        this._input.text(newLineStrippedText);
                        this._onChanged(newLineStrippedText);
                    }
                });
            }
        }
    }

    private _getPastedText(eventObject: JQueryKeyEventObject): string {
        let clipboardEvent = eventObject.originalEvent as ClipboardEvent;
        return ClipboardUtils.getPastedText(clipboardEvent);
    }

    private _keydownHandler = (eventObject: JQueryKeyEventObject) => {

        // Using number directly here for keycode to avoid dependency on VSS/Utils/UI.
        let enterKeyCode = 13;
        if (eventObject.keyCode === enterKeyCode) {

            // Do not allow enter key.
            eventObject.preventDefault();
            eventObject.stopPropagation();
        }
        else {
            this._adjustHeight(this._input.text());
        }
    }

    private _focusInHandler = (eventObject: JQueryKeyEventObject) => {
        this._adjustHeight(this._input.text());
    }

    private _focusOutHandler = (eventObject: JQueryKeyEventObject) => {
        this._adjustHeight(this._input.text(), false);
    }

    private _adjustHeight(newValue: string, increaseHeight: boolean = true): void {
        if (this._sizingElement) {

            // Set the value on the sizing element. 
            if (increaseHeight) {

                // Append an addendum so that the line height increases slightly before reaching the end of the line. 
                // This smoothens the typing experience. 
                newValue += Component.c_addendum;
            }

            this._sizingElement.text(newValue);
            CoreUtils.delay(this, 0, () => {
                if (this._input) {

                    // Get the computed height of the sizing element and set the height of the text area. 
                    let heightToSet = this._sizingElement.height();
                    let currentHeight = this._input.height();

                    if (heightToSet !== currentHeight) {
                        this._input.height(Math.min(Component.c_maxHeight, heightToSet));

                        // Add/remove the below class to show scrollbar only on hover or focus.
                        if (heightToSet > Component.c_maxHeight) {
                            this._input.css({ "overflow": "auto" });
                        }
                        else {
                            this._input.css({ "overflow": "hidden" });
                        }
                    }
                }
            });
        }
    }

    private c_newLinePattern = /(\r\n|\n|\r)/gm;

    // Max height of text area.
    private static readonly c_maxHeight = 32 * 20;
    private static readonly c_minHeight = 30;
    private static readonly c_parentMinHeight = 32;

    private static readonly c_sizingElementRefName = "sizingElement";
    private static readonly c_maxPasteContentSize = 8 * 1024;
    private static readonly c_defaultDeferredValidationTime = 500;

    private _sizingElement: JQuery;
    private _input: JQuery;
    public static readonly c_addendum = " an addendum to smoothen height increase";

}
