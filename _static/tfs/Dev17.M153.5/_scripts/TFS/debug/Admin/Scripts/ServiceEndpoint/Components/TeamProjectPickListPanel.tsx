// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import { Panel, PanelType } from "OfficeFabric/Panel";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, IButtonProps } from "OfficeFabric/Button";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { IPickListSelection } from "VSSUI/PickList";

import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { TeamProjectPickList } from "DistributedTaskControls/Components/TeamProjectPickList";
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import EndpointActionCreator = require("Admin/Scripts/ServiceEndpoint/Actions/EndpointActionCreator");
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import Model = require("Admin/Scripts/ServiceEndpoint/EnpointSharedProjectsData")
import { EnpointSharedProjectStore } from "Admin/Scripts/ServiceEndpoint/Stores/EnpointSharedProjectStore";
import Contracts = require("TFS/DistributedTask/Contracts");
import * as Utils_String from "VSS/Utils/String";

export interface TeamProjectPickListPanelProps extends IProps {
    endpointId: string;
    onClose: (isUpdated: boolean) => void;
}

export interface TeamProjectPickListPanelState extends IState {
    errorMessage?: string;
    sharedProjects: Contracts.ProjectReference[];
    allProjects: Contracts.ProjectReference[];
    showPanel: boolean;
    dataLoaded: boolean;
    isUpdated: boolean;
}

export class TeamProjectPickListPanel extends Component<TeamProjectPickListPanelProps, TeamProjectPickListPanelState> {
    constructor(props: TeamProjectPickListPanelProps) {
        super(props);

        this.state = {
            errorMessage: Utils_String.empty,
            sharedProjects: [],
            allProjects: [],
            showPanel: true,
            dataLoaded: false,
            isUpdated: false
        };

        this._store = StoreManager.GetStore<EnpointSharedProjectStore>(EnpointSharedProjectStore);
    }

    public componentWillMount() {
        EndpointActionCreator.EndpointActionCreator.getInstance().getSharedProjectsData(this.props.endpointId);
        this._store.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        let elementToFocusOnDismiss = $(".ms-CommandBarItem-link")[0];
        return (
            <Panel
                isOpen={this.state.showPanel}
                type={PanelType.medium}
                headerText={AdminResources.ShareEndpointsTitle}
                hasCloseButton={true}
                closeButtonAriaLabel={"close"}
                onRenderFooterContent={this._renderPanelFooterContent}
                isFooterAtBottom={true}
                onDismiss={this._onPanelClose}
                focusTrapZoneProps={{ firstFocusableSelector: "share-endpoint-name-input .ms-TextField-field" }}
                elementToFocusOnDismiss={elementToFocusOnDismiss}>
                <div className="share-endpoint-panel">
                    {this._showErrorMessage()}
                    {this._getPanelContent()}
                </div>
            </Panel>);
    }

    private _onPanelClose = () => {
        this._clearErrorMessage();
        let state = this._getState();
        state.showPanel = false;
        this.props.onClose(state.isUpdated);
        this.setState(state);
    }

    private _getPanelContent(): JSX.Element {
        let state = this._getState();
        if (!state.dataLoaded) {
            return (
                <Spinner size={SpinnerSize.small} />
            );
        } else {
            let allProjects: string[] = [];
            this.state.allProjects.forEach(project => {
                allProjects.push(project.name);
            });

            let sharedProjects: string[] = [];
            this.state.sharedProjects.forEach(project => {
                sharedProjects.push(project.name);
            });

            if (allProjects.length === 0) {
                return (
                    <div>
                        <span className="share-endpoint-project-description">{AdminResources.NoProjects}</span>
                    </div>
                );
            }

            return (
                <div>
                    <span className="share-endpoint-project-description">{AdminResources.ShareEndpointsDescription}</span>
                    <TeamProjectPickList items={allProjects} selectedProjectList={sharedProjects} onSelectionChanged={this._onSelectionChanged} />
                </div>
            );
        }
    }

    private _renderPanelFooterContent = (): JSX.Element => {
        return (<PrimaryButton className="share-endpoint-panel-button" onClick={this._onShareButtonClick} disabled={!(this._store.isDirty())}>
            {AdminResources.ShareEndpointsShareButtonText}
        </PrimaryButton>);
    }

    private _onShareButtonClick = () => {
        if (this._store.isDirty()) {
            this._clearErrorMessage();
            let state = this._getState();
            state.isUpdated = true;
            this.setState(state);

            let projectsAdded: Contracts.ProjectReference[] = this._store.getNewSharedProjects();
            if (projectsAdded != []) {
                EndpointActionCreator.EndpointActionCreator.getInstance().shareEndpointWithProjects(this.props.endpointId, projectsAdded);
            }

            let projectsRemoved: Contracts.ProjectReference[] = this._store.getDeletedSharedProjects();
            if (projectsRemoved != []) {
                EndpointActionCreator.EndpointActionCreator.getInstance().unShareEndpointWithProjects(this.props.endpointId, projectsRemoved);
            }
        }
    }

    private _showErrorMessage(): JSX.Element {
        let state = this._getState();
        return !!(state.errorMessage) ?
            (<MessageBar messageBarType={MessageBarType.error} isMultiline={true} onDismiss={this._clearErrorMessage} dismissButtonAriaLabel={"Close"}>
                {state.errorMessage}
            </MessageBar>) : null;
    }

    private _clearErrorMessage = () => {
        EndpointActionCreator.EndpointActionCreator.getInstance().updateError(Utils_String.empty);
    }

    private _onSelectionChanged = (selection: IPickListSelection) => {
        let projects: string[] = selection.selectedItems;
        let projectReferences: Contracts.ProjectReference[] = [];

        for (let i = 0; i < projects.length; i++) {
            for (let j = 0; j < this.state.allProjects.length; j++) {
                if (this.state.allProjects[j].name === projects[i]) {
                    projectReferences.push(this.state.allProjects[j]);
                    break;
                }
            }
        }

        EndpointActionCreator.EndpointActionCreator.getInstance().updateSharedProjects(projectReferences);
    }

    private _getState(): TeamProjectPickListPanelState {
        let data: Model.EnpointSharedProjectsData = this._store.getSharedProjectsData();
        let state: TeamProjectPickListPanelState = this._getInitialState();
        if (data) {
            state.allProjects = data.allProjects;
            state.sharedProjects = data.sharedProjects;
            state.dataLoaded = true;
        }

        state.errorMessage = this._store.getErrorMessage();
        state.showPanel = this.state.showPanel;
        state.isUpdated = this.state.isUpdated;
        return state;
    }

    private _onStoreChange = () => {
        let state = this._getState();
        state.dataLoaded = true;
        this.setState(state);
    }

    private _getInitialState(): TeamProjectPickListPanelState {
        return {
            errorMessage: "",
            allProjects: [],
            sharedProjects: [],
            showPanel: true,
            dataLoaded: false
        } as TeamProjectPickListPanelState;
    }

    private _store: EnpointSharedProjectStore;
}