import * as React from "react";

import { CommandButton, DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Overlay } from "OfficeFabric/Overlay";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { IdentityPickerWrapper } from "Package/Scripts/Components/Settings/IdentityPickerWrapper";
import { FEEDSETTINGS_VIEWS_IDENTITYPICKERSEARCHCONTROL_CONSUMERID, FeedSettingsComponents } from "Feed/Common/Constants/Constants";
import { RoleHelper } from "Package/Scripts/Helpers/RoleHelper";
import * as PackageResources from "Feed/Common/Resources";
import { FeedPermission, FeedRole, FeedView, FeedViewType, FeedVisibility } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/ViewPanel";

export interface IViewPanelProps extends Props {
    /**
     * Contains validation error messages for view-name
     */
    validationErrorBag: IDictionaryStringTo<string>;

    /**
     * Open/Close the panel
     */
    isOpen: boolean;

    /**
     * add or edit
     */
    isViewPanelInEditMode?: boolean;

    /**
     * view permissions
     */
    viewPermissions: FeedPermission[];

    /**
     * selectedView, for edit only
     */
    selectedView?: FeedView;

    /**
     * defaultViewId, for edit only
     */
    defaultViewId: string;

    /**
     * InternalCollectionUpstreams feature state
     */
    isCollectionUpstreamsFeatureEnabled: boolean;

    /**
     * InternalOrganizationUpstreams feature state
     */
    isOrganizationUpstreamsFeatureEnabled: boolean;

    /**
     * True if the current user can make changes to the feed settings
     */
    isUserAdmin: boolean;

    /**
     * Tracks if views are getting saved to server
     */
    isSavingChanges: boolean;

    /**
     * While saving, captures errors if they occur to show in Panel
     */
    error: Error;
}

export interface IViewPanelState extends State {
    /**
     * View name entered in text box
     */
    viewName: string;

    /**
     * Tracks whether user wants to make this default view
     */
    defaultViewChecked: boolean;

    /**
     * Tracks whether user wants to use Organization, Collection, or Feed level visibility
     */
    selectedVisibilityType: FeedVisibility;

    /**
     * viewId for newly created view
     */
    newViewId: string;

    /**
     * view permission
     */
    viewPermissions: FeedPermission[];
}

export class ViewPanel extends Component<IViewPanelProps, IViewPanelState> {
    private _headerText: string;
    private _submitButtonText: string;
    private _onClickAction: () => void;
    private _disableSetDefaultView: boolean;
    private _identity: IEntity;

    constructor(props: IViewPanelProps) {
        super(props);
        this.state = this._getStateAndUpdateProperties(props);
    }

    public componentWillReceiveProps(nextProps: IViewPanelProps): void {
        if (this.props.isOpen !== nextProps.isOpen) {
            this.setState(this._getStateAndUpdateProperties(nextProps));
        }
    }

    public render(): JSX.Element {
        return (
            <Panel
                className={"view-panel"}
                isOpen={this.props.isOpen}
                onDismiss={this._onDismiss}
                type={PanelType.medium}
                isFooterAtBottom={true}
                onRenderFooterContent={this._onRenderFooterContent}
                headerText={this._headerText}
                closeButtonAriaLabel={PackageResources.AriaLabel_ClosePanel}
                hasCloseButton={this.props.isSavingChanges === false}
                focusTrapZoneProps={{ firstFocusableSelector: "view-name input" }}
            >
                {this.props.error != null && (
                    <MessageBar messageBarType={MessageBarType.error}>{this.props.error.message}</MessageBar>
                )}
                <TextField
                    label={PackageResources.FeedSettings_ViewPanel_TextField_Label}
                    className={"view-name"}
                    defaultValue={this.state.viewName}
                    onChanged={this._onViewNameChanged}
                    errorMessage={this.props.validationErrorBag[FeedSettingsComponents.viewName]}
                    disabled={
                        this.props.isViewPanelInEditMode &&
                        this.props.selectedView &&
                        this.props.selectedView.type === FeedViewType.Implicit
                    }
                />
                {(this.props.isOrganizationUpstreamsFeatureEnabled ||
                    this.props.isCollectionUpstreamsFeatureEnabled) && (
                    <div className="visibility-type-choice">
                        <ChoiceGroup
                            label={PackageResources.FeedSettings_ViewPanel_Visibility}
                            selectedKey={this.state.selectedVisibilityType.toString()}
                            onChange={(
                                event: React.FormEvent<HTMLElement | HTMLInputElement>,
                                option: IChoiceGroupOption
                            ) => this.setState({ selectedVisibilityType: this._getVisibility(option.key) })}
                            options={this._getVisibilityOptions()}
                        />
                    </div>
                )}
                {(this.props.isOrganizationUpstreamsFeatureEnabled || this.props.isCollectionUpstreamsFeatureEnabled) &&
                    this.state.selectedVisibilityType === FeedVisibility.Private && (
                        <div>
                            <IdentityPickerWrapper
                                consumerId={FEEDSETTINGS_VIEWS_IDENTITYPICKERSEARCHCONTROL_CONSUMERID}
                                onIdentitiesResolved={this._onIdentitiesResolved}
                                multiIdentitySearch={false}
                            />
                            <PrimaryButton
                                disabled={this._isAddPermissionDisabled()}
                                onClick={this._addViewPermission}
                                text={PackageResources.FeedSettings_AddButton_Label}
                            />
                            <div className="permissions-content">
                                <div className="section-spacer" />
                                {this._getPermissionsMessageOrList()}
                            </div>
                        </div>
                    )}
                <Checkbox
                    className={"default-view-checkbox"}
                    label={PackageResources.FeedSettings_ViewPanel_DefaultView_Label}
                    defaultChecked={false}
                    onChange={this._onDefaultViewChange}
                    disabled={this._disableSetDefaultView}
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

    private _getVisibilityOptions(): IChoiceGroupOption[] {
        const options = [];

        if (this.props.isOrganizationUpstreamsFeatureEnabled) {
            options.push({
                key: FeedVisibility.Organization.toString(),
                onRenderLabel: option => (
                    <Label id={option.labelId}>
                        <div>{PackageResources.FeedSettings_Views_Grid_Permissions_Organization}</div>
                        <div className={"subtle"}>
                            {PackageResources.FeedSettings_ViewPanel_Visibility_Organization_Explainer}
                        </div>
                    </Label>
                ),
                text: PackageResources.FeedSettings_Views_Grid_Permissions_Organization
            });
        }

        // Normally we only show either organization or collection option; if both feature flags are on, show only organization.
        // But if both feature flags are turned on and a user currently has collection for an existing view, show the currently selected collection option also.
        if (
            (this.props.isCollectionUpstreamsFeatureEnabled && !this.props.isOrganizationUpstreamsFeatureEnabled) ||
            (this.props.isCollectionUpstreamsFeatureEnabled &&
                this.props.isViewPanelInEditMode &&
                this.props.selectedView.visibility === FeedVisibility.Collection)
        ) {
            options.push({
                key: FeedVisibility.Collection.toString(),
                onRenderLabel: option => (
                    <Label id={option.labelId}>{PackageResources.FeedSettings_ViewPanel_Visibility_Collection}</Label>
                ),
                text: PackageResources.FeedSettings_ViewPanel_Visibility_Collection
            });
        }

        options.push({
            key: FeedVisibility.Private.toString(),
            onRenderLabel: option => (
                <Label id={option.labelId}>{PackageResources.FeedSettings_ViewPanel_Visibility_Private}</Label>
            ),
            text: PackageResources.FeedSettings_ViewPanel_Visibility_Private
        });

        return options;
    }

    private _getPermissionsMessageOrList(): JSX.Element {
        if (!this.state.viewPermissions || this.state.viewPermissions.length === 0) {
            return null;
        }

        return (
            <VssDetailsList
                className="permissions-grid"
                usePresentationStyles={true}
                presentationStyles={undefined}
                items={this.state.viewPermissions}
                selectionPreservedOnEmptyClick={true}
                allocateSpaceForActionsButtonWhileHidden={false}
                columns={this._getPermissionColumns()}
            />
        );
    }

    private _getPermissionColumns(): IColumn[] {
        return [
            {
                key: "entity",
                fieldName: "entity",
                name: PackageResources.FeedSettings_Permissions_Grid_UserGroup,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (permission: FeedPermission): string => {
                    return permission.displayName;
                },
                minWidth: 200,
                maxWidth: 400,
                isResizable: true
            },
            {
                key: "role",
                fieldName: "role",
                name: PackageResources.FeedSettings_Permissions_Grid_Role,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (permission: FeedPermission): string => {
                    return RoleHelper.roleToLocaleString(permission.role);
                },
                minWidth: 200,
                maxWidth: 200
            },
            {
                key: "delete",
                fieldName: "delete",
                name: PackageResources.FeedSettings_Grid_DeleteColumn,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (permission: FeedPermission): JSX.Element => {
                    const iconClassName = this.props.isUserAdmin ? "edit-delete" : "edit-delete-disabled";
                    return (
                        <TooltipHost
                            content={PackageResources.FeedSettings_Permissions_Grid_RemovePermission_AriaLabel}
                        >
                            <CommandButton
                                className={"edit-delete-container"}
                                ariaLabel={PackageResources.FeedSettings_Permissions_Grid_RemovePermission_AriaLabel}
                                disabled={!this.props.isUserAdmin}
                                iconProps={{
                                    iconName: "Clear",
                                    className: iconClassName
                                }}
                                onClick={() => this._removeViewPermission(permission)}
                            />
                        </TooltipHost>
                    );
                },
                minWidth: 30,
                maxWidth: 30
            }
        ];
    }

    @autobind
    private _onRenderFooterContent(): JSX.Element {
        return (
            <div className="add-view-panel-footer">
                <PrimaryButton onClick={this._onClickAction} disabled={this._isAddDisabled()}>
                    {this._submitButtonText}
                </PrimaryButton>
                <DefaultButton onClick={this._onDismiss} disabled={this.props.isSavingChanges === true}>
                    {PackageResources.FeedSettings_CloseButton_Label}
                </DefaultButton>
            </div>
        );
    }

    private _getStateAndUpdateProperties(props: IViewPanelProps): IViewPanelState {
        const defaultVisibilityType: FeedVisibility = props.isOrganizationUpstreamsFeatureEnabled
            ? FeedVisibility.Organization
            : props.isCollectionUpstreamsFeatureEnabled
                ? FeedVisibility.Collection
                : FeedVisibility.Private;
        let newState: IViewPanelState;

        if (props.isViewPanelInEditMode) {
            // edit
            newState = {
                viewName: props.selectedView.name,
                defaultViewChecked:
                    props.defaultViewId && props.selectedView && props.selectedView.id === props.defaultViewId,
                selectedVisibilityType: props.selectedView.visibility,
                newViewId: null,
                viewPermissions: this.props.viewPermissions
            };

            this._headerText = PackageResources.FeedSettings_ViewPanel_EditHeader;
            this._submitButtonText = PackageResources.FeedSettings_OkButton_Label;
            this._onClickAction = this._editView;
            this._disableSetDefaultView = this.state.defaultViewChecked;
        } else {
            // add
            newState = {
                viewName: Utils_String.empty,
                defaultViewChecked: false,
                selectedVisibilityType: defaultVisibilityType,
                newViewId: Utils_String.generateUID(),
                viewPermissions: []
            };

            this._headerText = PackageResources.FeedSettings_ViewPanel_AddHeader;
            this._submitButtonText = PackageResources.FeedSettings_SaveButton_Label;
            this._onClickAction = this._addView;
            this._identity = null;
        }

        return newState;
    }

    private _isAddDisabled(): boolean {
        let hasChanges: boolean = false;
        if (this.props.isViewPanelInEditMode) {
            hasChanges =
                hasChanges ||
                this.props.selectedView.name !== this.state.viewName ||
                (this.props.selectedView.id !== this.props.defaultViewId && this.state.defaultViewChecked) ||
                this.props.selectedView.visibility !== this.state.selectedVisibilityType;
        }

        if (this.props.viewPermissions.length !== this.state.viewPermissions.length) {
            hasChanges = true;
        } else {
            for (let i: number = 0; i < this.props.viewPermissions.length; i++) {
                if (this.props.viewPermissions[i].identityId !== this.state.viewPermissions[i].identityId) {
                    hasChanges = true;
                    break;
                }
            }
        }

        return (
            (this.props.isViewPanelInEditMode && !hasChanges) ||
            this.state.viewName === Utils_String.empty ||
            this.props.validationErrorBag[FeedSettingsComponents.viewName] != null ||
            this.props.isSavingChanges
        );
    }

    private _isAddPermissionDisabled(): boolean {
        // if panel was just opened or user has entered invalid name for view
        return this._identity == null || this.props.validationErrorBag[FeedSettingsComponents.viewPermission] != null;
    }

    @autobind
    private _onViewNameChanged(viewName: string): void {
        this.setState({
            viewName
        });

        FeedSettingsActionCreator.onViewNameChanged.invoke({
            viewName,
            originalViewName: this.props.isViewPanelInEditMode ? this.props.selectedView.name : null
        });
    }

    @autobind
    private _onDefaultViewChange(ev: React.FormEvent<HTMLElement | HTMLInputElement>, checked: boolean): void {
        this.setState({
            defaultViewChecked: checked
        });
    }

    @autobind
    private _onDismiss(): void {
        FeedSettingsActionCreator.toggleViewPanelDisplay.invoke({ isOpen: false, isEditing: null });
    }

    @autobind
    private _addView(): void {
        FeedSettingsActionCreator.saveViewClicked.invoke({
            view: {
                /* Temp id for identifying the default view,
                    server will generate a new one when the view is saved. */
                id: this.state.newViewId,
                name: this.state.viewName,
                type: FeedViewType.Release,
                visibility: this.state.selectedVisibilityType
            } as FeedView,
            makeThisDefaultView: this.state.defaultViewChecked,
            viewPermissions: this.state.viewPermissions
        });
    }

    @autobind
    private _editView(): void {
        FeedSettingsActionCreator.saveViewClicked.invoke({
            view: {
                id: this.props.selectedView.id,
                name: this.state.viewName,
                type: this.props.selectedView.type,
                visibility: this.state.selectedVisibilityType
            } as FeedView,
            makeThisDefaultView: this.state.defaultViewChecked,
            viewPermissions: this.state.viewPermissions
        });
    }

    @autobind
    private _onIdentitiesResolved(identities: IEntity[]): void {
        if (identities == null || identities.length === 0) {
            return;
        }

        this._identity = identities[0];

        const permission: FeedPermission = this.getViewPermission();

        // This handler validate the selected permission
        FeedSettingsActionCreator.addViewPermissionChanged.invoke({ viewId: this._getViewId(), permission });
    }

    @autobind
    private _addViewPermission(): void {
        const permission: FeedPermission = this.getViewPermission();
        this._identity = null;

        const updatedPermissions: FeedPermission[] = this.state.viewPermissions.slice();
        updatedPermissions.push(permission);
        this.setState({ viewPermissions: updatedPermissions });
    }

    @autobind
    private _removeViewPermission(permission: FeedPermission): void {
        const updatedPermissions: FeedPermission[] = this.state.viewPermissions.slice();
        const index: number = updatedPermissions.findIndex(
            (viewPermission: FeedPermission) => viewPermission.identityId === permission.identityId
        );
        updatedPermissions.splice(index, 1);
        this.setState({ viewPermissions: updatedPermissions });
        announce(Utils_String.format(PackageResources.DeletedAnnouncement, permission.displayName));
    }

    private getViewPermission(): FeedPermission {
        if (this._identity == null) {
            return null;
        }

        const feedPermission: FeedPermission = {
            displayName: this._identity.displayName,
            identityId: this._identity.localId,
            role: FeedRole.Reader,
            identityDescriptor: null
        };

        return feedPermission;
    }

    private _getViewId(): string {
        return this.props.selectedView ? this.props.selectedView.id : this.state.newViewId;
    }

    private _getVisibility(s: string): FeedVisibility {
        return parseInt(s, 10);
    }
}
