/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { EnvironmentCheckListActionCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListActionCreator";
import { EnvironmentCheckListStore, IEnvironmentCheckListState, IEnvironmentReference } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { localeFormat } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/IntegrationsOptionsDetailsView";
import { BadgeUrlCopyButton } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentBadgeUrlCopyButton";
import { PickListDropdown, IPickListItem, IPickListSelection, IPickList } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";

import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import { autobind } from "OfficeFabric/Utilities";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export interface IEnvironmentCheckListViewForBadgeProps extends ComponentBase.IProps {
    label: string;
    helpText: string;
    placeholder: string;
    environmentBadgeText: string;
    searchBoxAriaLabelText: string;
    badgeUrlInfoMessageText: string;
}

export class BadgeEnvironmentCheckListView extends ComponentBase.Component<IEnvironmentCheckListViewForBadgeProps, IEnvironmentCheckListState> {

    public componentWillMount(): void {
        this._checkListActions = ActionCreatorManager.GetActionCreator<EnvironmentCheckListActionCreator>(EnvironmentCheckListActionCreator, this.props.instanceId);
        this._checkListStore = StoreManager.GetStore<EnvironmentCheckListStore>(EnvironmentCheckListStore, this.props.instanceId);
        this._checkListStore.addChangedListener(this._onchange);

        this.setState(this._checkListStore.getState());
    }

    public componentWillUnmount(): void {
        this._checkListStore.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {
        let isBadgeUrlAvailableForAllEnvironment: boolean = true;
        let newlyAddedEnvironmentsList = [];
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: this.props.helpText
            }
        };

        return (
            <div className={"cd-options-envpicklistdropdown-section"}>
                <BooleanInputComponent
                    cssClass="cd-options-envpicklistdropdown"
                    label={this.props.label}
                    value={this.state.enabled}
                    onValueChanged={this._onMasterStatusChange}
                    infoProps={infoProps} />
                <div className={"envpicklistdropdown-container"}>
                    {
                        this.state.enabled &&
                        <FocusZone
                            direction={FocusZoneDirection.bidirectional}
                            isCircularNavigation={true}
                            className={"cd-options-envchecklist-container"}>
                            <div className="environment-dropdown-title">
                                {Resources.EnvironmentsLabelText}
                            </div>
                            <PickListDropdown
                                className="environment-picker-dropdown"
                                placeholder={this.props.placeholder}
                                isSearchable={true}
                                selectionMode={SelectionMode.multiple}
                                getPickListItems={() => this.state.environmentList}
                                getListItem={(scope: IEnvironmentReference) => { return { key: String(scope.environmentId), name: scope.environmentName } as IPickListItem; }}
                                onSelectionChanged={this._onSelectionChange}
                                selectedItems={this._getSelectedScopes()}
                                searchBoxAriaLabel={this.props.searchBoxAriaLabelText} />
                        </FocusZone>
                    }
                    {this.state.enabled && this.state.environmentList && this.state.environmentList.map((env: IEnvironmentReference) => {
                        if (!!env.status) {
                            if (!!env.badgeUrl) {
                                return (<div className={"releasedefinition-properties-badge-url task-input-buttons"}
                                    key={"badgeUrlClass-" + env.environmentId}>
                                    <StringInputComponent
                                        key={"envurl-" + env.environmentId}
                                        cssClass="badge-url-textfield"
                                        label={env.environmentName + " " + this.props.environmentBadgeText}
                                        value={env.badgeUrl}
                                        readOnly={true} />
                                    <BadgeUrlCopyButton
                                        key={"badgeUrlCopy-" + env.environmentId}
                                        onClick={() => { Utils_Clipboard.copyToClipboard(env.badgeUrl); }} />
                                </div>);
                            }
                            else {
                                newlyAddedEnvironmentsList.push(env.environmentName);
                                if (!!isBadgeUrlAvailableForAllEnvironment) {
                                    isBadgeUrlAvailableForAllEnvironment = false;
                                }
                            }
                        }
                    })
                    }
                </div>
                {
                    this.state.enabled && !!this.state.error &&
                    <div className={"envpicklistdropdown-container"}>
                        <ErrorComponent cssClass={"cd-options-status-error-msg"} errorMessage={this.state.error} />
                    </div>
                }
                {
                    this.state.enabled && !isBadgeUrlAvailableForAllEnvironment && !this.state.error &&
                    <div className={"envpicklistdropdown-container"}>
                        <MessageBarComponent
                            className={"artifacts-detail-message"}
                            messageBarType={MessageBarType.info} >
                            {this._getBadgeURLNotVisibleMessage(localeFormat(this.props.badgeUrlInfoMessageText, newlyAddedEnvironmentsList))}
                        </MessageBarComponent>
                    </div>
                }
            </div>
        );
    }

    private _onchange = () => {
        this.setState(this._checkListStore.getState());
    }

    private _onMasterStatusChange = (newValue: boolean) => {
        this._checkListActions.updateMasterCheckBoxStatus(newValue);
    }

    private _onEnvironmentStatusChange = (environmentId: number, newValue: boolean) => {
        this._checkListActions.updateEnvironmentStatus(environmentId, newValue);
    }

    @autobind
    private _onSelectionChange(selection: IPickListSelection): void {
        let environmentUnselected: boolean;
        this.state.environmentList.map((env: IEnvironmentReference) => {
            selection.selectedItems.map((selectedItem: IEnvironmentReference) => {
                if ((env.environmentId === selectedItem.environmentId) && (env.status === false)) {
                    this._onEnvironmentStatusChange(env.environmentId, true);
                }
            });
        });
        this._checkListStore.getSelectedEnvironments().map((env: IEnvironmentReference) => {
            environmentUnselected = true;
            selection.selectedItems.map((selectedItem: IEnvironmentReference) => {
                if (env.environmentId === selectedItem.environmentId) {
                    environmentUnselected = false;
                }
            });
            if (environmentUnselected) {
                this._onEnvironmentStatusChange(env.environmentId, false);
            }
        });
    }

    @autobind
    private _getSelectedScopes(): IEnvironmentReference[] {
        return this._checkListStore.getSelectedEnvironments();
    }

    private _getBadgeURLNotVisibleMessage(message: string): JSX.Element {
        /* tslint:disable:react-no-dangerous-html */
        return (<div className="message-container"
            dangerouslySetInnerHTML={this._renderHtml(message)}>
        </div>);
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }
    private _checkListActions: EnvironmentCheckListActionCreator;
    private _checkListStore: EnvironmentCheckListStore;
}