import * as React from "react";
import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import { validatePagePathAndTitle } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/Header";

export interface HeaderProps {
    title: string;
    parentPath?: string;
    errorMessage?: string
    commandBarProps?: ICommandBarProps;
    editableTitle?: boolean;
    onChanged?(value: string): void;
    onNotifyTitleValidationResult?(errorMessage: string, value: string): void;
    setFocusOnTitle?: boolean;
}

export interface IStateless { }

export class Header extends React.PureComponent<HeaderProps, IStateless> {
    private _textField: TextField;

    public render(): JSX.Element {
        const commandBarProps: ICommandBarProps = this.props.commandBarProps ? this.props.commandBarProps : { items: [] };
        const headerClassName: string = this.props.editableTitle ? "wiki-header editable" : "wiki-header";
        
        return (
            <div className={headerClassName}>
                {!this.props.editableTitle &&
                    <TooltipHost
                        hostClassName={"title-tooltip-host"}
                        content={this.props.title}
                        overflowMode={TooltipOverflowMode.Self}>
                        <span className={"title label-text"}>{this.props.title}</span>
                    </TooltipHost>
                }
                {this.props.editableTitle &&
                    <TextField
                        autoFocus={this.props.setFocusOnTitle && this.props.editableTitle}
                        className={"title"}
                        defaultValue={this.props.title}
                        ariaLabel={WikiResources.PageTitleAriaLabel}
                        placeholder={WikiResources.PageTitlePlaceHolderText}
                        onGetErrorMessage={this._validatePageTitle}
                        onChanged={this.props.onChanged}
                        errorMessage={this.props.errorMessage}
                        onNotifyValidationResult={this._onNotifyTitleValidationResult}
                        spellCheck={false}
                        validateOnLoad={false}
                        validateOnFocusOut={true}
                        onDrop={this._onDrop}
                        ref={this._saveTextFieldRef}
                    />
                }
                {this._shouldRenderCommandBar() &&
                    <CommandBar
                        items={commandBarProps.items}
                        farItems={commandBarProps.farItems}
                        className={"wiki-commands-bar"}
                    />
                }
            </div>
        );
    }

    public get title(): string {
        return this._textField
            ? this._textField.value     // Editable mode - Title is got from the _textField
            : this.props.title;         // Non-editable mode - Title is got from the props
    }

    @autobind
    private _saveTextFieldRef(textField: TextField): void {
        this._textField = textField;
    }

    private _shouldRenderCommandBar(): boolean {
        const commandBarProps = this.props.commandBarProps;

        return commandBarProps
            && ((commandBarProps.items && commandBarProps.items.length > 0)
                || (commandBarProps.farItems && commandBarProps.farItems.length > 0));
    }

    private _validatePageTitle = (pageTitle: string): string => {
        if (!this.props.editableTitle) {
            // Do not validate if text not editable
            return "";
        }

        return validatePagePathAndTitle(this.props.parentPath, pageTitle);
    }

    private _onNotifyTitleValidationResult = (errorMessage: string, pageTitle: string): void => {
        if (!this.props.editableTitle) {
            // Do not notify if text not editable
            return;
        }

        this.props.onNotifyTitleValidationResult(errorMessage, pageTitle);
    }

    private _onDrop = (event: React.DragEvent<HTMLInputElement>): void => {
        event.preventDefault();
        event.stopPropagation();
    }
}
