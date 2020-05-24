import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import { Action } from "VSS/Flux/Action";
import { Component, Props } from "VSS/Flux/Component";
import * as NavigationService from "VSS/Navigation/Services";

import { IPivotBarAction } from "VSSUI/Components/PivotBar/PivotBarAction.Props";
import { FilterBar, IFilterBarProps } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub, IHub } from "VSSUI/Hub";
import { HubHeader, IHubBreadcrumbItem } from "VSSUI/HubHeader";
import { PickListFilterBarItem } from "VSSUI/PickList";
import { PivotBarItem } from "VSSUI/PivotBar";
import { Filter, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";

import { HistoryBehavior, IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

import * as Actions from "Package/Scripts/Actions/Actions";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { OpenConnectToFeedDialog } from "Package/Scripts/Components/ConnectToFeedButton";
import { CreateBadgePanel } from "Package/Scripts/Components/CreateBadgePanel";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import { PackageRetentionMessage } from "Package/Scripts/Components/PackageRetentionMessage";
import { PackageVersionDetails } from "Package/Scripts/Components/PackageVersionDetails";
import { PackageVersionsList } from "Package/Scripts/Components/PackageVersionsList";
import { PromoteDialog } from "Package/Scripts/Dialogs/PromoteDialog";
import * as CommandGetters from "Package/Scripts/Helpers/CommandGetters";
import * as PermissionHelper from "Package/Scripts/Helpers/PermissionHelper";
import { PermanentDeleteCommandHelper } from "Package/Scripts/Protocols/Common/PermanentDeleteCommandHelper";
import { RestorePackageCommandHelper } from "Package/Scripts/Protocols/Common/RestorePackageCommandHelper";
import { PackageState, PackageStore } from "Package/Scripts/Stores/PackageStore";
import { HubAction, IHubState } from "Package/Scripts/Types/IHubState";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { FeedRole, Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/ControllerViews/PackageControllerView";

import { PackageDetailsPivot, PackageFilterBarConstants } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export interface IPackageControllerViewProps extends Props {
    store: PackageStore;
    isRecycleBin: boolean;
    isPackageDependencySelected: boolean;
}

export class PackageControllerView extends Component<IPackageControllerViewProps, PackageState> {
    // This is approx 100px LESS than the min-width defined by the Main page container (1024px).
    // See Vssf/WebPlatform/Platform/Presentation/Styles/Layout/_Main.scss
    private static readonly MaxBreadcrumItemWidth = "900px";

    private _hubViewState: IVssHubViewState;
    private _hub: IHub;
    private _packageCommandsGetter: CommandGetters.PackageCommandsGetter = new CommandGetters.PackageCommandsGetter();
    private _pivotUrls: IDictionaryStringTo<IObservableViewStateUrl> = {};
    private _onFilterStateChangeHandler;
    private _viewFilterUpdated: boolean;

    constructor(props: IPackageControllerViewProps) {
        super(props);

        this._hubViewState = this.props.isRecycleBin
            ? new VssHubViewState({
                  pivotNavigationBehavior: HistoryBehavior.none,
                  defaultPivot: PackageDetailsPivot.VERSIONS
              })
            : this.props.isPackageDependencySelected
                ? new VssHubViewState({
                      pivotNavigationBehavior: HistoryBehavior.none,
                      defaultPivot: PackageDetailsPivot.OVERVIEW
                  })
                : new VssHubViewState({ defaultPivot: PackageDetailsPivot.OVERVIEW });

        [PackageDetailsPivot.OVERVIEW, PackageDetailsPivot.VERSIONS].forEach(pivotKey => {
            this._pivotUrls[pivotKey] = this._hubViewState.createObservableUrl({ view: pivotKey });
        });

        this._onFilterStateChangeHandler = this._onFilterStateChange.bind(this);
        this._viewFilterUpdated = false;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._hubViewState.filter.subscribe(this._onFilterStateChangeHandler, FILTER_CHANGE_EVENT);
    }

    public componentWillUnmount(): void {
        this._hubViewState.filter.unsubscribe(this._onFilterStateChangeHandler, FILTER_CHANGE_EVENT);
        super.componentWillUnmount();
    }

    public componentDidUpdate(): void {
        const filterState = this._hubViewState.filter.getState();
        // Remember the view filter that was selected in the package list and apply the same filter in the version list.
        // Only applied to the versions list after versions have been fetched and done only once.
        if (
            this.state.selectedFeed.view &&
            this._hubViewState.selectedPivot.value === PackageDetailsPivot.VERSIONS &&
            (filterState[PackageFilterBarConstants.ViewFilterKey] == null ||
                !filterState[PackageFilterBarConstants.ViewFilterKey].value) &&
            this.props.store._versionsFetched &&
            !this._viewFilterUpdated
        ) {
            const newState = {};
            newState[PackageFilterBarConstants.ViewFilterKey] = { value: ["@" + this.state.selectedFeed.view.name] };
            this._hubViewState.filter.setState(newState);
            this._viewFilterUpdated = true;
        }

        if (this.props.isPackageDependencySelected) {
            this._hubViewState.selectedPivot.value = PackageDetailsPivot.VERSIONS;
        }
    }

    public render(): JSX.Element {
        const { selectedFeed, selectedPackage, selectedVersion, selectedVersions, feedViews, isLoading } = this.state;
        // There is a period where we have switched to the package pane but we have not looked up the package by id yet.
        // Only display the package if we have a package to view.
        if (this._packageVersionIsAvailable(selectedPackage, selectedVersion) === false) {
            return null;
        }

        const filterState = this._hubViewState.filter.getState();
        const versions = this.props.isRecycleBin
            ? this.props.store.getRecycleBinPackageVersions()
            : this.props.store.getPackageVersions(filterState);

        const retentionVersionCount = this.getPackageVersionCount(this.state);
        const hideRetentionMessage = this.state.retentionMessageSuppressions.hasOwnProperty(selectedPackage.id);

        return (
            <div className={"package-controller-view"}>
                <h1 className="hidden-package-h1">{this.getHeadingName() /*hidden h1 for accessibility*/}</h1>
                {!hideRetentionMessage && (
                    <PackageRetentionMessage
                        feed={selectedFeed}
                        packageId={selectedPackage.id}
                        versionCount={retentionVersionCount}
                        ariaLabel={PackageResources.AriaLabel_MessageBar}
                    />
                )}

                <PackageMessagePanel message={this._getPackageMessagePanelMessage()} />
                <Hub
                    componentRef={hub => (this._hub = hub)}
                    hubViewState={this._hubViewState}
                    commands={this.getCommonCommands()}
                    onRenderFilterBar={this._getFilterBar}
                    pivotHeaderAriaLabel={PackageResources.PackagePivot_AriaLabel}
                >
                    <HubHeader
                        breadcrumbItems={this.getHeaderBreadcrumbItems()}
                        maxBreadcrumbItemWidth={PackageControllerView.MaxBreadcrumItemWidth}
                        hubBreadcrumbAriaLabel={PackageResources.PackageHub_BreadCrumb_AriaLabel}
                    />
                    {this.props.isRecycleBin === false && (
                        <PivotBarItem
                            className="detailsListPadding absolute-fill"
                            name={PackageResources.PackageVersionsPivotTabTitle_Overview}
                            itemKey={PackageDetailsPivot.OVERVIEW}
                            commands={this._getPackageCommands(false /*versions pivot*/)}
                            url={this._pivotUrls[PackageDetailsPivot.OVERVIEW]}
                        >
                            <LoadingContainer isLoading={isLoading}>
                                <PackageVersionDetails
                                    feed={selectedFeed}
                                    feedViews={feedViews}
                                    selectedPackage={selectedPackage}
                                    packageVersion={selectedVersion}
                                    protocolMap={this.state.protocolMap}
                                    packageFollowState={this.state.packageFollowState}
                                    isPackageModifiedLoading={this.state.isPackageModifiedLoading}
                                    packageMetrics={this.state.packageMetrics}
                                    isSmartDependenciesEnabled={this.state.smartDependenciesEnabled}
                                    isProvenanceEnabled={this.state.provenanceEnabled}
                                />
                            </LoadingContainer>
                        </PivotBarItem>
                    )}
                    <PivotBarItem
                        className="detailsListPadding absolute-fill"
                        name={PackageResources.PackageVersionsPivotTabTitle_Versions}
                        itemKey={PackageDetailsPivot.VERSIONS}
                        url={this._pivotUrls[PackageDetailsPivot.VERSIONS]}
                        commands={this._getPackageCommands(true /*versions pivot*/)}
                    >
                        <PackageVersionsList
                            selectedPackage={selectedPackage}
                            feed={selectedFeed}
                            selectedVersion={selectedVersion}
                            items={versions}
                            protocolMap={this.state.protocolMap}
                            displayVersionDetails={this._onDisplayVersionDetails}
                            selectedFeed={selectedFeed}
                            filterState={this._hubViewState.filter as Filter}
                            isRecycleBin={this.props.isRecycleBin}
                            actions={this._getActionsMap()}
                            clearSelection={!selectedVersions || selectedVersions.length === 0}
                            isLoading={
                                isLoading ||
                                (this.props.isRecycleBin === false && this.props.store._versionsFetched === false) ||
                                (this.props.isRecycleBin === true &&
                                    this.props.store._recycleBinVersionsFetched === false)
                            }
                        />
                    </PivotBarItem>
                </Hub>
                {this.state.showCreateBadgePanel && (
                    <CreateBadgePanel feed={selectedFeed} selectedPackage={selectedPackage} views={feedViews} />
                )}
                {this.state.showPromoteDialog && (
                    <PromoteDialog
                        feed={selectedFeed}
                        selectedPackage={selectedPackage}
                        selectedVersion={
                            selectedVersions && selectedVersions.length === 1 /*Currently only for single promote*/
                                ? selectedVersions[0]
                                : selectedVersion
                        }
                        views={feedViews}
                        isLoading={isLoading}
                    />
                )}
            </div>
        );
    }

    private get packageProtocol() {
        return this.state.protocolMap[this.state.selectedPackage.protocolType];
    }

    private getPackageVersionCount(state: Readonly<PackageState>): number {
        if (this.props.isRecycleBin) {
            return 0;
        }

        const pkgVersions =
            state.selectedPackage && state.selectedPackage.versions
                ? state.selectedPackage.versions.filter(v => !v.isDeleted).length
                : 0;
        const versions =
            state.selectedVersion && state.selectedVersion.otherVersions
                ? state.selectedVersion.otherVersions.filter(v => !v.isDeleted).length
                : 0;

        return Math.max(pkgVersions, versions);
    }

    private _getActionsMap(): { [key: string]: Action<{}> } {
        if (this.props.isRecycleBin === true) {
            return {
                VersionsPivotSelected: RecycleBinActions.VersionsPivotSelected
            };
        }

        return {
            PackageVersionSelected: Actions.PackageVersionSelected,
            VersionsPivotSelected: Actions.VersionsPivotSelected
        };
    }

    private _getPackageMessagePanelMessage(): string {
        if (this.props.isRecycleBin === true) {
            return "";
        }

        return this.packageProtocol.getPackageMessage(this.state.selectedPackage, this.state.selectedVersion);
    }

    private _onFilterStateChange(): void {
        Actions.PackageVersionsFiltersChanged.invoke(this._hubViewState.filter.getState());
    }

    @autobind
    private _getFilterBar(): React.ReactElement<IFilterBarProps> {
        if (this.props.isRecycleBin === true) {
            return null;
        }

        if (this._hubViewState.selectedPivot.value === PackageDetailsPivot.VERSIONS) {
            // tslint:disable-next-line:no-bitwise
            const supportsPromote = (this.packageProtocol.supportedCommandsMask & ProtocolCommands.Promote) !== 0;

            return (
                <FilterBar filter={this._hubViewState.filter} className="package-filter-bar">
                    <KeywordFilterBarItem
                        key={PackageFilterBarConstants.KeywordFilterKey}
                        filterItemKey={PackageFilterBarConstants.KeywordFilterKey}
                        placeholder={PackageResources.VersionList_FilterPlaceHolder}
                    />
                    {supportsPromote && (
                        <PickListFilterBarItem
                            filterItemKey={PackageFilterBarConstants.ViewFilterKey}
                            placeholder={PackageResources.FeedViewDropdown_Title}
                            className="view-dropdown"
                            getPickListItems={() => this.state.feedViews.map(view => "@" + view.name)}
                        />
                    )}
                </FilterBar>
            );
        }

        return null;
    }

    private _packageVersionIsAvailable(pkg: Package, version: PackageVersion): boolean {
        if (pkg && version) {
            const urlState: IHubState = NavigationService.getHistoryService().getCurrentState();
            return urlState.package === pkg.name;
        }

        return false;
    }

    // TODO: See if we can rework the navigation changes to avoid having to explicitly update the selected pivot
    @autobind
    private _onDisplayVersionDetails(isChangingVersion: boolean): void {
        const behavior = isChangingVersion ? HistoryBehavior.replace : HistoryBehavior.newEntry;
        this._hubViewState.updateNavigationState(behavior, () => {
            this._hubViewState.selectedPivot.value = null;
        });
    }

    public getStore() {
        return this.props.store;
    }

    public getState() {
        return this.getStore().getPackageState();
    }

    private _getPackageCommands(versionsPivot?: boolean): IPivotBarAction[] {
        const { selectedFeed, selectedPackage, selectedVersion, selectedVersions, protocolMap } = this.state;

        const packageProtocol = protocolMap[selectedPackage.protocolType];
        let packageCommands: IPackageCommand[] = [];

        if (this.props.isRecycleBin === true) {
            return this.getRecycleBinCommands();
        }

        if (versionsPivot) {
            if (!selectedVersions || selectedVersions.length === 0) {
                return [];
            } else if (selectedVersions.length === 1) {
                packageCommands = this._packageCommandsGetter.getSingleSelectionItems(
                    selectedFeed,
                    packageProtocol,
                    selectedPackage,
                    selectedVersions[0],
                    false /*viaPackageList*/
                );
            } else {
                packageCommands = protocolMap[selectedPackage.protocolType].getMultiSelectPackageCommands(
                    selectedFeed,
                    null,
                    selectedVersions
                );
            }
        } else {
            packageCommands = this._packageCommandsGetter.getSingleSelectionItems(
                selectedFeed,
                packageProtocol,
                selectedPackage,
                selectedVersion,
                /*viaPackageList*/ false
            );
            packageCommands.push(this._packageCommandsGetter.getFollowItem(this.state.packageFollowState));
        }

        return this.toPivotBarActions(packageCommands);
    }

    private toPivotBarActions(packageCommands: IPackageCommand[]): IPivotBarAction[] {
        let actions = null;
        if (packageCommands && packageCommands.length > 0) {
            actions = packageCommands.map(cmd => {
                return {
                    key: cmd.id,
                    important: true, // whilst important, it doesn't guarantee that the commands won't be moved to the overflow menu
                    name: cmd.displayText,
                    title: cmd.titleText,
                    iconProps: { iconName: cmd.icon } as IVssIconProps,
                    onClick: () => {
                        cmd.actionMethod.apply(this);
                    }
                } as IPivotBarAction;
            });
        }

        return actions;
    }

    private getCommonCommands(): IPivotBarAction[] {
        if (this.props.isRecycleBin === true) {
            return [];
        }

        const connectToFeedCommand = {
            key: "connect",
            name: PackageResources.ConnectToFeedButtonText,
            important: true,
            iconProps: { iconName: "plug-outline", iconType: VssIconType.bowtie },
            onClick: (ev, action) => {
                this._showConnectToFeedDialog();
            }
        } as IPivotBarAction;

        return [connectToFeedCommand];
    }

    private getRecycleBinCommands(): IPivotBarAction[] {
        const state = this.state;

        if (!state.selectedVersions) {
            return [];
        }

        let packageCommands: IPackageCommand[] = [];

        const role: FeedRole = PermissionHelper.getUsersRoleForFromFeed(state.selectedFeed);

        if (!PermissionHelper.isAdministratorFromRole(role)) {
            return this.toPivotBarActions([]);
        }

        const restoreToFeedCommands = RestorePackageCommandHelper.getCommands(
            state.selectedPackage.protocolType,
            state.selectedPackage,
            state.selectedVersions,
            state.selectedPackage.name
        );
        packageCommands = packageCommands.concat(restoreToFeedCommands);

        const permanentDeleteCommands = PermanentDeleteCommandHelper.getCommands(
            state.selectedPackage.protocolType,
            null,
            state.selectedVersions,
            state.selectedPackage.name
        );
        packageCommands = packageCommands.concat(permanentDeleteCommands);

        return this.toPivotBarActions(packageCommands);
    }

    private _showConnectToFeedDialog(): void {
        const state = this.state;
        const selectedPackage = state.selectedPackage;
        const protocolKey = selectedPackage.protocolType;
        const currentProtocolMap = {
            [protocolKey]: state.protocolMap[selectedPackage.protocolType]
        };
        OpenConnectToFeedDialog(state.selectedFeed, state.feedViews, currentProtocolMap, HubAction.Feed);
    }

    private getHeaderBreadcrumbItems(): IHubBreadcrumbItem[] {
        const state = this.state;
        const items: IHubBreadcrumbItem[] = [];

        if (state.selectedFeed) {
            items.push({
                key: "feed",
                text: state.selectedFeed.name,
                onClick: () => Actions.FeedBreadcrumbSelected.invoke(state.selectedPackage)
            });
        }

        if (this.props.isRecycleBin) {
            items.push({
                key: "recycleBin",
                text: PackageResources.RecycleBin_Breadcrumb,
                onClick: () => RecycleBinActions.RecycleBinBreadCrumbClicked.invoke({})
            });
        }

        if (state.selectedPackage && state.selectedVersion) {
            const breadCrumbPackageText = this.getHeadingName();

            items.push({
                key: "package",
                text: breadCrumbPackageText,
                leftIconProps: this.getIconProps(state.selectedPackage.protocolType)
            });
        }

        return items;
    }

    private getHeadingName(): string {
        return this.props.isRecycleBin
            ? `${this.state.selectedPackage.name}`
            : `${this.state.selectedPackage.name} ${this.state.selectedVersion.version}`;
    }

    private getIconProps(protocolType: string): IVssIconProps {
        let iconProps: IVssIconProps = null;
        const packageProtocol = this.state.protocolMap[protocolType];
        if (packageProtocol) {
            iconProps = packageProtocol.vssIconProps;
        }

        return iconProps;
    }
}
