/// <reference types="react" />

import * as React from "react";

import { IconButton } from "OfficeFabric/Button";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { TextField } from "OfficeFabric/TextField";
import { css } from "OfficeFabric/Utilities";

import { KeyCode } from "VSS/Utils/UI";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IFolderItem, IChildItem, IDetailsRowItem, FolderConstants, RowType } from "DistributedTaskControls/SharedControls/Folders/Types";
import { FolderDetailsListBase, IStateBase, IPropsBase } from "DistributedTaskControls/SharedControls/Folders/FolderDetailsListBase";
import { FolderUtils } from "DistributedTaskControls/SharedControls/Folders/FolderUtils";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Folders/FolderPickerComponent";

export interface IProps<F extends IFolderItem, C extends IChildItem> extends IPropsBase<F, C> {
    isReadOnly: boolean;
    value: string;
    error: string;
    inputClassName: string;
    setInitialFocusOnTextField: boolean;
    isTextFieldRequired: boolean;
    onFolderPathChanged: (newValue: string) => void;
    calloutClassName?: string;
}

export interface IState extends IStateBase {
    isCalloutVisible: boolean;
}

export class FolderPickerComponent<F extends IFolderItem, C extends IChildItem> extends FolderDetailsListBase<F, C, IProps<F, C>, IState> {

    protected shouldShowChevronForEmptyFolder(): boolean {
        return false;
    }

    public render(): JSX.Element {
        return (<div className="dtc-folderpicker-container">
            <div ref={this._resolveRef("_calloutTargetElement")} onKeyDown={e => this._onTextAreaKeyDown(e)}>
                <TextField
                    className={"dtc-folderpicker-folderpath"}
                    ref={this._resolveRef("_folderPickerTextField")}
                    label={Resources.FolderPickerLabel}
                    value={this.props.value}
                    onChanged={this._onValueChanged}
                    required={this.props.isTextFieldRequired}
                    onGetErrorMessage={(value: string) => { return this.props.error; }}
                    disabled={this.props.isReadOnly}
                    aria-disabled={this.props.isReadOnly}
                    inputClassName={css("dtc-folderpicker-input", this.props.inputClassName)} />
                {
                    !this.props.isReadOnly &&
                    <IconButton
                        iconProps={{ iconName: "ChevronDown" }}
                        className="dtc-folderpicker-dropdown-button"
                        onClick={this._toggleCallout}
                        disabled={this.props.isReadOnly}
                        ariaLabel={Resources.ShowFoldersDropDownLabel}
                        ariaDescription={Resources.ShowFoldersDropDownDescription}
                    />
                }
            </div>
            {
                this.state.isCalloutVisible &&
                (<Callout gapSpace={0}
                    target={".dtc-folderpicker-folderpath .dtc-folderpicker-input"}
                    role={"rowgroup"}
                    onDismiss={this._onCalloutDismiss}
                    className={this.props.calloutClassName}
                    setInitialFocus={true}
                    isBeakVisible={false}
                    directionalHint={DirectionalHint.bottomLeftEdge}
                    calloutWidth={this._calloutWidth}
                    directionalHintFixed={true} >
                    {this._getFolderRows()}
                </Callout>)
            }
        </div>);
    }

    public componentWillMount() {
        // initially expand till the current path
        let expandedFolderIds = this._getExpandedFolderIds();
        this.initializeDetailsRows(expandedFolderIds, this.props.folders, this.props.childItems);
    }

    public componentDidMount() {
        if (this._calloutTargetElement) {
            const inputElement = this._calloutTargetElement.getElementsByClassName("dtc-folderpicker-input")[0];
            this._calloutWidth = inputElement ? inputElement.clientWidth : 0;
        }

        if (this._folderPickerTextField && this.props.setInitialFocusOnTextField) {
            this._folderPickerTextField.focus();
            this._folderPickerTextField.select();
        }
    }

    private _getExpandedFolderIds(): number[] {
        let path: string = this.props.value;

        if (path && this.props.folders && Utils_String.localeIgnoreCaseComparer(path, FolderConstants.PathSeparator) !== 0) {
            let result: number[] = [1];
            let foldersMap: IDictionaryStringTo<number> = {};
            this.props.folders.forEach((folder: F) => {
                foldersMap[folder.path] = folder.id;
            });

            let depth: number = path.split(FolderConstants.PathSeparator).length;
            while (depth > 0) {
                let folderId = foldersMap[path];
                result.push(folderId);
                path = FolderUtils.getParentFolderPath(path);
                depth--;
            }

            return result;
        }
        else {
            return [1];
        }
    }

    private _onTextAreaKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
        if (e.altKey && e.keyCode === KeyCode.DOWN) {
            this._toggleCallout();

            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _toggleCallout = (): void => {
        this._setCalloutVisibility(!this.state.isCalloutVisible);
    }

    private _onCalloutDismiss = (): void => {
        this._setCalloutVisibility(false);
    }

    private _setCalloutVisibility = (isCalloutVisible: boolean): void => {
        this.setState({
            isCalloutVisible: isCalloutVisible
        });
    }

    private _getValue(displayValue: string): string {
        if (Utils_String.equals(displayValue, this.props.rootFolderName, true)) {
            return FolderConstants.PathSeparator;
        }

        return displayValue;
    }

    private _getFolderRows(): JSX.Element[] {
        let rows: JSX.Element[] = [];
        if (this.state.rows && this.state.rows.length > 0) {
            this.state.rows.forEach((row: IDetailsRowItem, index: number) => {
                if (row.rowType === RowType.Folder) {
                    rows.push(this._getFolderRow(row, index));
                }
            });
        }

        return rows;
    }

    private _getFolderRow(rowItem: IDetailsRowItem, index: number): JSX.Element {
        const folderRowStyle = {
            width: this._calloutWidth - 2 // For border-margin to be visible on focus
        };
        const expandedState = rowItem.hasChildren ? !!rowItem.isExpanded : null;
        return (<div className={"folder-picker-folder-row"}
            tabIndex={0}
            role={"row"}
            aria-rowindex={index}
            aria-expanded={expandedState}
            aria-label={Utils_String.localeFormat("{0} - {1}", Resources.FolderPickerRowLabel, rowItem.name)}
            style={folderRowStyle}
            key={rowItem.id}
            aria-level={rowItem.depth}
            onKeyDown={(event) => { this._onRowKeyDown(event, rowItem); }}
            onClick={(e) => { this._onRowClicked(e, rowItem); }} >
            {this.getFolderNameElement(rowItem)}
        </div>);
    }

    private _onRowClicked(event: any, item: IDetailsRowItem) {
        this._selectFolder(item);
    }

    private _onRowKeyDown(event: any, item: IDetailsRowItem): void {

        if (event.altKey || event.ctrlKey) {
            return;
        }

        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._selectFolder(item);
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        let eventHandled = false;

        switch (event.keyCode) {

            case KeyCode.DOWN:
                let nextFocusable = event.target.nextElementSibling;
                if (!nextFocusable && event.target.parentElement) {
                    const folderRows = event.target.parentElement.getElementsByClassName("folder-picker-folder-row");
                    nextFocusable = (folderRows && folderRows.length > 0) ? folderRows[0] : null;
                }
                if (nextFocusable) {
                    nextFocusable.focus();
                }
                eventHandled = true;
                break;

            case KeyCode.UP:
                let previousFocusable = event.target.previousElementSibling;
                if (!previousFocusable && event.target.parentElement) {
                    const folderRows = event.target.parentElement.getElementsByClassName("folder-picker-folder-row");
                    previousFocusable = (folderRows && folderRows.length > 0) ? folderRows[folderRows.length - 1] : null;
                }
                if (previousFocusable) {
                    previousFocusable.focus();
                }
                eventHandled = true;
                break;

            default:
                this.handleRowKeyDownEvent(event, item);
        }

        if (eventHandled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _selectFolder(rowItem: IDetailsRowItem): void {
        this._onValueChanged(rowItem.item.path);
    }

    private _onValueChanged = (newValue: string): void => {
        newValue = this._getValue(newValue);
        this.props.onFolderPathChanged(newValue);
        this._setCalloutVisibility(false);
    }

    private _calloutTargetElement: HTMLElement;
    private _folderPickerTextField: HTMLTextAreaElement | HTMLInputElement;
    private _calloutWidth: number = 0;
}