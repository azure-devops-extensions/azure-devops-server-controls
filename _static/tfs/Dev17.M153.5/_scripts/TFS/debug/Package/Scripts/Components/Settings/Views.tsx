import * as React from "react";

import { PrimaryButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/Callout";
import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { Icon } from "OfficeFabric/Icon";
import { IObjectWithKey, Selection, SelectionMode } from "OfficeFabric/Selection";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { Component, Props, State } from "VSS/Flux/Component";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { InfoCallout } from "Package/Scripts/Components/InfoCallout";
import { NoResultsPane } from "Package/Scripts/Components/NoResultsPane";
import { ViewPanel } from "Package/Scripts/Components/Settings/ViewPanel";
import { SettingsPivotKeys } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";
import { FeedPermission, FeedView, FeedViewType, FeedVisibility } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/Views";

export interface IViewsProps extends Props {
    /**
     * Tracks loading spinner
     */
    isLoading: boolean;

    /**
     * Keeps track of whether data was fetched from server when this component was mounted
     */
    isDataLoadedFromServer: boolean;

    /**
     * List of View available for the current feed
     */
    views: FeedView[];

    /**
     * View permissions dictionary, keyed on view id
     */
    viewPermissions: IDictionaryStringTo<FeedPermission[]>;

    /**
     * There are no upstream sources
     */
    hasNoViews: boolean;

    /**
     * No views after filtering
     */
    hasNoFilterResults: boolean;

    /**
     * Guid of feed's default view
     */
    defaultViewId: string;

    /**
     * Bag that contains validation errors
     */
    validationErrorBag: IDictionaryStringTo<string>;

    /**
     * True if the current user can make changes to the feed settings
     */
    isUserAdmin: boolean;

    /**
     * Show or hide add/edit view panel
     */
    showViewPanelDisplay: boolean;

    /**
     * Selected Views in grid
     */
    selectedViews: FeedView[];

    /**
     * Is ViewPanel opened for Add or Edit
     */
    isViewPanelInEditMode?: boolean;

    /**
     * InternalCollectionUpstreams feature state
     */
    isCollectionUpstreamsFeatureEnabled: boolean;

    /**
     * InternalOrganizationUpstreams feature state
     */
    isOrganizationUpstreamsFeatureEnabled: boolean;

    /**
     * Tracks if views are getting saved to server
     */
    isSavingChanges: boolean;

    /**
     * While saving, captures errors if they occur to show in Panel
     */
    error: Error;
}

export class Views extends Component<IViewsProps, State> {
    constructor(props: IViewsProps) {
        super(props);

        this.selection = new Selection({
            canSelectItem: (item: IObjectWithKey): boolean => {
                if (this.props.isUserAdmin === false) {
                    return false;
                }

                if (this.props.isSavingChanges === true) {
                    return false;
                }

                return true;
            },
            getKey: (item: IObjectWithKey): string => {
                const view: FeedView = item as FeedView;
                return view.id;
            },
            onSelectionChanged: (): void => {
                const selections = this.selection.getSelection() as FeedView[];
                FeedSettingsActionCreator.onViewSelectionChanged.invoke(selections);
            }
        });
    }

    public componentWillMount(): void {
        if (super.componentWillMount) {
            super.componentWillMount();
        }
        if (this.props.isDataLoadedFromServer === false) {
            FeedSettingsActionCreator.navigatingToViews.invoke({});
        }
    }

    public componentDidUpdate() {
        // Selected views clears out after saving an edit
        if (this.props.selectedViews.length === 0) {
            this.selection.setAllSelected(false);
        }
    }

    public render(): JSX.Element {
        this._viewPermissionsDisplay = this._getPermissionsDisplay();
        return (
            <div className="views-content">
                {this.props.isLoading ? (
                    <Spinner className="loading-spinner" size={SpinnerSize.medium} />
                ) : (
                    this._getMessageOrList()
                )}
                <ViewPanel
                    isOpen={this.props.showViewPanelDisplay}
                    validationErrorBag={this.props.validationErrorBag}
                    isViewPanelInEditMode={this.props.isViewPanelInEditMode}
                    viewPermissions={this._getSelectedViewPermissions()}
                    selectedView={this.props.selectedViews[0]}
                    defaultViewId={this.props.defaultViewId}
                    isCollectionUpstreamsFeatureEnabled={this.props.isCollectionUpstreamsFeatureEnabled}
                    isOrganizationUpstreamsFeatureEnabled={this.props.isOrganizationUpstreamsFeatureEnabled}
                    isUserAdmin={this.props.isUserAdmin}
                    isSavingChanges={this.props.isSavingChanges}
                    error={this.props.error}
                />
            </div>
        );
    }

    private _getMessageOrList(): JSX.Element {
        if (this.props.hasNoViews) {
            return (
                <NoResultsPane
                    header={PackageResources.FeedSettings_Views_NoViews}
                    subheader={PackageResources.FeedSettings_Views_Description}
                    iconClass={"bowtie-cloud-fill"}
                >
                    {this.props.isUserAdmin ? (
                        <PrimaryButton
                            className="add-view-button"
                            iconProps={{ iconName: "Add" }}
                            ariaLabel={PackageResources.FeedSettings_Views_AddView_Label}
                            onClick={() => {
                                FeedSettingsActionCreator.toggleViewPanelDisplay.invoke({
                                    isOpen: true,
                                    isEditing: false
                                });
                            }}
                        >
                            {PackageResources.FeedSettings_Views_AddView_Label}
                        </PrimaryButton>
                    ) : (
                        <div />
                    )}
                </NoResultsPane>
            );
        }

        if (this.props.hasNoFilterResults) {
            return (
                <NoResultsPane header={PackageResources.FeedSettings_Views_NoViewsMatch} iconClass={"bowtie-search"} />
            );
        }

        return (
            <VssDetailsList
                className="views-grid"
                setKey="views-grid"
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                items={this.props.views}
                allocateSpaceForActionsButtonWhileHidden={false}
                columns={this._getColumns()}
                selectionMode={SelectionMode.multiple}
                selectionPreservedOnEmptyClick={true}
                selection={this.selection}
                checkboxVisibility={CheckboxVisibility.onHover}
                ariaLabel={PackageResources.FeedSettings_Views_Grid_AriaLabel}
                ariaLabelForGrid={PackageResources.FeedSettings_Views_Grid_AriaLabelForGrid}
                ariaLabelForListHeader={PackageResources.FeedSettings_Views_Grid_AriaLabelForHeader}
                ariaLabelForSelectionColumn={PackageResources.DetailsList_SelectionColumn_AriaLabel}
                ariaLabelForSelectAllCheckbox={PackageResources.DetailsList_SelectAll_AriaLabel}
            />
        );
    }

    private _getColumns(): IColumn[] {
        const columns: IColumn[] = [];

        columns.push({
            key: "view",
            fieldName: "view",
            name: PackageResources.FeedSettings_Views_Grid_View,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (view: FeedView): JSX.Element => {
                return (
                    <div className="view-name-container">
                        <label className="view-name-cell settings-grid-cell">{view.name}</label>
                        {view.type === FeedViewType.Implicit && (
                            <InfoCallout
                                directionalHint={DirectionalHint.bottomLeftEdge}
                                className="view-info"
                                buttonAriaLabel={PackageResources.FeedSettings_Views_Local_AriaLabel}
                                calloutMessage={PackageResources.FeedSettings_Views_Grid_ImplicitView_Info}
                            />
                        )}
                    </div>
                );
            },
            minWidth: 200,
            maxWidth: 400,
            isResizable: true
        });

        if (this.props.isOrganizationUpstreamsFeatureEnabled || this.props.isCollectionUpstreamsFeatureEnabled) {
            columns.push({
                key: "permissions",
                fieldName: "permissions",
                name: PackageResources.FeedSettings_Views_Grid_Permissions,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (view: FeedView): JSX.Element => {
                    const permission =
                        this._viewPermissionsDisplay[view.id] && this._viewPermissionsDisplay[view.id].join("; ");
                    return (
                        <TooltipHost overflowMode={TooltipOverflowMode.Parent} content={permission}>
                            <label className="settings-grid-cell">{permission}</label>
                        </TooltipHost>
                    );
                },
                minWidth: 200,
                maxWidth: 400,
                isResizable: true
            });
        }

        columns.push({
            key: "isDefaultView",
            fieldName: "isDefaultView",
            name: PackageResources.FeedSettings_Views_Grid_DefaultView,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (view: FeedView): JSX.Element => {
                return (
                    view.id === this.props.defaultViewId && (
                        <TooltipHost content={PackageResources.FeedSettings_Views_Grid_DefaultView}>
                            <Icon
                                ariaLabel={PackageResources.FeedSettings_Views_Grid_DefaultView}
                                iconName="CheckMark"
                            />
                        </TooltipHost>
                    )
                );
            },
            minWidth: 60,
            maxWidth: 60
        });

        return columns;
    }

    private _getPermissionsDisplay(): IDictionaryStringTo<string[]> {
        const viewPermissionsDisplay: IDictionaryStringTo<string[]> = {};

        if (this.props.viewPermissions == null) {
            return viewPermissionsDisplay;
        }

        this.props.views.forEach((view: FeedView) => {
            if (view.visibility === FeedVisibility.Organization && this.props.isOrganizationUpstreamsFeatureEnabled) {
                viewPermissionsDisplay[view.id] = [
                    PackageResources.FeedSettings_Views_Grid_Permissions_Private,
                    PackageResources.FeedSettings_Views_Grid_Permissions_Organization
                ];
                return;
            }

            if (view.visibility === FeedVisibility.Collection && this.props.isCollectionUpstreamsFeatureEnabled) {
                viewPermissionsDisplay[view.id] = [
                    PackageResources.FeedSettings_Views_Grid_Permissions_Private,
                    PackageResources.FeedSettings_Views_Grid_Permissions_Collection
                ];
                return;
            }

            const currentViewPermissions = this.props.viewPermissions[view.id];
            if (!currentViewPermissions || currentViewPermissions.length === 0) {
                viewPermissionsDisplay[view.id] = [PackageResources.FeedSettings_Views_Grid_Permissions_Private];
                return;
            }

            const permissionsDisplay: string[] = [PackageResources.FeedSettings_Views_Grid_Permissions_Private];
            currentViewPermissions.forEach((permission: FeedPermission) =>
                permissionsDisplay.push(permission.displayName)
            );
            viewPermissionsDisplay[view.id] = permissionsDisplay;
        });
        return viewPermissionsDisplay;
    }

    private _getSelectedViewPermissions(): FeedPermission[] {
        if (!this.props.viewPermissions || !this.props.selectedViews[0]) {
            return [];
        }

        return this.props.viewPermissions[this.props.selectedViews[0].id] || [];
    }

    protected getPivotKey(): string {
        return SettingsPivotKeys.views;
    }

    private selection: Selection;

    // Text representation of permissions to be displayed per view, keyed by view id
    private _viewPermissionsDisplay: IDictionaryStringTo<string[]>;
}
