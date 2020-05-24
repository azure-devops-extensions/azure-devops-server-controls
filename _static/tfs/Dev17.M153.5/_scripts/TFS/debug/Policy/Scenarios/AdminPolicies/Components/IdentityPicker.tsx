import * as React from "react";

import { autobind, css } from "OfficeFabric/Utilities";

import { IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import { IdentityPickerControlSize } from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { ServiceHelpers } from "VSS/Identities/Picker/Services";

import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";

import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/Components/IdentityPicker";

export interface IdentityPickerProps {
    readOnlyMode: boolean;
    className?: string;
    identityStore: IdentityStore;
    consumerId: string;
    defaultEntities: string[];
    includeGroups: boolean;
    minRequired: number;
    clearOnUpdate?: boolean;
    multiIdentitySearch: boolean;
    identitiesUpdated(validIdentities: string[], invalidIdentityNames: string[], pendingAadGroups: IEntity[]);
    cacheIdentity(identity: IEntity);
    materializeAadGroup(identity: IEntity);
}

export class IdentityPicker extends React.PureComponent<IdentityPickerProps> {
    private _identityPicker: IdentityPickerSearch;

    public render(): JSX.Element {
        return <IdentityPickerSearch
            className={css(
                "policy-identity-picker",
                { "missing-required": !this.props.readOnlyMode && this.props.defaultEntities.length < this.props.minRequired },
                this.props.className
            )}
            ref={this._setElement}
            readOnly={this.props.readOnlyMode}
            consumerId={this.props.consumerId}
            focusOnLoad={false}
            identitiesUpdated={this._reviewerIdentitiesUpdated}
            inlineSelectedEntities={true}
            multiIdentitySearch={this.props.multiIdentitySearch}
            defaultEntities={this.props.defaultEntities}
            controlSize={IdentityPickerControlSize.Large}
            includeGroups={this.props.includeGroups} />;
    }

    public componentDidUpdate() {
        if (this._identityPicker && this.props.clearOnUpdate) {
            this._identityPicker.clear();
        }
    }

    @autobind
    private _setElement(element: IdentityPickerSearch) {
        this._identityPicker = element;
    }

    @autobind
    private _reviewerIdentitiesUpdated(identities: IEntity[]) {
        const validIdentities: string[] = [];
        const pendingAadGroups: IEntity[] = [];  // don't start with this.state.pendingAadGroups so that the user can remove in-flight groups from the list
        const invalidIdentityNames: string[] = [];

        const identityStore: IdentityStore = this.props.identityStore;

        identities.forEach(identity => {
            if (!identity) {
                return;
            }

            if (!!identity.localId && !!identity.active) {
                this.props.cacheIdentity(identity);
                validIdentities.push(identity.localId);
                return;
            }

            // do special lookup for AAD groups
            if (identity.originDirectory.trim().toLowerCase() != ServiceHelpers.AzureActiveDirectory ||
                identity.entityType.trim().toLowerCase() != ServiceHelpers.GroupEntity) {
                invalidIdentityNames.push(identity.displayName);
                return;
            }

            // check to see if we have already materialized the group
            const tfid: string = identityStore.getTfidForAadGroup(identity);
            if (tfid) {
                validIdentities.push(tfid);
                return;
            }

            // check to see if we've already tried and failed to materialze the group
            if (identityStore.hasAadGroupMaterializationFailed(identity)) {
                invalidIdentityNames.push(identity.displayName);
                return;
            }

            pendingAadGroups.push(identity);
            if (this.props.materializeAadGroup) {
                this.props.materializeAadGroup(identity);
            }
        });

        this.props.identitiesUpdated(validIdentities, invalidIdentityNames, pendingAadGroups);
    }
}
