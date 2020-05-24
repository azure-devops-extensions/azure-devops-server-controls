import * as React from "react";

import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { IObjectWithKey, Selection, SelectionMode } from "OfficeFabric/Selection";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import { Component, Props, State } from "VSS/Flux/Component";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { NoResultsPane } from "Package/Scripts/Components/NoResultsPane";
import { AddUsersOrGroupsPanel } from "Package/Scripts/Components/Settings/AddUsersOrGroupsPanel";
import { SettingsPivotKeys } from "Feed/Common/Constants/Constants";
import { RoleHelper } from "Package/Scripts/Helpers/RoleHelper";
import * as PackageResources from "Feed/Common/Resources";
import { FeedPermission } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/Permissions";

export interface IPermissionsProps extends Props {
    /**
     * Show loading spinner while getting permission for selected feed
     */
    isLoading: boolean;

    /**
     * Keeps track of whether data was fetched from server when this component was mounted
     */
    isDataLoadedFromServer: boolean;

    /**
     * List of permissions set on feed
     */
    permissions: FeedPermission[];

    /**
     * There are no permissions
     */
    hasNoPermissions: boolean;

    /**
     * No permissions after filtering
     */
    hasNoFilterResults: boolean;

    /**
     * Enable/disable project collection-scoped build and release permission button
     */
    collectionScopedPermissionIsDisplayed: boolean;

    /**
     * Enable/disable project-scoped build and release permission button
     */
    projectScopedPermissionIsDisplayed: boolean;

    /**
     * True if <Project Name> Build Service (<account/collection name>) identity exists
     */
    projectScopedPermissionExists: boolean;

    /**
     * If True, display add users or groups Panel to user
     */
    showAddUsersOrGroupsPanel: boolean;

    /**
     * Bag that contains validation errors
     */
    validationErrorBag: IDictionaryStringTo<string>;

    /**
     * True if the current user can make changes to the feed settings
     */
    isUserAdmin: boolean;

    /**
     * Identity Id of project collection administrator group
     */
    projectCollectionAdminGroupId: string;

    /**
     * Tracks if permission is getting saved to server
     */
    isSavingChanges: boolean;

    /**
     * While saving, captures errors if they occur to show in UI
     */
    error: Error;
}

export class Permissions extends Component<IPermissionsProps, State> {
    constructor(props: IPermissionsProps) {
        super(props);

        this.selection = new Selection({
            canSelectItem: (item: IObjectWithKey): boolean => {
                if (this.props.isUserAdmin === false) {
                    return false;
                }

                const permission: FeedPermission = item as FeedPermission;
                if (permission.identityId === this.props.projectCollectionAdminGroupId) {
                    return false;
                }
                return true;
            },
            getKey: (item: IObjectWithKey): string => {
                const permission: FeedPermission = item as FeedPermission;
                return permission.identityId;
            },
            onSelectionChanged: (): void => {
                const permissions = this.selection.getSelection() as FeedPermission[];
                FeedSettingsActionCreator.onPermissionSelectionChanged.invoke(permissions);
            }
        });
    }

    public componentWillMount(): void {
        if (this.props.isDataLoadedFromServer === false) {
            FeedSettingsActionCreator.navigatingToPermissions.invoke({});
        }
    }

    public render(): JSX.Element {
        return (
            <div className="permissions-content">
                {this.props.isLoading ? (
                    <Spinner className="loading-spinner" size={SpinnerSize.medium} />
                ) : (
                    this._getMessageOrList()
                )}
                <AddUsersOrGroupsPanel
                    isOpen={this.props.showAddUsersOrGroupsPanel}
                    validationErrorBag={this.props.validationErrorBag}
                    isSavingChanges={this.props.isSavingChanges}
                    error={this.props.error}
                />
            </div>
        );
    }

    private _getMessageOrList(): JSX.Element {
        if (this.props.hasNoPermissions) {
            return (
                <NoResultsPane
                    header={PackageResources.FeedSettings_Permissions_NoPermissions}
                    subheader={PackageResources.FeedSettings_Permissions_Description}
                    iconClass={"bowtie-cloud-fill"}
                />
            );
        }

        if (this.props.hasNoFilterResults) {
            return (
                <NoResultsPane
                    header={PackageResources.FeedSettings_Permissions_NoPermissionsMatch}
                    iconClass={"bowtie-search"}
                />
            );
        }

        return (
            <VssDetailsList
                className="permissions-grid"
                setKey="permissions-grid"
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                items={this.props.permissions}
                allocateSpaceForActionsButtonWhileHidden={false}
                columns={this._getColumns()}
                selectionMode={SelectionMode.multiple}
                selectionPreservedOnEmptyClick={true}
                selection={this.selection}
                checkboxVisibility={CheckboxVisibility.onHover}
                ariaLabel={PackageResources.FeedSettings_Permissions_Grid_AriaLabel}
                ariaLabelForGrid={PackageResources.FeedSettings_Permissions_Grid_AriaLabelForGrid}
                ariaLabelForListHeader={PackageResources.FeedSettings_Permissions_Grid_AriaLabelForHeader}
                ariaLabelForSelectionColumn={PackageResources.DetailsList_SelectionColumn_AriaLabel}
                ariaLabelForSelectAllCheckbox={PackageResources.DetailsList_SelectAll_AriaLabel}
            />
        );
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: "entity",
                fieldName: "entity",
                name: PackageResources.FeedSettings_Permissions_Grid_UserGroup,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (permission: FeedPermission): JSX.Element => {
                    return <label className="settings-grid-cell">{permission.displayName}</label>;
                },
                minWidth: 300,
                maxWidth: 400,
                isResizable: true
            },
            {
                key: "role",
                fieldName: "role",
                name: PackageResources.FeedSettings_Permissions_Grid_Role,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (permission: FeedPermission): JSX.Element => {
                    return (
                        <label className="settings-grid-cell">{RoleHelper.roleToLocaleString(permission.role)}</label>
                    );
                },
                minWidth: 200,
                maxWidth: 200
            }
        ];
    }

    protected getPivotKey(): string {
        return SettingsPivotKeys.permissions;
    }

    private selection: Selection;
}
