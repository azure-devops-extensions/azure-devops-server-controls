import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind, css } from "OfficeFabric/Utilities";

import * as Context from "VSS/Context";
import { Component, Props } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { Hub } from "VSSUI/Components/Hub/Hub";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { FILTER_CHANGE_EVENT, IFilter, IFilterState } from "VSSUI/Utilities/Filter";
import { VssDetailsList, VssDetailsListRowStyle } from "VSSUI/VssDetailsList";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";

import * as Actions from "Package/Scripts/Actions/Actions";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { DescriptionGridCell } from "Package/Scripts/Components/DescriptionGridCell";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { NoResultsPane } from "Package/Scripts/Components/NoResultsPane";
import { PackageNameGridCell } from "Package/Scripts/Components/PackageNameGridCell";
import { HubViewDefaultPivots, PackageCommandIds, RecycleBinFilterBarConstants } from "Feed/Common/Constants/Constants";
import { PackageGridMessages } from "Package/Scripts/Helpers/PackageGridMessages";
import * as RecycleBinDisplayProps from "Package/Scripts/Helpers/RecycleBinDisplayProps";
import { getPackageDetailsPageUrl } from "Package/Scripts/Helpers/UrlHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { FeedState, FeedStore } from "Package/Scripts/Stores/FeedStore";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/ControllerViews/RecycleBinControllerView";

import * as PackageResources from "Feed/Common/Resources";
import { MessageState } from "Feed/Common/Types/IFeedMessage";

export interface IRecycleBinControllerViewProps extends Props {
    store: FeedStore;
}

export class RecycleBinControllerView extends Component<IRecycleBinControllerViewProps, FeedState> {
    private _filter: IFilter;
    private _isOnPrem: boolean;

    constructor(props: IRecycleBinControllerViewProps) {
        super(props);
        this._filter = this.state.recycleBinState.hubViewState.filter;

        const ctx = Context.getPageContext();
        this._isOnPrem = true !== ctx.webAccessConfiguration.isHosted;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._filter.subscribe(this._onFilterStateChangeHandler, FILTER_CHANGE_EVENT);
    }

    public componentWillUnmount(): void {
        this._filter.unsubscribe(this._onFilterStateChangeHandler, FILTER_CHANGE_EVENT);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        const packagesToDisplay: Package[] = RecycleBinDisplayProps.getAllNonDeletedPackageVersions(
            this.state.recycleBinState.recycleBinPackages
        );

        return (
            <div className="recycle-bin-controller-view">
                {
                    <Hub
                        hubViewState={this.state.recycleBinState.hubViewState}
                        hideFullScreenToggle={true}
                        commands={this._getMainCommands(packagesToDisplay)}
                    >
                        <HubHeader breadcrumbItems={this._getHeaderBreadcrumbItems()} />
                        <FilterBar>
                            <KeywordFilterBarItem filterItemKey={RecycleBinFilterBarConstants.KeywordFilterKey} />
                        </FilterBar>
                        <PivotBarItem
                            className="detailsListPadding absolute-fill"
                            itemKey={HubViewDefaultPivots.recycleBin}
                            name="" // this is the only pivot, so it won't be displayed.
                            commands={[]}
                        >
                            <LoadingContainer isLoading={this.state.packagesLoading}>
                                {packagesToDisplay && packagesToDisplay.length > 0 ? (
                                    <div aria-label={PackageResources.AriaLabel_PackageList}>
                                        <VssDetailsList
                                            actionsColumnKey="name"
                                            rowStyle={VssDetailsListRowStyle.twoLine}
                                            allocateSpaceForActionsButtonWhileHidden={false}
                                            getMenuItems={this._getContextMenuCommands}
                                            shouldDisplayActions={this._shouldDisplayContextMenuCommands}
                                            ariaLabel={PackageResources.PackageListAriaLabel}
                                            ariaLabelForGrid={PackageResources.PackageGridAriaLabel}
                                            ariaLabelForListHeader={PackageResources.PackageHeadersAriaLabel}
                                            ariaLabelForSelectionColumn={PackageResources.DetailsList_SelectionColumn_AriaLabel}
                                            ariaLabelForSelectAllCheckbox={PackageResources.DetailsList_SelectAll_AriaLabel}
                                            getRowAriaLabel={this._getRowAriaLabel}
                                            items={packagesToDisplay}
                                            columns={this._getGridColumns()}
                                            constrainMode={ConstrainMode.unconstrained}
                                            checkboxVisibility={CheckboxVisibility.hidden}
                                            layoutMode={DetailsListLayoutMode.justified}
                                            onRowDidMount={this._loadNextPage}
                                        />
                                        <div>{this.state.nextPageLoading ? <Spinner /> : null}</div>
                                    </div>
                                ) : (
                                    this._getNoPackagesMessage()
                                )}
                            </LoadingContainer>
                        </PivotBarItem>
                        {
                            <Dialog
                                hidden={this.state.recycleBinState.dialogOpen === false}
                                onDismiss={this.closeDialog}
                                dialogContentProps={{
                                    type: DialogType.normal,
                                    title: PackageResources.EmptyRecycleBinDialog_HeaderText
                                }}
                                modalProps={{
                                    isBlocking: true,
                                    className: "empty-recycle-bin-dialog"
                                }}
                            >
                                <div>{PackageResources.EmptyRecycleBinDialog_ConfirmText}</div>
                                <br />
                                <br />
                                <div>{this._getFooterText()}</div>
                                <DialogFooter>
                                    <PrimaryButton
                                        className={css("save-button", "delete-button")}
                                        onClick={this.emptyRecycleBin}
                                        disabled={this.state.recycleBinState.dialogProcessing}
                                    >
                                        <div>
                                            {this.state.recycleBinState.dialogProcessing && (
                                                <span className="bowtie-icon bowtie-spinner" />
                                            )}
                                            <span>
                                                {this.state.recycleBinState.dialogProcessing
                                                    ? PackageResources.EmptyingRecycleBinButtonText
                                                    : PackageResources.EmptyRecycleBinButtonText}
                                            </span>
                                        </div>
                                    </PrimaryButton>
                                    <DefaultButton
                                        text={PackageResources.Dialog_CancelButtonText}
                                        onClick={this.closeDialog}
                                        disabled={this.state.recycleBinState.dialogProcessing}
                                    />
                                </DialogFooter>
                            </Dialog>
                        }
                    </Hub>
                }
            </div>
        );
    }

    @autobind
    private closeDialog(): void {
        RecycleBinActions.EmptyDialogClosed.invoke({});
    }

    @autobind
    private emptyRecycleBin(): void {
        RecycleBinActions.EmptyRecycleBin.invoke({});
    }

    private _getFooterText(): string {
        if (this.state.recycleBinState.dialogProcessing) {
            return PackageResources.TakeAWhile;
        } else if (this._isOnPrem) {
            return PackageResources.OnPremDeleteDelayWarning;
        }

        return "";
    }

    private _getHeaderBreadcrumbItems(): IHubBreadcrumbItem[] {
        const state = this.state;
        const items: IHubBreadcrumbItem[] = [];

        if (state.selectedFeed) {
            items.push({
                key: "feed",
                text: state.selectedFeed.name,
                onClick: () => Actions.FeedBreadcrumbSelected.invoke(null)
            });

            items.push({
                key: "recycleBin",
                text: PackageResources.RecycleBin_Breadcrumb
            });
        }

        return items;
    }

    private _getMainCommands(packagesToDisplay: Package[]): IPivotBarAction[] {
        const recycleBinAction: IPivotBarAction = {
            key: PackageCommandIds.EmptyRecycleBin,
            name: PackageResources.EmptyRecycleBinButtonText,
            important: true,
            iconProps: {
                iconType: VssIconType.bowtie,
                iconName: "bowtie-recycle-bin"
            } as IVssIconProps,
            onClick: () => RecycleBinActions.EmptyDialogOpened.invoke({}),
            disabled: packagesToDisplay.length < 1
        } as IPivotBarAction;

        return [recycleBinAction];
    }

    private _getGridColumns(): IColumn[] {
        return [
            {
                key: "name",
                fieldName: "name",
                name: PackageResources.PackageNameColumn,
                minWidth: 200,
                maxWidth: 450,
                isResizable: true,
                headerClassName: "package-name-header package-header",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: Package, index: number, column: IColumn) => {
                    const protocol: IPackageProtocol = this.state.protocolMap[item.protocolType];
                    return (
                        <PackageNameGridCell
                            feedName={this.state.selectedFeed.name}
                            pkg={item}
                            protocol={protocol}
                            actions={{ PackageSelected: RecycleBinActions.PackageSelected }}
                            packageHref={getPackageDetailsPageUrl(
                                this.state.selectedFeed.name,
                                item,
                                item.versions[0].version,
                                true
                            )}
                            isRecycleBin={true}
                        />
                    );
                }
            } as IColumn,
            {
                key: "description",
                fieldName: "description",
                name: PackageResources.DescriptionColumn,
                minWidth: 200,
                maxWidth: 500,
                isResizable: true,
                headerClassName: "package-header",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: Package, index: number, column: IColumn) => {
                    return <DescriptionGridCell item={item} />;
                }
            } as IColumn
        ];
    }

    @autobind
    private _onFilterStateChangeHandler(filterState: IFilterState, action: string): void {
        const packageFilterNameValue = this._filter.getFilterItemValue<string>(
            RecycleBinFilterBarConstants.KeywordFilterKey
        );

        RecycleBinActions.FilterPackages.invoke(packageFilterNameValue);
    }

    @autobind
    private _shouldDisplayContextMenuCommands(item: Package): boolean {
        return false;
    }

    @autobind
    private _getContextMenuCommands(item: Package): IContextualMenuItem[] {
        return [];
    }

    @autobind
    private _getRowAriaLabel(item: Package): string {
        return item && item.versions && item.versions.length > 0 ? item.name + " " + item.versions[0].version : null;
    }

    @autobind
    private _loadNextPage(item: Package, index: number): void {
        const rowNumber = index + 1;
        const isLastRow = rowNumber === this.state.recycleBinState.recycleBinPackages.length;
        const onPageBoundary = rowNumber % this.state.pageSize === 0;

        if (isLastRow && onPageBoundary) {
            RecycleBinActions.NextPackagePageRequested.invoke({});
        }
    }

    private _getNoPackagesMessage(): React.ReactNode {
        const filterText = this._filter.getFilterItemValue<string>(RecycleBinFilterBarConstants.KeywordFilterKey);
        const messageState = PackageGridMessages.getMessageForRecyclebin(
            this.state.selectedFeed,
            this.state.recycleBinState.recycleBinPackages,
            filterText
        );
        if (messageState === MessageState.EmptyFilter) {
            return (
                <NoResultsPane
                    header={PackageResources.PackageGrid_NoPackagesMessage}
                    subheader={Utils_String.empty}
                    link={Utils_String.empty}
                    linkText={Utils_String.empty}
                    iconClass={"bowtie-search"}
                />
            );
        }

        return (
            <NoResultsPane
                header={PackageResources.RecycleBin_NoPackagesHeader}
                subheader={PackageResources.RecycleBin_NoPackagesSubheader}
                link={Utils_String.empty}
                linkText={Utils_String.empty}
                iconClass={"bowtie-recycle"}
            />
        );
    }

    public getStore(): FeedStore {
        return this.props.store;
    }

    public getState(): FeedState {
        return this.getStore().getFeedState();
    }
}
