/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Fabric } from "OfficeFabric/Fabric";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { RepositoryOptionsContainer } from "VersionControl/Scenarios/VCAdmin/Components/RepositoryOptionsContainer";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VCAdminStoresHub } from "VersionControl/Scenarios/VCAdmin/Stores/VCAdminStoresHub"
import { VCAdminActionsHub } from "VersionControl/Scenarios/VCAdmin/Actions/VCAdminActionsHub"
import { VCAdminSourcesHub } from "VersionControl/Scenarios/VCAdmin/Sources/VCAdminSourcesHub"
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator"
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { SecretsScanningContainer } from "VersionControl/Scenarios/VCAdmin/Components/SecretsScanningContainer";
import { BlobSizeContainer } from "VersionControl/Scenarios/VCAdmin/Components/BlobSizeContainer";
import { VCAdminPermissions } from "Scenarios/VCAdmin/Stores/VCAdminPermissionsStore";
import { OSCompatContainer } from "VersionControl/Scenarios/VCAdmin/Components/OSCompatContainer";

export function renderVCOptions(container: any, repoContext: RepositoryContext) {
    ReactDOM.render(
          <VCAdminContainer context={repoContext} />
        , container
    );
}

export interface VCAdminContainerProps {
    context: RepositoryContext;
}

export interface VCAdminContainerState {
    permissions: VCAdminPermissions;
    initialized: boolean;
}

export class VCAdminContainer extends React.Component<VCAdminContainerProps, VCAdminContainerState> {
    private _storesHub: VCAdminStoresHub;
    private _sourcesHub: VCAdminSourcesHub;
    private _actionsHub: VCAdminActionsHub;
    private _actionCreator: VCAdminActionCreator;

    constructor(props: VCAdminContainerProps) {
        super(props);
        this._actionsHub = new VCAdminActionsHub();
        this._storesHub = new VCAdminStoresHub(this._actionsHub);
        this._sourcesHub = new VCAdminSourcesHub(this.props.context, TfsContext.getDefault());
        this._actionCreator = new VCAdminActionCreator(this.props.context, this._actionsHub, this._sourcesHub, this._storesHub);

        this.state = { permissions: null, initialized: false };
    }

    public componentDidMount() {
        this._storesHub.permissionsStore.addChangedListener(this._onPermissionsChanged);
        this._actionCreator.getRepoPermissions();
    }

    public componentWillUnmount() {
        this._storesHub.permissionsStore.removeChangedListener(this._onPermissionsChanged);
    }

    public render(): JSX.Element {
        if (!this.state.initialized) {
            return null;
        }

        let gitSettings = null;

        if (this.props.context instanceof GitRepositoryContext) {
            gitSettings = (
                <div>
                    <OSCompatContainer
                        actionCreator={this._actionCreator}
                        storesHub={this._storesHub}
                        repoContext={this.props.context}
                        canEditPolicies={this.state.permissions.editPolicies}
                        />
                    <BlobSizeContainer
                        actionCreator={this._actionCreator}
                        blobSizeStore={this._storesHub.blobSizeStore}
                        repoContext={this.props.context}
                        canEditPolicies={this.state.permissions.editPolicies}
                        />
                    <SecretsScanningContainer
                        actionCreator={this._actionCreator}
                        store={this._storesHub.secretsScanningStore}
                        repoContext={this.props.context}
                        canEditPolicies={this.state.permissions.editPolicies}
                        />
                </div>
            );
        }

        return (
            <div>
                <Fabric>
                    <RepositoryOptionsContainer
                        actionCreator={this._actionCreator}
                        repoOptionsStore={this._storesHub.repoOptionsStore}
                        canEditPolicies={this.state.permissions.editPolicies}
                        />
                    {gitSettings}
                </Fabric>
            </div>
        );
    }

    private _onPermissionsChanged = () => {
        this.setState({permissions: this._storesHub.permissionsStore.getPermissions(), initialized: true });
    }
}
