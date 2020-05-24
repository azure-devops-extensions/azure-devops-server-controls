/// <reference types="react" /> 

import React = require("react");
import { css } from "OfficeFabric/Utilities";

// Presentational components
import { CopyButton } from "VSSPreview/Flux/Components/CopyButton";

import * as TFSResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!Presentation/Components/InlineRename";

export interface IInlineRenameProps extends React.ClassAttributes<any> {
    /**
     * Additional CSS classes to apply to the component.
     */
    className?: string;

    /**
     * The text to display.
     */
    text: string;

    /**
     * The text to display when the input control is cleared.
     */
    placeHolder: string;

    /**
     * Whether the input control can be edited.
     */
    isReadOnly?: boolean;

    /**
     * An optional validation callback that will disable saving if it returns false.
     */
    validate?: (val: string) => boolean;

    /**
     * A callback that is invoked on save.
     */
    submit: (val: string) => void;

    /**
     * Aria label to use for this input.
     */
    ariaLabel?: string;

    pageUrl: string;
    id: string;
    type: string;

    /**
     * Additional CSS classes to apply to the input control.
     */
    inputClassName?: string;
}

export interface IInlineRenameState {
    isFocusIn: boolean;
    text: string;
}

export class InlineRename extends React.Component<IInlineRenameProps, any> {
    constructor(props) {
        super(props);

        this.state = { isFocusIn: false, text: props.text };
    }

    private _htmlFmt = "<span style='font-size:11pt;'><a href='{0}' target='_blank' rel='noopener noreferrer'>{1} {2}</a>: {3}</span>";

    private _input = null;
    private _saveButtonRef = null;
    private _undoButtonRef = null;

    public componentWillReceiveProps(nextProps): void {
        if (!this._isDirty()) {
            this.setState({ text: nextProps.text });
        }
    }

    public render(): JSX.Element {

        let canSave: boolean = false;
        let isDirty: boolean = this._isDirty();

        if (!this.props.isReadOnly && isDirty) {
            canSave = !this.props.validate || this.props.validate(this._trimmedInputText());
        }

        return (
            <div 
                className={css(this.props.className, "inline-rename", { "focused": this.state.isFocusIn }, { "editable": !this.props.isReadOnly }, { "dirty": isDirty })}
                onFocus={this._handleFocus}
                onBlur={this._handleBlur}>
                <input
                    aria-label={this.props.ariaLabel}
                    aria-readonly={this.props.isReadOnly}
                    type="text"
                    className={css("bowtie-widget", "inline-rename-input", this.props.inputClassName, { "dirty": isDirty })}
                    onKeyDown={this._onKeyDown}
                    onChange={!this.props.isReadOnly ? this._onChange : null}
                    readOnly={this.props.isReadOnly}
                    value={this.state.text}
                    placeholder={this.props.placeHolder}
                    ref={(d) => this._input = d} />

                <CopyButton copyAsHtml={true} copyText={this._getHtmlText()} />

                {!this.props.isReadOnly ? <IconButton cssClass={"save-button"} iconCssClass={"bowtie-save"} title={TFSResources.InlineEdit_Save} isEnabled={canSave} onClick={this._handleSaveClick} ref={(d) => this._saveButtonRef = d} /> : null}
                {!this.props.isReadOnly ? <IconButton cssClass={"undo-button"} iconCssClass={"bowtie-edit-undo"} title={TFSResources.Edit_Undo} isEnabled={isDirty} onClick={this._handleUndoClick} ref={(d) => this._undoButtonRef = d}/> : null}
            </div>
        );
    }

    private _getHtmlText(): string {
        return Utils_String.format(this._htmlFmt, this.props.pageUrl, this.props.type, this.props.id, Utils_String.htmlEncode(this.props.text));
    }

    private _trimmedInputText(): string {
        return this.state.text.trim();
    }

    private _isDirty() {
        return this.props.text !== this.state.text;
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.keyCode === KeyCode.ENTER) {
            if (this._canSave()) {
                this._save();
                this._input.blur();
            }
        }
        else if (event.keyCode === KeyCode.ESCAPE) {
            if (this._isDirty()) {
                this._undo();
            }
            this._input.blur();
        }
    }

    private _onChange = (event): void => {
        let newText: string = event.target.value;
        this.setState({ text: newText });
    }

    private _handleSaveClick = (): void => {
        if (this._canSave()) {
            this._save();
            this._saveButtonRef.blur();
        }
    }

    private _handleUndoClick = (): void => {
        this._undo();
        this._undoButtonRef.blur();
    }

    private _save() {
        let trimmedInputText = this._trimmedInputText();

        // If the trimmed text is different than the current title text,
        // then save it. Otherwise just reset title text (to original title).
        if (this.props.text !== trimmedInputText) {
            this.props.submit(trimmedInputText);
        }
        else {
            this.setState({
                text: this.props.text
            });
        }
    }

    private _canSave(): boolean {
        return !this.props.isReadOnly &&
            this._isDirty() &&
            this.props.validate(this._trimmedInputText());
    }

    private _undo() {
        if (!this.props.isReadOnly &&
            this._isDirty()) {
            this.setState({
                text: this.props.text
            });
        }
    }

    private _handleFocus = (e: any): void => {
        this.setState({ isFocusIn: true });
    }

    private _handleBlur = (e: any): void => {
        this.setState({ isFocusIn: false });
    }
}

export interface IIConButtonProps extends React.ClassAttributes<any> {
    cssClass: string;
    iconCssClass: string;
    isEnabled?: boolean;
    onClick: any;
    title: string;
}

export class IconButton extends React.Component<IIConButtonProps, any> {

    private _component = null;

    public render(): JSX.Element {
        let cssClasses = ["icon-button"];

        if (this.props.cssClass) {
            cssClasses.push(this.props.cssClass);
        }

        let isEnabled = this.props.isEnabled != null ? this.props.isEnabled : true;
        if (!isEnabled) {
            cssClasses.push("disabled");
        }

        return (
            <button
                disabled={!this.props.isEnabled}
                aria-label={this.props.title}
                className={cssClasses.join(" ")}
                ref={(d) => this._component = d}
                onClick={this._handleClick}>
                <i className={"bowtie-icon " + this.props.iconCssClass}></i>
            </button>
        );
    }

    private _handleClick = (e: any): void => {
        this.props.onClick();
    }

    public blur() {
        this._component.blur();
    }
}

