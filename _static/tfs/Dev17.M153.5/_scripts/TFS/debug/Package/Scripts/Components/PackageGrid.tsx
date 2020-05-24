import * as React from "react";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { IObjectWithKey, Selection, SelectionMode } from "OfficeFabric/Selection";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import { VssDetailsList, VssDetailsListRowStyle } from "VSSUI/VssDetailsList";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IPackageSelectionChangedPayload } from "Package/Scripts/Common/ActionPayloads";
import * as ContextMenuNavigationCommands from "Package/Scripts/Common/ContextMenuNavigationCommands";
import { DescriptionGridCell } from "Package/Scripts/Components/DescriptionGridCell";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { NoResultsPane } from "Package/Scripts/Components/NoResultsPane";
import { PackageNameGridCell } from "Package/Scripts/Components/PackageNameGridCell";
import { PackageUpstreamSource } from "Package/Scripts/Components/PackageUpstreamSource";
import { ViewsGridCell } from "Package/Scripts/Components/ViewsGridCell";
import * as CommandGetters from "Package/Scripts/Helpers/CommandGetters";
import * as PackageCommandMenuItem from "Package/Scripts/Helpers/PackageCommandToContextMenuItem";
import { getPackageDetailsPageUrl } from "Package/Scripts/Helpers/UrlHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { IvyKey } from "Package/Scripts/Protocols/Constants/Constants";
import { MavenKey } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, MetricType, Package, PackageMetrics, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageGrid";

import * as PackageResources from "Feed/Common/Resources";
import { MessageState } from "Feed/Common/Types/IFeedMessage";

export interface IPackageGridProps extends Props {
    feed: Feed;
    packages: Package[];
    pageSize: number;
    requestedPackageCount: number;
    nextPageLoading: boolean;
    filterLoading: boolean;
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    upstreamSourceEnabled: boolean;
    messageState: MessageState;
    isMultiPromotePanelOpen: boolean;
    feedViews: FeedView[];
    selectedPackages: Package[];
    metricsEnabled: boolean;
    metricsMap: IDictionaryStringTo<IDictionaryStringTo<PackageMetrics>>;
}

export class PackageGrid extends Component<IPackageGridProps, State> {
    private _selection: Selection;

    constructor(props: IPackageGridProps) {
        super(props);

        this._selection = new Selection({
            canSelectItem: (item: IObjectWithKey): boolean => {
                const row: Package = item as Package;
                if (row && row.versions[0].isDeleted !== true) {
                    return true;
                }
                return false;
            },
            getKey: (item: IObjectWithKey, index: number): string => {
                return this._getPackageSelectionId(item as Package);
            },
            onSelectionChanged: (): void => {
                this._onSelectionChangedCallback();
            }
        });
    }

    public render(): JSX.Element {
        return (
            <div className="package-grid">
                {this.props.packages && this.props.packages.length > 0 ? (
                    <div>
                        <LoadingContainer isLoading={this.props.filterLoading}>
                            <VssDetailsList
                                setKey={this.props.feed.id}
                                className="package-details-list"
                                actionsColumnKey="name"
                                rowStyle={VssDetailsListRowStyle.twoLine}
                                allocateSpaceForActionsButtonWhileHidden={false}
                                getMenuItems={this._getContextMenuItems}
                                shouldDisplayActions={this._shouldDisplayCommands}
                                ariaLabel={PackageResources.PackageListAriaLabel}
                                ariaLabelForGrid={PackageResources.PackageGridAriaLabel}
                                ariaLabelForListHeader={PackageResources.PackageHeadersAriaLabel}
                                ariaLabelForSelectionColumn={PackageResources.DetailsList_SelectionColumn_AriaLabel}
                                ariaLabelForSelectAllCheckbox={PackageResources.DetailsList_SelectAll_AriaLabel}
                                getRowAriaLabel={this._getRowAriaLabel}
                                items={this.props.packages}
                                columns={this._getColumns()}
                                constrainMode={ConstrainMode.unconstrained}
                                selectionMode={
                                    !this.props.selectedPackages.some(
                                        (pkg: Package) =>
                                            pkg.protocolType.toLowerCase() === MavenKey ||
                                            pkg.protocolType.toLowerCase() === IvyKey
                                    )
                                        ? SelectionMode.multiple
                                        : SelectionMode.single
                                }
                                selection={this._selection}
                                checkboxVisibility={CheckboxVisibility.onHover}
                                layoutMode={DetailsListLayoutMode.justified}
                                onRenderItemColumn={this._renderItemColumn}
                                onRowDidMount={this._loadNextPage}
                                selectionPreservedOnEmptyClick={true}
                            />
                        </LoadingContainer>
                        <div className="loading-placeholder">{this.props.nextPageLoading ? <Spinner /> : null}</div>
                    </div>
                ) : (
                    this._getNoPackagesMessage()
                )}
            </div>
        );
    }

    private _getPackageSelectionId(pkg: Package): string {
        return pkg ? pkg.id : undefined;
    }

    @autobind
    private _getRowAriaLabel(item: Package): string {
        return item && item.versions ? item.name + " " + item.versions[0].version : null;
    }

    /* DetailsList helper methods */
    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];
        columns = [
            {
                key: "name",
                fieldName: "name",
                name: PackageResources.PackageNameColumn,
                minWidth: 200,
                maxWidth: 450,
                isResizable: true,
                className: "package-name-cell package-grid-cell",
                headerClassName: "package-name-header package-header",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: Package, index: number, column: IColumn) => {
                    const protocol: IPackageProtocol = this.props.protocolMap[item.protocolType];
                    return (
                        <PackageNameGridCell
                            feedName={this.props.feed.name}
                            pkg={item}
                            protocol={protocol}
                            actions={{ PackageSelected: Actions.PackageSelected }}
                            packageHref={getPackageDetailsPageUrl(this.props.feed.name, item, item.versions[0].version)}
                        />
                    );
                }
            } as IColumn
        ];

        columns.push({
            key: "views",
            fieldName: "views",
            name: PackageResources.ReleaseViewsColumn,
            minWidth: 185,
            maxWidth: 185,
            isResizable: true,
            headerClassName: "package-views-header package-header",
            className: "package-views-cell package-grid-cell",
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item: Package, index: number, column: IColumn) => {
                return <ViewsGridCell packageVersion={item.versions[0]} />;
            }
        } as IColumn);

        if (this.props.upstreamSourceEnabled) {
            columns.push({
                key: "source",
                fieldName: "source",
                name: PackageResources.UpstreamSourceColumn,
                minWidth: 100,
                maxWidth: 150,
                isResizable: true,
                className: "package-source-cell package-grid-cell",
                columnActionsMode: ColumnActionsMode.disabled,
                headerClassName: "package-header",
                onRender: (pkg: Package, index: number, column: IColumn): JSX.Element => {
                    return (
                        <PackageUpstreamSource
                            packageSummary={pkg}
                            packageVersion={pkg.versions[0]}
                            upstreamSources={this.props.feed.upstreamSources}
                        />
                    );
                }
            } as IColumn);
        }

        columns.push({
            key: "lastpushed",
            fieldName: "lastpushed",
            name: PackageResources.LastPushedColumn,
            minWidth: 100,
            maxWidth: 130,
            isResizable: true,
            isSorted: false,
            headerClassName: "package-header",
            className: "package-pushed-cell package-grid-cell",
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item: Package, index: number, column: IColumn) => {
                const publishedDate = new Date(item.versions[0].publishDate.toString());
                const lastPushedDate = Utils_Date.ago(publishedDate);
                return <span>{lastPushedDate} </span>;
            },
            onColumnClick: (ev?: React.MouseEvent<HTMLElement>, column?: IColumn) => {
                // placeholder when sorting is implemented
                return;
            }
        } as IColumn);

        columns.push({
            key: "description",
            fieldName: "description",
            name: PackageResources.DescriptionColumn,
            minWidth: 200,
            maxWidth: 500,
            isResizable: true,
            className: "package-description-cell package-grid-cell",
            headerClassName: "package-header",
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item: Package, index: number, column: IColumn) => {
                return <DescriptionGridCell item={item} />;
            }
        } as IColumn);

        /*
         * Commenting out the metric columns 
         * so that the metric feature flag can be turned on on package details UI.
         * These columns can be shown when the metrics feature has been finalized.
         * 
        if (this.props.metricsEnabled) {
            columns.push({
                key: "downloads",
                fieldName: "downloads",
                name: PackageResources.PackageGrid_DownloadsColumn,
                minWidth: 80,
                maxWidth: 110,
                isResizable: true,
                className: "package-downloads-cell package-grid-cell",
                headerClassName: "package-header",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: Package, index: number, column: IColumn) => {
                    return this.getPackageAggregatedMetricDiv(item, MetricType.TotalDownloads);
                }
            } as IColumn);

            columns.push({
                key: "users",
                fieldName: "users",
                name: PackageResources.PackageGrid_UsersColumn,
                minWidth: 80,
                maxWidth: 110,
                isResizable: true,
                className: "package-users-cell package-grid-cell",
                headerClassName: "package-header",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: Package, index: number, column: IColumn) => {
                    return this.getPackageAggregatedMetricDiv(item, MetricType.UniqueUsers);
                }
            } as IColumn);
        }
        */

        return columns;
    }

    @autobind
    private getPackageAggregatedMetricDiv(pkg: Package, metricType: MetricType): JSX.Element {
        // If there is no mapping for a package ID, we haven't gotten back the results
        // If the metrics for a package version is undefined, we also haven't gotten back the results
        // When the results are back the mapping for a package ID is defined, and for the package version
        // it either has a value or it is null
        if (!this.props.metricsMap[pkg.id] || this.props.metricsMap[pkg.id][pkg.versions[0].id] === undefined) {
            return <div />;
        }

        const metrics = this.props.metricsMap[pkg.id][pkg.versions[0].id];
        const metricValue = this.getAggregatedMetricValue(metrics, metricType);
        return this.getAggregatedMetricDiv(
            Utils_Number.formatAbbreviatedNumber(metricValue),
            this.getAggregatedMetricIcon(metricType)
        );
    }

    private getAggregatedMetricValue(metrics: PackageMetrics, metricType: MetricType): number {
        if (!metrics) {
            return 0;
        }

        const metric = metrics.aggregatedMetrics.find(x => x.metricType === metricType);

        if (!metric) {
            return 0;
        }

        return metric.value;
    }

    private getAggregatedMetricDiv(text: string, icon: string, className?: string): JSX.Element {
        return (
            <div className={className}>
                <span className={"aggregated-metric-icon " + icon} />
                <div className="aggregated-metric-text">{text}</div>
            </div>
        );
    }

    private getAggregatedMetricIcon(metricType: MetricType): string {
        switch (metricType) {
            case MetricType.TotalDownloads:
                return "bowtie-icon bowtie-transfer-download";
            case MetricType.UniqueUsers:
                return "bowtie-icon bowtie-users";
            default:
                return "";
        }
    }

    @autobind
    private _renderItemColumn(item: Package, index: number, column: IColumn): any {
        return column.onRender;
    }

    @autobind
    private _loadNextPage(item: Package, index: number): void {
        const rowNumber = index + 1;
        const isLastRow = rowNumber === this.props.requestedPackageCount;
        if (isLastRow) {
            Actions.NextPackagePageRequested.invoke({});
        }
    }

    @autobind
    private _shouldDisplayCommands(item: Package): boolean {
        if (item.versions[0].isDeleted) {
            return false;
        }

        if (this._selection.count === 0) {
            return true;
        }

        const commands: IContextualMenuItem[] = this._getPackageCommands(item);
        return commands.length > 0;
    }

    @autobind
    private _getContextMenuItems(item: Package): IContextualMenuItem[] {
        // reset selection if context menu if invoked on package that is not selected
        const selectionKey: string = this._getPackageSelectionId(item);
        if (this._selection.getSelectedCount() > 0 && !this._selection.isKeySelected(selectionKey)) {
            Actions.PackageSelectionChangedInPackageGrid.invoke({ selectedPackages: [] });
        }

        return this._getPackageCommands(item);
    }

    private _getPackageCommands(item: Package): IContextualMenuItem[] {
        let commands: IPackageCommand[] = [];
        let contextMenuItems: IContextualMenuItem[] = [];
        const packageCommandsGetter: CommandGetters.PackageCommandsGetter = new CommandGetters.PackageCommandsGetter();
        const contextItemsGetter: PackageCommandMenuItem.ContextualMenuItemsGetter = new PackageCommandMenuItem.ContextualMenuItemsGetter();
        let versionString: string;

        // if multiple packages were selected, determine if a selected package was clicked
        if (this._selection.getSelectedCount() > 1 && this._selection.isKeySelected(item.id)) {
            commands = packageCommandsGetter.getMultipleSelectionItems(
                this.props.feed,
                this.props.protocolMap,
                this._selection.getSelection() as Package[]
            );
        } else {
            const feedName = this.props.feed.view
                ? this.props.feed.name + "@" + this.props.feed.view.name
                : this.props.feed.name;
            contextMenuItems = ContextMenuNavigationCommands.getNavigationCommands(feedName, item, {
                PackageSelected: Actions.PackageSelected
            });
            commands = packageCommandsGetter.getSingleSelectionItems(
                this.props.feed,
                this.props.protocolMap[item.protocolType],
                item,
                item.versions[0] as PackageVersion,
                true
            );
            versionString = item.versions[0].version;
        }

        const protocolContextMenuItems = contextItemsGetter.GetContextMenuItems(commands, versionString);
        contextMenuItems.push(...protocolContextMenuItems);

        return contextMenuItems;
    }

    private _getNoPackagesMessage(): React.ReactNode {
        switch (this.props.messageState) {
            case MessageState.EmptyView:
                return (
                    <NoResultsPane
                        header={PackageResources.ReleaseViewsHeader}
                        subheader={PackageResources.ReleaseViewsSubHeader}
                        link={PackageResources.ReleaseViewsLearnMoreLink}
                        linkText={PackageResources.ReleaseViewsLearnMoreLinkText}
                        iconClass={"bowtie-arrow-up"}
                    />
                );
            case MessageState.EmptyCache:
                return (
                    <NoResultsPane
                        header={PackageResources.UpstreamCacheHeader}
                        subheader={PackageResources.UpstreamCacheSubheader}
                        link={PackageResources.UpstreamCacheLearnMoreLink}
                        linkText={PackageResources.UpstreamCacheLearnMoreLinkText}
                        iconClass={"bowtie-cloud-fill"}
                    />
                );
            case MessageState.EmptyFilter:
                return (
                    <NoResultsPane
                        header={PackageResources.PackageGrid_NoPackagesMessage}
                        subheader={Utils_String.empty}
                        link={Utils_String.empty}
                        linkText={Utils_String.empty}
                        iconClass={"bowtie-search"}
                    />
                );
            default:
                return null;
        }
    }

    private _onSelectionChangedCallback(): void {
        const selectedPackages: Package[] = this._selection.getSelection() as Package[];
        const selectionChangedPayload: IPackageSelectionChangedPayload = {
            selectedPackages
        } as IPackageSelectionChangedPayload;

        Actions.PackageSelectionChangedInPackageGrid.invoke(selectionChangedPayload);
    }
}
