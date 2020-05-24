import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Overlay } from "OfficeFabric/Overlay";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as Service from "VSS/Service";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { IdentityPickerWrapper } from "Package/Scripts/Components/Settings/IdentityPickerWrapper";
import {
    FEEDSETTINGS_ADDPERMISSION_IDENTITYPICKERSEARCHCONTROL_CONSUMERID,
    FeedSettingsComponents
} from "Feed/Common/Constants/Constants";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { RoleHelper } from "Package/Scripts/Helpers/RoleHelper";
import * as PackageResources from "Feed/Common/Resources";
import { FeedPermission, FeedRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IAddUsersOrGroupsPanelProps extends Props {
    /**
     * If true, panel will open
     */
    isOpen: boolean;

    /**
     * Contains validation error messages for permission
     */
    validationErrorBag: IDictionaryStringTo<string>;

    /**
     * Tracks if permission is getting saved to server
     */
    isSavingChanges: boolean;

    /**
     * While saving, captures errors if they occur
     */
    error: Error;
}

// get identities in grid, so we don't add already existing identites
export class AddUsersOrGroupsPanel extends Component<IAddUsersOrGroupsPanelProps, State> {
    private _webPageDataService: HubWebPageDataService;

    constructor(props: IAddUsersOrGroupsPanelProps) {
        super(props);

        this._webPageDataService = Service.getLocalService(HubWebPageDataService);
        this._resetLocals();
    }

    public render(): JSX.Element {
        const errorMessage: string = this.getErrorMessage();
        return (
            <Panel
                className="add-user-or-group-panel"
                isOpen={this.props.isOpen}
                onDismiss={this._onDismiss}
                type={PanelType.medium}
                isFooterAtBottom={true}
                onRenderFooterContent={this.onRenderFooterContent}
                headerText={PackageResources.FeedSettings_AddPermission_Title}
                closeButtonAriaLabel={PackageResources.AriaLabel_ClosePanel}
                hasCloseButton={this.props.isSavingChanges === false}
            >
                {errorMessage != null && <MessageBar messageBarType={MessageBarType.error}>{errorMessage}</MessageBar>}
                <IdentityPickerWrapper
                    consumerId={FEEDSETTINGS_ADDPERMISSION_IDENTITYPICKERSEARCHCONTROL_CONSUMERID}
                    onIdentitiesResolved={this._onIdentitiesResolved}
                    multiIdentitySearch={true}
                />
                <ChoiceGroup
                    key="addFeedPermissionRole"
                    label={PackageResources.FeedSettings_AddPermission_RoleDropdown_Label}
                    onChange={this._onRoleChanged}
                    options={this.getChoiceGroupOptions()}
                />
                {this.props.isSavingChanges && (
                    <Overlay className="feed-overlay">
                        <div className="content">
                            <Spinner
                                size={SpinnerSize.small}
                                label={PackageResources.FeedSettings_Overlay_SavingChanges}
                            />
                        </div>
                    </Overlay>
                )}
            </Panel>
        );
    }

    @autobind
    private getChoiceGroupOptions(): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [
            {
                key: FeedRole.Administrator.toString(),
                text: RoleHelper.roleToLocaleString(FeedRole.Administrator),
                checked: this._feedRole === FeedRole.Administrator
            },
            {
                key: FeedRole.Contributor.toString(),
                text: RoleHelper.roleToLocaleString(FeedRole.Contributor),
                checked: this._feedRole === FeedRole.Contributor
            },
            {
                key: FeedRole.Collaborator.toString(),
                text: RoleHelper.roleToLocaleString(FeedRole.Collaborator),
                checked: this._feedRole === FeedRole.Collaborator
            },
            {
                key: FeedRole.Reader.toString(),
                text: RoleHelper.roleToLocaleString(FeedRole.Reader),
                checked: this._feedRole === FeedRole.Reader
            }
        ];

        return options;
    }

    @autobind
    private onRenderFooterContent(): JSX.Element {
        return (
            <div className="footer">
                <PrimaryButton
                    disabled={this.isSaveButtonDisabled()}
                    onClick={this._addPermission}
                    text={PackageResources.FeedSettings_SaveButton_Label}
                />
                <DefaultButton
                    disabled={this.props.isSavingChanges === true}
                    onClick={this._onDismiss}
                    text={PackageResources.FeedSettings_CloseButton_Label}
                />
            </div>
        );
    }

    @autobind
    private isSaveButtonDisabled(): boolean {
        return (
            this._identities == null ||
            this._identities.length === 0 ||
            this.props.validationErrorBag[FeedSettingsComponents.permission] != null ||
            // CTA button is blue by default, change it's color to grey while saving
            this.props.isSavingChanges
        );
    }

    @autobind
    private _onIdentitiesResolved(identities: IEntity[]): void {
        this._identities = identities;

        const feedPermissions: FeedPermission[] = this.getFeedPermissions();
        FeedSettingsActionCreator.addUsersOrGroupsPanelContentChange.invoke(feedPermissions);
    }

    @autobind
    private _onRoleChanged(event: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption): void {
        this._feedRole = parseInt(option.key, 10) as FeedRole;

        const feedPermissions: FeedPermission[] = this.getFeedPermissions();
        FeedSettingsActionCreator.addUsersOrGroupsPanelContentChange.invoke(feedPermissions);
    }

    @autobind
    private _addPermission(): void {
        const feedPermissions: FeedPermission[] = this.getFeedPermissions();

        FeedSettingsActionCreator.savePermissionsClicked.invoke(feedPermissions);
    }

    @autobind
    private _onDismiss(): void {
        this._resetLocals();

        FeedSettingsActionCreator.toggleAddUserOrGroupPanelDisplay.invoke(false /*close panel*/);
    }

    private getErrorMessage(): string {
        const validationErrorMessage: string = this.props.validationErrorBag[FeedSettingsComponents.permission];

        if (validationErrorMessage != null) {
            return validationErrorMessage;
        }

        if (this.props.error != null) {
            return this.props.error.message;
        }

        return null;
    }

    private getFeedPermissions(): FeedPermission[] {
        if (this._identities == null || this._identities.length === 0) {
            return null;
        }

        const feedPermissions: FeedPermission[] = [];
        this._identities.forEach((identity: IEntity) => {
            const feedPermission: FeedPermission = {
                displayName: identity.displayName,
                identityId: identity.localId,
                role: this._feedRole,
                identityDescriptor: null
            };
            feedPermissions.push(feedPermission);
        });

        return feedPermissions;
    }

    private _resetLocals(): void {
        this._identities = null;
        this._feedRole = FeedRole.Reader;
    }

    private _identities: IEntity[];
    private _feedRole: FeedRole;
}
