/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";

import { DefaultButton, IButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Toggle } from "OfficeFabric/Toggle";
import { css } from "OfficeFabric/Utilities";

import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { PipelineArtifact, PipelineEnvironmentTriggerCondition } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { EnvironmentAritifactFilterCustomRenderer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAritifactFilterCustomRenderer";
import { EnvironmentArtifactTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerActionsCreator";
import { EnvironmentArtifactTriggerStore, IEnvironmentArtifactTriggerStoreState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";
import { EnvironmentTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionCreator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ArtifactTriggerCondition } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerCondition";
import { ArtifactTriggerConditionStore } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerView";

export interface IEnvironmentArtifactTriggerViewState extends IEnvironmentArtifactTriggerStoreState {
    expandedAccordionIndex: number;
}

export class EnvironmentArtifactTriggerView extends ComponentBase.Component<ComponentBase.IProps, IEnvironmentArtifactTriggerViewState> {
    constructor(props: ComponentBase.IProps) {
        super(props);
        this._store = StoreManager.GetStore<EnvironmentArtifactTriggerStore>(EnvironmentArtifactTriggerStore, this.props.instanceId);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentArtifactTriggerActionsCreator>(EnvironmentArtifactTriggerActionsCreator, this.props.instanceId);
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._envTriggerActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentTriggerActionCreator>(EnvironmentTriggerActionCreator, this.props.instanceId);

    }

    public componentWillMount() {
        let state = { ...this._store.getState(), expandedAccordionIndex: -1 } as IEnvironmentArtifactTriggerViewState;
        this.setState(state);
        this._artifactList = this._getValidArtifacts();

        this._store.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        let message = Utils_String.empty;
        let artifacts = this._artifactListStore.getArtifactList();
        if (artifacts && artifacts.length === 0) {
            message = Resources.NoArtifacts;
        } else if (this._artifactList.length === 0) {
            message = Resources.NoSupportedArtifacts;
        }
        const ariaLabelId = "environment-artifact-filters-label-" + DtcUtils.getUniqueInstanceId();

        return (
            <div>
                <div className="environment-artifact-list-container">
                    <div className="environment-artifact-list-container-left">
                        <div className="environment-artifact-filters" id={ariaLabelId}>{Resources.ArtifactFilters}</div>
                        <InfoButton
                            iconAriaLabel={Resources.MoreInformationFiltersAriaLabel}
                            calloutContent={{
                                calloutDescription: Resources.ArtifactFiltersHelpText,
                                calloutContentAriaLabel: Utils_String.localeFormat(Resources.ArtifactFiltersHelpText, Resources.ArtifactFiltersHelpText)
                            } as ICalloutContentProps}
                            isIconFocusable={true} />
                    </div>
                    {
                        this.state.isToggleEnabled &&
                        <DefaultButton
                            componentRef={this._resolveRef("_addArtifact")}
                            disabled={!(this._artifactList && this._artifactList.length > 0)}
                            iconProps={{ iconName: "Add" }}
                            text={Resources.Add}
                            className="add-artifact-button"
                            menuProps={{
                                items: this._getContextualMenuItems()
                            }}
                            ariaLabel={Resources.AddArtifactFilterAriaLabel}
                            defaultValue={Utils_String.empty}>
                        </DefaultButton>
                    }
                    {
                        this._artifactList && this._artifactList.length > 0 &&
                        <Toggle
                            className="environment-artifact-filter-toggle"
                            label={Utils_String.empty}
                            checked={this.state.isToggleEnabled}
                            onText={Resources.EnabledText}
                            offText={Resources.DisabledText}
                            onChanged={this._updateToggleState}
                            aria-labelledby={ariaLabelId} />
                    }
                </div>
                {
                    (!message || message === Utils_String.empty) ?
                        this.state.isToggleEnabled &&
                        <div className="environment-artifact-triggers">
                            {this._showArtifacts()}
                        </div>
                        :
                        <div key="1" className="environment-artifact-trigger-disabled-message">{message}</div>
                }
            </div>
        );
    }

    // Enable artifacts in the dropdown if they don't have any existing artifact trigger conditions
    private _getContextualMenuItems(): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];
        const artifactTriggerConditionStoreList: ArtifactTriggerConditionStore[] = this._store.getDataStoreList() as ArtifactTriggerConditionStore[];
        let artifactFilterMap = {};
        artifactTriggerConditionStoreList.forEach((_artifactTriggerConditionStore) => {
            artifactFilterMap[_artifactTriggerConditionStore.getAlias()] = true;
        });
        //Fetch only valid artifact types
        let artifactList = this._artifactList;
        if (artifactList && artifactList.length > 0) {
            artifactList.forEach((artifact: PipelineArtifact) => {
                items.push({
                    name: artifact.alias,
                    key: artifact.alias,
                    className: "add-artifact",
                    onClick: this._onAddArtifactTrigger,
                    data: artifact,
                    disabled: !!artifactFilterMap[artifact.alias],
                    iconProps: { className: css("bowtie-icon", ArtifactUtility.getArtifactBowtieIcon(artifact.type)) },
                    style: { maxWidth: "200px" },
                });
            });

        }
        return items;
    }

    private _getValidArtifacts(): PipelineArtifact[] {
        let artifactList: PipelineArtifact[] = this._artifactListStore.getArtifactList();
        Utils_Array.removeWhere(artifactList, artifact => !ArtifactTriggerUtils.supportsTriggerWithConditions(artifact.type));
        return artifactList;
    }

    private _showArtifacts(): JSX.Element[] {
        let content: JSX.Element[] = [];
        let artifactTriggerConditionStoreList: ArtifactTriggerConditionStore[] = this._store.getDataStoreList() as ArtifactTriggerConditionStore[];
        let artifactList = this._artifactList;
        if (artifactTriggerConditionStoreList.length === 0) {
            content.push(
                <div key="1" className="environment-artifact-no-filter">{Resources.NoArtifactFiltersText}</div>
            );
        } else {
            let accordionIndex = 0;
            artifactTriggerConditionStoreList.forEach((_artifactTriggerConditionStore) => {
                content.push(
                    <div key={_artifactTriggerConditionStore.getAlias()}>
                        <EnvironmentAritifactFilterCustomRenderer
                            label={_artifactTriggerConditionStore.getAlias()}
                            initiallyExpanded={this._isAccordionExpanded(accordionIndex)}
                            isExpanded={this._isAccordionExpanded(accordionIndex)}
                            headingLevel={2}
                            bowtieIconName={ArtifactUtility.getArtifactBowtieIcon(_artifactTriggerConditionStore.getArtifactType())}
                            showError={!_artifactTriggerConditionStore.isValid()}
                            numberOfFilters={this._getNumberOfFilters(_artifactTriggerConditionStore)}
                            accordionIndex={accordionIndex}
                            updateExpandedAccordionIndex={this._updateExpandedAccordionIndex}
                            deleteButtonOnClick={() => this._onDeleteArtifactTrigger(artifactTriggerConditionStoreList.indexOf(_artifactTriggerConditionStore))}>

                            <div className="environment-artifact-trigger">
                                <ArtifactTriggerCondition instanceId={_artifactTriggerConditionStore.getInstanceId()}
                                    artifactStoreInstanceId={_artifactTriggerConditionStore.getArtifactStoreInstanceId()}
                                    isEnvironmentArtifactTrigger={true}>
                                </ArtifactTriggerCondition>
                            </div>

                        </EnvironmentAritifactFilterCustomRenderer>
                    </div>
                );

                accordionIndex++;
            });
        }

        return content;
    }

    private _getNumberOfFilters = (artifactTriggerConditionStore: ArtifactTriggerConditionStore): number => {
        const state = artifactTriggerConditionStore.getState();
        return !!state && !!state.triggerConditions ? state.triggerConditions.length : 0;
    }

    private _updateExpandedAccordionIndex = (index: number): void => {
        this.setState({ expandedAccordionIndex: index });
    }

    private _isAccordionExpanded = (index: number): boolean => {
        return this.state.expandedAccordionIndex === index;
    }

    private _onStoreChange = () => {
        let state = { ...this._store.getState() } as IEnvironmentArtifactTriggerViewState;
        this.setState(state);
    }

    private _onAddArtifactTrigger = (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
        this._actionsCreator.addArtifactTrigger(item.data);
        let artifactTriggerConditionStoreList: ArtifactTriggerConditionStore[] = this._store.getDataStoreList() as ArtifactTriggerConditionStore[];
        this.setState({ expandedAccordionIndex: artifactTriggerConditionStoreList.length - 1 });
    }

    private _onDeleteArtifactTrigger = (index: number) => {
        this._actionsCreator.deleteArtifactTrigger(index);

        if (index === this.state.expandedAccordionIndex) {
            // if expanded accordion is deleted, collapse all accordions
            this.setState({ expandedAccordionIndex: -1 });
        } else if (index < this.state.expandedAccordionIndex) {
            // if accordion above expanded accordion is deleted, index of expandedAccordion will change
            this.setState({ expandedAccordionIndex: this.state.expandedAccordionIndex - 1 });
        }
    }

    private _updateToggleState = (checked: boolean) => {
        this._actionsCreator.updateToggleState(checked);
    }

    private _artifactListStore: ArtifactListStore;
    private _addArtifact: IButton;
    private _store: EnvironmentArtifactTriggerStore;
    private _actionsCreator: EnvironmentArtifactTriggerActionsCreator;
    private _envTriggerActionCreator: EnvironmentTriggerActionCreator;
    private _artifactTriggerConditions: PipelineEnvironmentTriggerCondition[];
    private _artifactList: PipelineArtifact[] = [];
}