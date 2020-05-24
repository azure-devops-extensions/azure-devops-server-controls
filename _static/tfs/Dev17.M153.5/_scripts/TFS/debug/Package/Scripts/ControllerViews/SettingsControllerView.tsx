import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar } from "OfficeFabric/MessageBar";
import { SelectionMode } from "OfficeFabric/Selection";
import { autobind, findIndex } from "OfficeFabric/Utilities";

import { Component, Props } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { IVssIconProps } from "VSSUI/Components/VssIcon";
import { FilterBar, IFilterBarProps } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub, IHub } from "VSSUI/Hub";
import { PickListFilterBarItem } from "VSSUI/PickList";
import { IPivotBarAction, PivotBarFocusItem, PivotBarItem } from "VSSUI/PivotBar";
import { FILTER_CHANGE_EVENT, IFilterState } from "VSSUI/Utilities/Filter";
import { HubViewStateEventNames } from "VSSUI/Utilities/HubViewState";
import { VssIconType } from "VSSUI/VssIcon";

import { IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";

import * as Actions from "Package/Scripts/Actions/Actions";
import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { FeedDetailsPane, IFeedDetailsPaneProps } from "Package/Scripts/Components/Settings/FeedDetailsPane";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { MapIFeedSettingsStateToProps } from "Package/Scripts/Components/Settings/MapIFeedSettingsStateToProps";
import { IPermissionsProps, Permissions } from "Package/Scripts/Components/Settings/Permissions";
import { UpstreamSettingsFilterBar } from "Package/Scripts/Components/Settings/UpstreamSettingsFilterBar";
import { IUpstreamSettingsRowData } from "Package/Scripts/Components/Settings/UpstreamSettingsList";
import { IUpstreamSettingsPaneProps, UpstreamSettingsPane } from "Package/Scripts/Components/Settings/UpstreamSettingsPane";
import { IViewsProps, Views } from "Package/Scripts/Components/Settings/Views";
import { WelcomePanel } from "Package/Scripts/Components/WelcomePanel";
import { GeneralDialog } from "Package/Scripts/Dialogs/GeneralDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { FeedStore } from "Package/Scripts/Stores/FeedStore";
import { FeedView, FeedViewType } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/ControllerViews/SettingsControllerView";

import { FeedSettingsCi, FwLinks, SettingsFilterItemKey, SettingsPivotKeys } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export interface ISettingsControllerViewProps extends Props {
    store: FeedStore;
}

export class SettingsControllerView extends Component<ISettingsControllerViewProps, IFeedSettingsState> {
    constructor(props: ISettingsControllerViewProps) {
        super(props);

        this._pivotUrls = {};
        [
            SettingsPivotKeys.details,
            SettingsPivotKeys.permissions,
            SettingsPivotKeys.views,
            SettingsPivotKeys.upstreams
        ].forEach((pivotKey: string) => {
            this._pivotUrls[pivotKey] = this.state.hubViewState.createObservableUrl({ view: pivotKey });
        });

        // TODO: inject this via props?
        // tslint:disable:no-unused-expression
        new FeedSettingsActionCreator(this.getStore());
    }

    public componentWillMount(): void {
        FeedSettingsActionCreator.onInitialPivotLoad.invoke(this.state.hubViewState.selectedPivot.value);
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.state.hubViewState.subscribe(this.onPivotChanging, HubViewStateEventNames.pivotChanging);
        this.state.permissionsFilter.subscribe(this.onPermissionsFilterChanged, FILTER_CHANGE_EVENT);
        this.state.viewsFilter.subscribe(this.onViewsFilterChanged, FILTER_CHANGE_EVENT);
        this.state.upstreamSourceFilter.subscribe(this.onUpstreamSourceFilterChanged, FILTER_CHANGE_EVENT);

        this.state.hubViewState.selectedPivot.subscribe(this.onPivotChanged);
    }

    public componentWillUnmount(): void {
        this.state.permissionsFilter.unsubscribe(this.onPermissionsFilterChanged, FILTER_CHANGE_EVENT);
        this.state.viewsFilter.unsubscribe(this.onViewsFilterChanged, FILTER_CHANGE_EVENT);
        this.state.upstreamSourceFilter.unsubscribe(this.onUpstreamSourceFilterChanged, FILTER_CHANGE_EVENT);
        this.state.hubViewState.unsubscribe(this.onPivotChanging);
        this.state.hubViewState.selectedPivot.unsubscribe(this.onPivotChanged);
        [
            SettingsPivotKeys.details,
            SettingsPivotKeys.permissions,
            SettingsPivotKeys.views,
            SettingsPivotKeys.upstreams
        ].forEach((pivotKey: string) => {
            this._pivotUrls[pivotKey].dispose();
        });
        super.componentWillUnmount();
    }

    public componentDidUpdate(): void {
        if (this.state.isSavingChanges === false && this.isMoveUpOrDown === true) {
            this.hub.pivotBar.focus(PivotBarFocusItem.commands);
            this.isMoveUpOrDown = false;
        }
    }

    public render(): JSX.Element {
        this._feedDetailsProps = MapIFeedSettingsStateToProps.ToFeedDetailsProps(this.state);
        this._permissionsProps = MapIFeedSettingsStateToProps.ToPermissionsProps(this.state);
        this._viewsProps = MapIFeedSettingsStateToProps.ToViewsProps(this.state);
        this._upstreamProps = MapIFeedSettingsStateToProps.ToUpstreamSettingsProps(this.state);

        return (
            <div className={"settings-controller-view "}>
                {this.state.showWelcomeMessage() ? (
                    <WelcomePanel />
                ) : (
                    <div>
                        <h1 className="hidden-package-h1">
                            {PackageResources.FeedSettings_Title /*hidden h1 for accessibility*/}
                        </h1>
                        {this.state.messageBarMessage != null && (
                            <MessageBar
                                onDismiss={() => {
                                    FeedSettingsActionCreator.onDismissMessageBar.invoke({});
                                }}
                                messageBarType={this.state.messageBarType}
                            >
                                {
                                    /* Ideally, there should be only 1 message bar but
                                        existing message bar is operating under global store */
                                    this.state.messageBarMessage
                                }
                            </MessageBar>
                        )}
                        {this.state.dialogProps && <GeneralDialog {...this.state.dialogProps} />}
                        <Dialog
                            hidden={this.state.showDiscardDialog === false}
                            onDismiss={this._onDiscardDialogStayOnPage}
                            dialogContentProps={{
                                type: DialogType.normal,
                                title: PackageResources.FeedSettings_DiscardDialog_Title
                            }}
                            modalProps={{
                                isBlocking: false
                            }}
                        >
                            {PackageResources.FeedSettings_DiscardDialog_Description}
                            <DialogFooter>
                                <PrimaryButton
                                    text={PackageResources.FeedSettings_SaveButton_Label}
                                    onClick={this._onUnsavedChangesDialogSave}
                                />
                                <DefaultButton
                                    text={PackageResources.FeedSettings_DiscardButton_Label}
                                    onClick={this._onUnsavedChangesDialogDiscard}
                                />
                            </DialogFooter>
                        </Dialog>
                        <Hub
                            componentRef={(hub: IHub) => {
                                this.hub = hub;
                            }}
                            className="feed-settings-hub"
                            hubViewState={this.state.hubViewState}
                            hideFullScreenToggle={true}
                            onRenderFilterBar={this.onRenderFilterBar}
                            showFilterBarInline={false}
                            viewActions={this._getViewActions()}
                        >
                            <HubHeader
                                title={PackageResources.FeedSettings_Title}
                                breadcrumbItems={[
                                    {
                                        key: "selectedFeed",
                                        text: this.state.feed().name,
                                        onClick: (): void => {
                                            this.onBreadcrumbClick();
                                        }
                                    }
                                ]}
                            />
                            <PivotBarItem
                                name={PackageResources.FeedDetailsPane_FeedDetails}
                                itemKey={SettingsPivotKeys.details}
                                url={this._pivotUrls[SettingsPivotKeys.details]}
                                commands={this.getPivotBarActions(SettingsPivotKeys.details)}
                            >
                                <FeedDetailsPane {...this._feedDetailsProps} />
                            </PivotBarItem>
                            <PivotBarItem
                                className="detailsListPadding"
                                name={PackageResources.FeedSettings_Permissions_Title}
                                itemKey={SettingsPivotKeys.permissions}
                                url={this._pivotUrls[SettingsPivotKeys.permissions]}
                                commands={this.getPivotBarActions(SettingsPivotKeys.permissions)}
                            >
                                <Permissions {...this._permissionsProps} />
                            </PivotBarItem>
                            <PivotBarItem
                                className="detailsListPadding"
                                name={PackageResources.FeedSettings_Views_Title}
                                itemKey={SettingsPivotKeys.views}
                                url={this._pivotUrls[SettingsPivotKeys.views]}
                                commands={this.getPivotBarActions(SettingsPivotKeys.views)}
                            >
                                <Views {...this._viewsProps} />
                            </PivotBarItem>
                            <PivotBarItem
                                className="detailsListPadding"
                                name={PackageResources.UpstreamSettings_Title}
                                itemKey={SettingsPivotKeys.upstreams}
                                url={this._pivotUrls[SettingsPivotKeys.upstreams]}
                                commands={this.getPivotBarActions(SettingsPivotKeys.upstreams)}
                            >
                                <UpstreamSettingsPane {...this._upstreamProps} />
                            </PivotBarItem>
                        </Hub>
                    </div>
                )}
            </div>
        );
    }

    private _getViewActions(): IPivotBarAction[] {
        let documentationHref: string = null;

        if (this.state.hubViewState.selectedPivot.value === SettingsPivotKeys.views) {
            documentationHref = FwLinks.ViewsDocs;
        } else if (this.state.hubViewState.selectedPivot.value === SettingsPivotKeys.upstreams) {
            documentationHref = FwLinks.UpstreamDocs;
        }

        if (documentationHref) {
            return [
                {
                    key: "help",
                    important: true,
                    iconProps: {
                        iconType: VssIconType.fabric,
                        iconName: "Unknown"
                    } as IVssIconProps,
                    href: documentationHref,
                    target: "_blank",
                    title: PackageResources.FeedSettings_Documentation,
                    ariaLabel: PackageResources.FeedSettings_DocumentationLink_AriaLabel
                } as IPivotBarAction
            ];
        }

        return [];
    }

    public getStore(): FeedStore {
        return this.props.store;
    }

    public getState(): IFeedSettingsState {
        return this.getStore().getFeedSettingsState();
    }

    @autobind
    private onRenderFilterBar(): React.ReactElement<IFilterBarProps> {
        const pivotKey = this.state.hubViewState.selectedPivot.value;
        switch (pivotKey) {
            case SettingsPivotKeys.permissions:
                return this.getPermissionsFilterBar();
            case SettingsPivotKeys.views:
                return this.getViewsFilterBar();
            case SettingsPivotKeys.upstreams:
                return <UpstreamSettingsFilterBar {...this._upstreamProps} />;
            default:
                return null;
        }
    }

    private getPermissionsFilterBar(): JSX.Element {
        return (
            <FilterBar filter={this.state.permissionsFilter}>
                <KeywordFilterBarItem
                    key={SettingsFilterItemKey.userOrGroup}
                    placeholder={Utils_String.format(
                        PackageResources.FeedSettings_FilterBy,
                        PackageResources.FeedSettings_Permissions_Grid_UserGroup
                    )}
                    filterItemKey={SettingsFilterItemKey.userOrGroup}
                />
                <PickListFilterBarItem
                    placeholder={PackageResources.FeedSettings_Permissions_Grid_Role}
                    filterItemKey={SettingsFilterItemKey.role}
                    selectionMode={SelectionMode.multiple}
                    getPickListItems={() => {
                        const roles = [
                            PackageResources.FeedSettings_Permissions_Role_Owner,
                            PackageResources.FeedSettings_Permissions_Role_Contributor,
                            PackageResources.FeedSettings_Permissions_Role_Collaborator
                        ];
                        roles.push(PackageResources.FeedSettings_Permissions_Role_Reader);
                        return roles;
                    }}
                />
            </FilterBar>
        );
    }

    private getViewsFilterBar(): JSX.Element {
        return (
            <FilterBar filter={this.state.viewsFilter}>
                <KeywordFilterBarItem
                    key={SettingsFilterItemKey.views}
                    placeholder={Utils_String.format(
                        PackageResources.FeedSettings_FilterBy,
                        PackageResources.FeedSettings_Views_Grid_View
                    )}
                    filterItemKey={SettingsFilterItemKey.views}
                />
            </FilterBar>
        );
    }

    private getPivotBarActions(pivotKey: string): IPivotBarAction[] {
        const pivotBarActions: IPivotBarAction[] = [];

        switch (pivotKey) {
            case SettingsPivotKeys.details:
                pivotBarActions.push(...this._getDetailsPivotBarActions());
                break;
            case SettingsPivotKeys.permissions:
                pivotBarActions.push(...this._getPermissionsPivotBarActions());
                break;
            case SettingsPivotKeys.views:
                pivotBarActions.push(...this._getViewsPivotBarActions());
                break;
            case SettingsPivotKeys.upstreams:
                pivotBarActions.push(...this._getUpstreamSettingsActions());
                break;
            default:
                break;
        }

        return pivotBarActions;
    }

    private pivotHasChanges(pivotKey: string): boolean {
        if (!this.state.isUserAdmin()) {
            return false;
        }

        switch (pivotKey) {
            case SettingsPivotKeys.details:
                return this._feedDetailsProps.hasChanges() || this._feedDetailsProps.hasValidationErrors();
        }
    }

    private _getDetailsPivotBarActions(): IPivotBarAction[] {
        const pivotBarActions: IPivotBarAction[] = [
            {
                key: "delete-feed",
                name: PackageResources.FeedDetailsPane_DeleteFeedButton_Label,
                important: true,
                iconProps: {
                    iconName: "Delete",
                    className: "delete-icon"
                },
                onClick: (): void => {
                    FeedSettingsActionCreator.showDeleteFeedDialog.invoke(null);
                },
                disabled: !this.state.isUserAdmin()
            }
        ];

        return pivotBarActions;
    }

    private _getPermissionsPivotBarActions(): IPivotBarAction[] {
        const isDeleteActionDisabled =
            !this.state.isUserAdmin() ||
            this.state.selectedPermissions.length === 0 ||
            this.state.isSavingChanges === true;

        const pivotBarActions: IPivotBarAction[] = [
            {
                key: "permissions-addUserOrGroup",
                name: PackageResources.FeedSettings_Permissions_Grid_AddPermission_Label,
                important: true,
                iconProps: { iconName: "Add" },
                onClick: (): void => {
                    FeedSettingsActionCreator.toggleAddUserOrGroupPanelDisplay.invoke(true /*open panel*/);
                },
                disabled: !this.state.isUserAdmin() || this.state.isSavingChanges === true
            },
            {
                key: "permissions-delete",
                name: "Delete",
                important: true,
                iconProps: {
                    iconName: "Delete",
                    className: isDeleteActionDisabled ? "" : "delete-icon"
                },
                onClick: (): void => {
                    FeedSettingsActionCreator.showDeletePermissionsDialog.invoke(null);
                },
                disabled: isDeleteActionDisabled
            },
            {
                key: "permissions-addCollectionScopedBuildPermission",
                name: PackageResources.FeedSettings_Permissions_Grid_AddCollectionScopedPermission_Label,
                disabled:
                    this._permissionsProps.collectionScopedPermissionIsDisplayed ||
                    !this.state.isUserAdmin() ||
                    this.state.isSavingChanges === true,
                iconProps: {
                    iconName: "bowtie-build",
                    iconType: VssIconType.bowtie /* replace this with fabric icon when available*/
                },
                onClick: (): void => {
                    FeedSettingsActionCreator.addScopedBuildPermissionClicked.invoke(true /* collectionScope */);
                }
            }
        ];

        if (this._permissionsProps.projectScopedPermissionExists) {
            pivotBarActions.push({
                key: "permissions-addProjectScopedBuildPermission",
                name: PackageResources.FeedSettings_Permissions_Grid_AddProjectScopedPermission_Label,
                disabled:
                    this._permissionsProps.projectScopedPermissionIsDisplayed ||
                    !this.state.isUserAdmin() ||
                    this.state.isSavingChanges === true,
                iconProps: { iconName: "bowtie-build", iconType: VssIconType.bowtie },
                onClick: (): void => {
                    FeedSettingsActionCreator.addScopedBuildPermissionClicked.invoke(false /* projectScope */);
                }
            });
        }

        return pivotBarActions;
    }

    private _getViewsPivotBarActions(): IPivotBarAction[] {
        const isDeleteActionDisabled =
            !this.state.isUserAdmin() ||
            this.state.selectedViews.length === 0 ||
            this.state.selectedViews.some((view: FeedView) => {
                return view.type === FeedViewType.Implicit;
            }) ||
            this.state.isSavingChanges === true;

        const pivotBarActions: IPivotBarAction[] = [
            {
                key: "add-views",
                name: PackageResources.FeedSettings_Views_AddView_Label,
                important: true,
                iconProps: { iconName: "Add" },
                onClick: (): void => {
                    FeedSettingsActionCreator.toggleViewPanelDisplay.invoke({ isOpen: true, isEditing: false });
                },
                disabled: !this.state.isUserAdmin()
            }
        ];

        if (
            this.state.internalUpstreamSettings.collectionUpstreamsEnabled ||
            this.state.internalUpstreamSettings.organizationUpstreamsEnabled
        ) {
            pivotBarActions.push({
                key: "edit-views",
                name: PackageResources.FeedSettings_Views_EditView_Label,
                important: true,
                iconProps: { iconName: "Edit" },
                onClick: (): void => {
                    FeedSettingsActionCreator.toggleViewPanelDisplay.invoke({ isOpen: true, isEditing: true });
                },
                disabled:
                    !this.state.isUserAdmin() ||
                    this.state.selectedViews.length !== 1 ||
                    this.state.isSavingChanges === true
            });
        }

        pivotBarActions.push({
            key: "views-delete",
            name: PackageResources.FeedSettings_Views_DeleteButton_Label,
            important: true,
            iconProps: {
                iconName: "Delete",
                className: isDeleteActionDisabled ? "" : "delete-icon"
            },
            onClick: (): void => {
                FeedSettingsActionCreator.showDeleteViewsDialog.invoke(null);
            },
            disabled: isDeleteActionDisabled
        });

        pivotBarActions.push({
            key: "views-make-default",
            name: PackageResources.FeedSettings_Views_SetDefaultViewButton_Label,
            important: true,
            iconProps: {
                iconName: "CheckMark"
            },
            onClick: (): void => {
                const view = this.state.selectedViews[0];
                FeedSettingsActionCreator.markDefaultViewClicked.invoke(view);
            },
            disabled:
                !this.state.isUserAdmin() ||
                this.state.selectedViews.length !== 1 ||
                this.state.isSavingChanges === true ||
                this.state.feed().defaultViewId === this.state.selectedViews[0].id
        });

        return pivotBarActions;
    }

    private _getUpstreamSettingsActions(): IPivotBarAction[] {
        const isDeleteActionDisabled =
            !this.state.isUserAdmin() ||
            this.state.selectedUpstreamSources.length === 0 ||
            this.state.isSavingChanges === true;

        const isReorderingActionDisabled =
            !this.state.isUserAdmin() ||
            this.state.selectedUpstreamSources.length === 0 || // no row is selected
            this.state.selectedUpstreamSources.length !== 1 || // more than 1 row is selected
            this.state.isSavingChanges === true;

        let moveUpDisabled = isReorderingActionDisabled;
        let moveDownDisabled = isReorderingActionDisabled;
        let indexInGrid = -1;

        if (!isReorderingActionDisabled) {
            // list might be filtered, so instead of state.feed().upstreamSources use upstreamSourceRow
            indexInGrid = findIndex(
                this._upstreamProps.upstreamSourceRows,
                (upstreamSourceRow: IUpstreamSettingsRowData) => {
                    return upstreamSourceRow.upstreamSource.id === this.state.selectedUpstreamSources[0].id;
                }
            );
            moveUpDisabled = indexInGrid === 0;
            moveDownDisabled = indexInGrid === this._upstreamProps.upstreamSourceRows.length - 1;
        }

        const pivotBarActions: IPivotBarAction[] = [
            {
                key: SettingsPivotKeys.upstreams + "-addUpstreamSource",
                name: PackageResources.UpstreamSettings_AddUpstreamSourceButton_Label,
                important: true,
                iconProps: { iconName: "Add", iconType: VssIconType.fabric },
                onClick: (): void => {
                    FeedSettingsActionCreator.openAddUpstreamPanelRequested.invoke({});
                },
                disabled: !this.state.isUserAdmin() || this.state.isSavingChanges
            },
            {
                key: "views-upstreamsources",
                name: PackageResources.FeedSettings_UpstreamSources_DeleteButton_Label,
                important: true,
                iconProps: {
                    iconName: "Delete",
                    className: isDeleteActionDisabled ? "" : "delete-icon"
                },
                onClick: (): void => {
                    FeedSettingsActionCreator.showDeleteUpstreamSourcesDialog.invoke(null);
                },
                disabled: isDeleteActionDisabled
            },
            {
                key: "move-up",
                name: "Move up",
                important: true,
                iconProps: {
                    iconName: "SortUp"
                },
                onClick: (): void => {
                    // because list might be filtered, send item to swap with
                    // pass lower index item in from
                    FeedSettingsActionCreator.reorderUpstreamSources.invoke({
                        fromIndexOfUpstreamSource: this._upstreamProps.upstreamSourceRows[indexInGrid - 1]
                            .upstreamSource,
                        toIndexOfUpstreamSource: this.state.selectedUpstreamSources[0]
                    });
                    this.isMoveUpOrDown = true;
                },
                disabled: moveUpDisabled
            },
            {
                key: "move-down",
                name: "Move down",
                important: true,
                iconProps: {
                    iconName: "SortDown"
                },
                onClick: (): void => {
                    // because list might be filtered, send item to swap with
                    // pass lower index item in from
                    FeedSettingsActionCreator.reorderUpstreamSources.invoke({
                        fromIndexOfUpstreamSource: this.state.selectedUpstreamSources[0],
                        toIndexOfUpstreamSource: this._upstreamProps.upstreamSourceRows[indexInGrid + 1].upstreamSource
                    });
                    this.isMoveUpOrDown = true;
                },
                disabled: moveDownDisabled
            }
        ];

        return pivotBarActions;
    }

    /**
     * If there are changes, show discard dialog instead of navigating away
     */
    @autobind
    private onBreadcrumbClick(): void {
        const currentPivotHasChanges: boolean = this.pivotHasChanges(this.state.currentPivotKey);
        if (currentPivotHasChanges) {
            FeedSettingsActionCreator.showDiscardChangesDialog.invoke(null);
        } else {
            Actions.FeedBreadcrumbSelected.invoke(null);
        }
    }

    /**
     * Stay in current pivot if there are pending changes and show discard dialog
     * @param toPivotKey Pivot users wants to switch to
     */
    @autobind
    private onPivotChanging(toPivotKey: string): void {
        const currentPivotHasChanges: boolean = this.pivotHasChanges(this.state.currentPivotKey);
        if (currentPivotHasChanges) {
            this.state.hubViewState.selectedPivot.value = this.state.currentPivotKey;
            FeedSettingsActionCreator.showDiscardChangesDialog.invoke(null);
        }
    }

    /**
     * Store the new pivot user switched to
     * @param newPivotKey Pivot user switched to
     */
    @autobind
    private onPivotChanged(newPivotKey: string): void {
        FeedSettingsActionCreator.onPivotChanged.invoke(newPivotKey);
    }

    @autobind
    private onPermissionsFilterChanged(changedState: IFilterState): void {
        // trigger re-render
        this.setState({});

        CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.FilterChanged, { filter: "permissions" });
    }

    @autobind
    private onViewsFilterChanged(changedState: IFilterState): void {
        // trigger re-render
        this.setState({});

        CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.FilterChanged, { filter: "views" });
    }

    @autobind
    private onUpstreamSourceFilterChanged(changedState: IFilterState): void {
        // trigger re-render
        this.setState({});

        CustomerIntelligenceHelper.publishEvent(FeedSettingsCi.FilterChanged, { filter: "upstreamsources" });
    }

    @autobind
    private _onUnsavedChangesDialogDiscard(): void {
        FeedSettingsActionCreator.onDiscardChangesClicked.invoke(null);
    }

    @autobind
    private _onUnsavedChangesDialogSave(): void {
        switch (this.state.hubViewState.selectedPivot.value) {
            case SettingsPivotKeys.details:
                FeedSettingsActionCreator.saveFeedDetailsChanges.invoke(null);
                break;
        }
    }

    @autobind
    private _onDiscardDialogStayOnPage(): void {
        FeedSettingsActionCreator.onStayOnCurrentPivotClicked.invoke(null);
    }

    private _pivotUrls: { [pivotKey: string]: IObservableViewStateUrl };
    private _feedDetailsProps: IFeedDetailsPaneProps;
    private _permissionsProps: IPermissionsProps;
    private _viewsProps: IViewsProps;
    private _upstreamProps: IUpstreamSettingsPaneProps;
    private hub: IHub;
    // as of now, only doing this for Move up or Move down buttons in Upstream Sources pivot
    // not adding it to state because it will cause re-render
    private isMoveUpOrDown: boolean;
}
