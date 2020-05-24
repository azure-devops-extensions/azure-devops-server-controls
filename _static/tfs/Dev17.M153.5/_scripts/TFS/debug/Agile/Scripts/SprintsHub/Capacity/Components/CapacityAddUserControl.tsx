import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Capacity/Components/CapacityAddUserControl";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { CapacityContractsMapper } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityContractsMapper";
import { IUser } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { IButton, PrimaryButton } from "OfficeFabric/Button";
import { Icon } from "OfficeFabric/Icon";
import { IdentityPickerProps, IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import * as Identities_RestClient from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";

export interface ICapacityAddUserControlProps {
    existingUsers: IUser[];
    onAddUser: (user: IUser) => void;
}

export interface ICapacityAddUserControlState {
    selectedEntity: Identities_RestClient.IEntity;
    error: string;
    addUserDisabled: boolean;
}

export class CapacityAddUserControl extends React.Component<ICapacityAddUserControlProps, ICapacityAddUserControlState> {

    public constructor(props: ICapacityAddUserControlProps) {
        super(props);

        this.state = {
            selectedEntity: null,
            error: null,
            addUserDisabled: true
        };
    }

    public render() {
        return (
            <div className="capacity-add-user-control">
                <div className="capacity-add-user-control-row">
                    <div className="capacity-add-user-control-left">
                        {this._renderIdentityControl()}
                    </div>
                    <div className="capacity-add-user-control-right">
                        {this._renderAddUserButton()}
                    </div>
                </div>
                {this._renderError()}
            </div>
        );
    }

    public componentDidUpdate() {
        if (this._identityPickerSearch) {
            if (!this.state.selectedEntity) {
                this._identityPickerSearch.clear();
            }

            if (this.state.addUserDisabled) {
                this._identityPickerSearch.focus();
            }
        }

        if (!this.state.addUserDisabled && this._addUserButton) {
            this._addUserButton.focus();
        }
    }

    private _renderIdentityControl(): JSX.Element {
        const defaultIds = [this.state.selectedEntity ? this.state.selectedEntity.entityId : null];
        const props: IdentityPickerProps = {
            focusOnLoad: true,
            consumerId: "E6A5ADA9-3A14-4D0E-A511-6B1C1DC76BEA",
            defaultEntities: defaultIds,
            multiIdentitySearch: false,
            inlineSelectedEntities: true,
            includeGroups: false,
            placeholderText: CapacityPivotResources.AddUserTitle,
            identitySelected: this._selectEntity,
            identitiesUpdated: this._onIdentitiesUpdated,
            operationScope: { IMS: true } //Allow only IMS (Don't allow AAD/Source as this has caused confusion in past when the user is not materialized)
        };

        return <IdentityPickerSearch ref={this._setIdentityPickerRef} {...props} />;
    }

    private _setIdentityPickerRef = (identityPickerSearch: IdentityPickerSearch): void => {
        this._identityPickerSearch = identityPickerSearch;
    }

    private _renderAddUserButton(): JSX.Element {
        return (
            <PrimaryButton
                className="capacity-add-user-control-add-user-button"
                disabled={this.state.addUserDisabled}
                componentRef={this._setAddUserButtonRef}
                onClick={this._onAddUserClicked}
            >
                {CapacityPivotResources.AddUser}
            </PrimaryButton>
        );
    }

    private _setAddUserButtonRef = (button: IButton): void => {
        this._addUserButton = button;
    }

    private _renderError(): JSX.Element {
        if (!this.state.error) {
            return null;
        }

        return (
            <div className="capacity-add-user-control-error">
                <Icon iconName="Error" />
                {this.state.error}
            </div>
        );
    }

    private _onAddUserClicked = () => {
        const selectedEntity = this.state.selectedEntity;
        const user = CapacityContractsMapper.mapEntity(selectedEntity);

        this.props.onAddUser(user);
        this._selectEntity(null);
    }

    private _selectEntity = (entity: Identities_RestClient.IEntity) => {
        if (!entity) {
            this.setState({
                selectedEntity: null,
                addUserDisabled: true,
                error: null
            });
        } else if (!entity.localId) {
            this.setState({
                selectedEntity: entity,
                addUserDisabled: true,
                error: CapacityPivotResources.Capacity_UserIsNotMaterializedYet
            });
        } else if (this._userAlreadyAdded(entity.localId)) {
            this.setState({
                selectedEntity: entity,
                addUserDisabled: true,
                error: CapacityPivotResources.Capacity_UserAlreadyHasCapacity
            });
        } else {
            this.setState({
                selectedEntity: entity,
                addUserDisabled: false,
                error: null
            });
        }
    }

    private _onIdentitiesUpdated = (entities: Identities_RestClient.IEntity[]) => {
        let entity: Identities_RestClient.IEntity = null;
        if (entities && entities.length === 1) {
            entity = entities[0];
        }

        this._selectEntity(entity);
    }

    private _userAlreadyAdded(tfid: string): boolean {
        return this.props.existingUsers.some((u) => Utils_String.equals(u.id, tfid, /* ignore case */ true));
    }

    private _addUserButton: IButton;
    private _identityPickerSearch: IdentityPickerSearch;
}