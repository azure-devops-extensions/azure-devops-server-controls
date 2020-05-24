/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { IInputControlPropsBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";

import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ArtifactsPickerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerActionsCreator";
import { ArtifactsPickerStore, IArtifactsPickerState, IArtifactItem } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerStore";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { Label } from "OfficeFabric/Label";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import { KeyCode } from "VSS/Utils/UI";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerComponent";

export class ITreeData {
    itemToSetSizeMap: IDictionaryStringTo<number>;
    itemToLevelMap: IDictionaryStringTo<number>;
    itemToPositionsMap: IDictionaryStringTo<number>;
}

interface IArtifactsPickerComponentProps extends ComponentBase.IProps{
    readonly: boolean;
}
export class ArtifactsPickerComponent extends ComponentBase.Component<IArtifactsPickerComponentProps, IArtifactsPickerState> {

    constructor(props: IArtifactsPickerComponentProps) {
        super(props);
        this._store = StoreManager.GetStore<ArtifactsPickerStore>(ArtifactsPickerStore, this.props.instanceId);
    }

    public componentWillMount(): void {
        this._setState();

        this._actionCreator = ActionCreatorManager.GetActionCreator<ArtifactsPickerActionsCreator>(ArtifactsPickerActionsCreator, this.props.instanceId);
        this._store.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        let state: IArtifactsPickerState = this.state;
        if (!state) {
            return null;
        }

        let selectedAll = Utils_String.equals(PipelineTypes.PipelineArtifactDownloadInputConstants.All, state.mode, true);
        let selectedArtifactsInStringFormat = selectedAll ? Utils_String.empty : state.artifactItems.join(";");
        let artifactItems: JSX.Element[] = this._getArtifactItemControls(state, selectedAll);

        const ariaAliasLabelId = "select-artifact-alias-label-" + state.artifactAlias;
        const ariaVersionLabelId = "select-artifact-version-label-" + state.artifactAlias;
        const description = Utils_String.equals(state.artifactsCountLabel, Resources.NoneText, true) ?
            Utils_String.localeFormat(Resources.SkippedAllArtifactsText, state.artifactAlias, state.defaultVersion) :
            Utils_String.localeFormat(Resources.SelectedArtifactsDescription, state.artifactAlias, state.defaultVersion, state.artifactsCountLabel);

        return (<div className="artifact-picker-container" key={state.artifactAlias}>
            <div className={css(state.isExpanded ? "artifact-picker-button-selected" : "artifact-picker-button")}
                onClick={() => this._onArtifactInputControlClick()}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => this._handleArtifactInputKeyDown(event)}
                role={"button"}
                tabIndex={0}
                aria-label={Utils_String.localeFormat(Resources.SelectArtifactsFormat, state.artifactAlias)}
                aria-expanded={state.isExpanded}
                title={description} >
                <table className="artifact-picker-table">
                    <tbody>
                        <tr>
                            <td className="artifact-icon-column">
                                <div className="artifact-type">
                                    <TooltipHost content={state.artifactType}>
                                        <i className={css("artifact-type-icon", "bowtie-icon", state.iconClass)} />
                                    </TooltipHost>
                                </div>
                            </td>
                            <td className="artifact-alias-column"><div className="artifact-alias"><span id={ariaAliasLabelId}> {state.artifactAlias} </span></div></td>
                            <td className="artifact-version-column"><div className="artifact-version"><span id={ariaVersionLabelId}> {state.defaultVersion} </span></div></td>
                            {
                                state.isExpanded &&
                                <td className="artifact-chevron-column"><div className="chevron bowtie-icon bowtie-chevron-up-light" aria-label="Expand"></div></td>
                            }
                            {
                                !state.isExpanded &&
                                <td className="artifact-chevron-column"><div className="chevron bowtie-icon bowtie-chevron-down-light" aria-label="Collapse"></div></td>
                            }
                            <td className="artifact-description-column"><div className="selected-artifacts-description" aria-label="description">{state.artifactsCountLabel}</div></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {
                state.isExpanded &&
                <div className="artifact-inputs artifacts-picker">
                    {
                        !state.isSourceNotAccessible &&
                        <Label className="artifacts-picker-description">{state.selectableArtifactsMessage}</Label>
                    }
                    {
                        state.isSourceNotAccessible &&
                        <Label className="artifacts-picker-description">{state.sourceIsNotAccessibleMessage}</Label>
                    }
                    <div className="artifacts-picker-list">
                        <div className="artifacts-picker-selectall">
                            <BooleanInputComponent disabled={this.props.readonly} readOnly={this.props.readonly} key={Resources.SelectAllArtifactsLabel} {...this._getSelectAllArtifactsControlProps(selectedAll)} />
                            <Label>{Resources.SelectAllArtifactsLabel}</Label>
                        </div>
                        {
                            !state.sourceArtifactItemsInitialized &&
                            <div>
                                <div className="artifacts-picker-section-line"><hr /></div>
                                <Spinner type={SpinnerType.normal} />
                            </div>
                        }
                        {
                            state.isSourceNotAccessible &&
                            <div>
                                <div className="artifacts-picker-section-line"><hr /></div>
                                <div className="artifacts-picker-textfield">
                                    <TextField
                                        value={selectedArtifactsInStringFormat}
                                        onChanged={this._handleSelectedArtifactsInStringFormatChange}
                                        required={false}
                                        disabled={selectedAll || this.props.readonly}/>
                                    <InfoButton
                                        cssClass="info-input-with-label"
                                        calloutContent={{ calloutMarkdown: Resources.SpecifySemiColonSeparateListOfArtifact }}
                                        isIconFocusable={true} />
                                </div>
                            </div>
                        }
                        {
                            !state.isSourceNotAccessible && artifactItems.length !== 0 &&
                            <div>
                                <div className="artifacts-picker-section-line"><hr /></div>
                                {artifactItems}
                            </div>
                        }
                    </div>
                </div>
            }
        </div>);
    }

    private _getArtifactItemControls(state: IArtifactsPickerState, selectedAll: boolean): JSX.Element[] {
        let artifactsList: JSX.Element[] = [];

        state.sourceArtifactItems.forEach((artifactItem: IArtifactItem) => {
            let isSelected = (selectedAll || Utils_Array.contains(state.artifactItems, artifactItem.itemPath));

            let treeData: ITreeData = {
                itemToSetSizeMap: {},
                itemToLevelMap: {},
                itemToPositionsMap: {},
            };
            this._populateTreeData(artifactItem, treeData, 1, 1, 1);

            artifactsList.push((
                <div className="artifact-picker-row" key={artifactItem.itemPath}>
                    <BooleanInputComponent key={artifactItem.itemPath} {...this._getSelectArtifactsControlProps(artifactItem.displayName, isSelected)} />
                    <div className="artifacts-picker-parentnode" role="tree" >
                        {this._getArtifactItemControl(artifactItem, [], treeData, true)}
                        {this._getArtifactItemChildControls(artifactItem, treeData)}
                    </div>
                </div>));
        });

        return artifactsList;
    }

    private _populateTreeData(artifactItem: IArtifactItem, treeData: ITreeData, currentLevel: number, size: number, position: number): void {
        treeData.itemToLevelMap[artifactItem.itemPath] = currentLevel;
        treeData.itemToSetSizeMap[artifactItem.itemPath] = size;
        treeData.itemToPositionsMap[artifactItem.itemPath] = position;

        if (!artifactItem.children || artifactItem.children.length === 0 || !artifactItem.isFolder) {
            return;
        }

        let setSize = artifactItem.children.length;
        artifactItem.children.forEach((artifactItemChild, index) => {
            this._populateTreeData(artifactItemChild, treeData, currentLevel + 1, setSize, index + 1);
        });
    }

    private _onStoreChange = () => {
        this.setState(this._store.getValue());
    }

    private _handleSelectedArtifactsInStringFormatChange = (newValue: string) => {
        this._actionCreator.selectArtifactList(newValue);
    }

    private _onArtifactInputControlClick(): void {
        this._actionCreator.toggleArtifact();
    }

    private _handleArtifactInputKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this._onArtifactInputControlClick();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _getArtifactItemChildControls(artifactItem: IArtifactItem, treeData: ITreeData): JSX.Element[] {
        if (!artifactItem.children || artifactItem.children.length === 0 || !artifactItem.isExpanded || !artifactItem.isFolder) {
            return [];
        }

        let childNodes: JSX.Element[] = [];
        artifactItem.children.forEach((artifactItemChild, index) => {
            let grandChildNodes = this._getArtifactItemChildControls(artifactItemChild, treeData);
            childNodes.push(this._getArtifactItemControl(artifactItemChild, grandChildNodes, treeData, false));
        });

        return childNodes;
    }

    private _getArtifactItemControl(artifactItem: IArtifactItem, children: JSX.Element[], treeData: ITreeData, isRootNode: boolean): JSX.Element {

        const chevronIcon = (<div>
            {
                !artifactItem.isExpanded && artifactItem.isFolder &&
                <div className="chevron bowtie-icon bowtie-chevron-right-light" aria-label="Expand" />
            }
            {
                artifactItem.isExpanded && artifactItem.isFolder &&
                <div className="chevron bowtie-icon bowtie-chevron-down-light" aria-label="Collapse" />
            }
        </div>);

        const itemIcon = (<div>
            {
                !artifactItem.isFolder &&
                <div className="bowtie-icon bowtie-file" aria-label="file" />
            }
            {
                artifactItem.isFolder &&
                <div className="bowtie-icon bowtie-folder" aria-label="folder" />
            }
        </div>);

        let artifactItemAriaLabel = artifactItem.displayName;
        if (artifactItem.errorMessage) {
            artifactItemAriaLabel = Utils_String.localeFormat("{0} {1}", artifactItem.displayName, artifactItem.errorMessage);
        }

        let isNonLeafNode = (children && children.length > 0);

        let ariaProps = {
            "role": "treeitem",
            "aria-label": artifactItemAriaLabel,
            "aria-setsize": treeData.itemToSetSizeMap[artifactItem.itemPath],
            "aria-posinset": treeData.itemToPositionsMap[artifactItem.itemPath],
            "aria-level": treeData.itemToLevelMap[artifactItem.itemPath]
        };

        if ((isRootNode || isNonLeafNode) && artifactItem.isExpanded) {
            ariaProps = JQueryWrapper.extend(ariaProps, { "aria-expanded": artifactItem.isExpanded });
        }

        return (<div className={isRootNode ? "artifacts-picker-firstchildnode" : "artifacts-picker-childnode"} key={artifactItem.itemPath}>
            <div className={"artifacts-picker-childrow"}
                onClick={() => this._toggleArtifactItem(artifactItem)}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => this._handleToggleArtifactItem(event, artifactItem)}
                tabIndex={0}
                {...ariaProps} >
                {chevronIcon}
                {itemIcon}
                <Label className="artifact-name-label">{artifactItem.displayName}</Label>
                {
                    artifactItem.errorMessage &&
                    <Label className="artifacts-picker-description"> - {artifactItem.errorMessage}</Label>
                }
            </div>
            {
                artifactItem.isExpanded && children !== null && children.length !== 0 &&
                children
            }
        </div>);
    }

    private _toggleArtifactItem(artifactItem: IArtifactItem): void {
        this._actionCreator.toggleArtifactItem(artifactItem);
    }

    private _handleToggleArtifactItem(event: React.KeyboardEvent<HTMLDivElement>, artifactItem: IArtifactItem): void {
        if (event.keyCode === KeyCode.ENTER
            || event.keyCode === KeyCode.SPACE
            || (artifactItem.isExpanded && event.keyCode === KeyCode.LEFT)
            || (!artifactItem.isExpanded && event.keyCode === KeyCode.RIGHT)) {

            this._toggleArtifactItem(artifactItem);

            event.preventDefault();
            event.stopPropagation();
        }

        if (event.currentTarget) {
            let focusableElement = this._getFocusableElement(event);
            if (focusableElement) {
                focusableElement.focus();

                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    private _getFocusableElement(event: React.KeyboardEvent<HTMLDivElement>): HTMLDivElement {
        if (event.keyCode === KeyCode.UP) {
            let currentElement = event.currentTarget as HTMLElement;
            while (currentElement && currentElement.parentElement && !currentElement.parentElement.classList.contains("artifact-picker-row") && !currentElement.previousElementSibling) {
                currentElement = currentElement.parentElement;
            }

            if (currentElement && currentElement.previousElementSibling) {
                let children = currentElement.previousElementSibling.getElementsByClassName("artifacts-picker-childrow");
                if (children.length > 0) {
                    return (children[children.length - 1] as HTMLDivElement);
                }
                else {
                    return currentElement.previousElementSibling as HTMLDivElement;
                }
            }
        }
        else if (event.keyCode === KeyCode.DOWN) {
            let currentElement = event.currentTarget as HTMLElement;
            while (currentElement && currentElement.parentElement && !currentElement.parentElement.classList.contains("artifact-picker-row") && !currentElement.nextElementSibling) {
                currentElement = currentElement.parentElement;
            }

            if (currentElement && currentElement.nextElementSibling) {
                return (currentElement.nextElementSibling.getElementsByClassName("artifacts-picker-childrow")[0] as HTMLDivElement);
            }
        }

        return null;
    }

    private _getSelectArtifactsControlProps(artifactName: string, value: boolean): IInputControlPropsBase<boolean> {
        let props: IInputControlPropsBase<boolean> = {
            value: value,
            onValueChanged: (newValue?: boolean) => {
                let isSelected = !!newValue;

                if (isSelected) {
                    this._actionCreator.selectArtifact(artifactName);
                } else {
                    this._actionCreator.unSelectArtifact(artifactName);
                }
            },
            label: Utils_String.empty,
            ariaLabel: artifactName,
            ariaDescription: artifactName
        };

        return props;
    }

    private _getSelectAllArtifactsControlProps(value: boolean): IInputControlPropsBase<boolean> {
        let props: IInputControlPropsBase<boolean> = {
            value: value,
            onValueChanged: (newValue?: boolean) => {
                let isSelectAll = !!newValue;

                this._actionCreator.setSelectAll(isSelectAll);
            },
            label: Utils_String.empty,
            ariaLabel: Resources.SelectAllArtifactsLabel,
            ariaDescription: Resources.SelectAllArtifactsLabel
        };

        return props;
    }

    private _setState(): void {
        this.setState(this._store.getValue());
    }

    private _store: ArtifactsPickerStore;
    private _actionCreator: ArtifactsPickerActionsCreator;
}