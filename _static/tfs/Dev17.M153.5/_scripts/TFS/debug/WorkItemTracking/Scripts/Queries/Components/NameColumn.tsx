import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { getId as getTooltipId } from "OfficeFabric/Utilities";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import * as Telemetry from "VSS/Telemetry/Services";
import { format } from "VSS/Utils/String";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { EmptyQueryItem } from "WorkItemTracking/Scripts/Queries/Components/EmptyQueryItem";
import { FavoriteStar } from "WorkItemTracking/Scripts/Queries/Components/FavoriteStar";
import { IQueriesHubContext, QueriesHubContextPropTypes } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { ChevronIconState } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryItem, FavoriteQueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as React from "react";
import { css } from "OfficeFabric/Utilities";
import { QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export interface INameColumnProps {
    queryItem: QueryItem;
    ignoreDepth: boolean;
    onRenderEmptyQueryItem?: (queryItem: QueryItem) => JSX.Element;
    pivot: string;
    ignoreExpansion?: boolean;
    onFolderNameClick?: (event: React.MouseEvent<HTMLAnchorElement>, idOrPath: string) => void;
}

export class NameColumn extends React.Component<INameColumnProps, {}> {
    static contextTypes = QueriesHubContextPropTypes;
    public context: IQueriesHubContext;

    constructor(props: INameColumnProps, context: IQueriesHubContext) {
        super(props, context);
    }

    public render(): JSX.Element {
        const queryItem: QueryItem = this.props.queryItem;
        const iconWidth = 16;
        const depth = this.props.queryItem.depth || 0;
        let leftIndent = this.props.ignoreDepth ? 0 : depth * iconWidth + (queryItem.isFolder ? 0 : iconWidth + 2);
        leftIndent += 1;   // adding 1px in margin so that the focus outline doesnt get cut on left side when leftIndent is 0

        const columnClassName = "query-name-ellipsis";
        const columnFolderClassName = "query-folder";
        const queryItemExpandState: ChevronIconState = QueryUtilities.getQueryItemExpandState(queryItem);

        if (queryItem.isEmptyFolderContext) {
            // Display "No items in the folder." message when the folder is empty
            return <EmptyQueryItem queryItem={this.props.queryItem} leftIndent={leftIndent} onRenderEmptyQueryItem={this.props.onRenderEmptyQueryItem} />;
        } else {
            const queryTypeLabel = QueryUtilities.getQueryTypeShortText(queryItem.queryType, queryItem.isInvalidSyntax);
            const columnTooltip = getTooltipId(columnClassName);
            const ariaLabel = format(
                WITResources.QueryHierarchyItemAriaLabel,
                queryItem.name,
                queryItem.isFolder ? WITResources.Folder : queryTypeLabel,
                queryItem.depth,
            );
            const queryUrl = QueryUtilities.createUrlForQuery(this.props.queryItem.id);
            const queryFolderUrl = QueryUtilities.createUrlForQueryFolderById(this.props.queryItem.id);
            const isFoldersView = !!this.props.onFolderNameClick;

            return <div className={"query-name-column"}>
                {queryItem.isFolder ?
                    // Name column for folder item
                    <div style={{ paddingLeft: leftIndent }} className={columnClassName + " " + columnFolderClassName} onClick={this._onClickFolder.bind(this, isFoldersView)}>
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Parent}
                            content={queryItem.name}
                            directionalHint={DirectionalHint.bottomCenter}
                            id={columnTooltip}
                        >
                        {!this.props.ignoreExpansion &&
                            <span style={{ marginRight: 2 }}>
                                {queryItemExpandState === ChevronIconState.Expanding ?
                                    <Spinner size={SpinnerSize.small} className="query-folder-spinner" /> :
                                    <span className={QueryUtilities.getChevronIconClassName(queryItemExpandState)} />}
                            </span>
                        }
                        {(depth > 0 || this.props.ignoreExpansion) && <span className="bowtie-icon bowtie-folder"></span>}
                        {isFoldersView ? <a
                            href={queryFolderUrl}
                            aria-label={ariaLabel}
                            aria-describedby={columnTooltip}
                            onClick={(event: React.MouseEvent<HTMLAnchorElement>) => this.props.onFolderNameClick(event, queryItem.id)}
                            draggable={false}
                        ><span>{queryItem.name}</span></a> // span here is needed otherwise the tooltip will always show on Edge/FF
                        : <span aria-label={ariaLabel} aria-describedby={columnTooltip} className={css("query-folder-name", depth === 0 && "query-header")}>{queryItem.name}</span>}
                        </TooltipHost>
                    </div> :
                    // Name column for query item
                    <div style={{ paddingLeft: leftIndent }} className={columnClassName}>
                        <TooltipHost content={queryTypeLabel}>
                            <span className={QueryUtilities.getQueryTypeIconClassName(queryItem.queryType)}></span>
                        </TooltipHost>
                        <a
                            href={queryUrl}
                            aria-label={ariaLabel}
                            aria-describedby={columnTooltip}
                            onClick={this._onClickQuery}
                            draggable={false}
                        >
                            <TooltipHost
                                overflowMode={TooltipOverflowMode.Parent}
                                content={queryItem.name}
                                directionalHint={DirectionalHint.bottomCenter}
                                id={columnTooltip}
                            >{queryItem.name}
                            </TooltipHost>
                        </a>
                    </div>
                }
                {!queryItem.isFolder // Show favorite toggle button when it is query
                    && <FavoriteStar queriesHubContext={this.context} queryItem={queryItem} />}
            </div>;
        }
    }

    private _onClickFolder = (isFoldersView: boolean, e: React.MouseEvent<HTMLElement>) => {
        const queryItem = this.props.queryItem;

        if (!queryItem.isFolder || isFoldersView) {
            return;
        }

        if (this.props.queryItem.expanded) {
            this.context.actionsCreator.collapseQueryFolder(this.props.queryItem);
        } else {
            this.context.actionsCreator.expandQueryFolder(this.props.queryItem);
        }

        // The same click event is fired by the row as well as by the expand/collapse icon (to make it keyboard accessible).
        // Preventing propagation will avoid calling the same handler twice when we click on expand icon
        // We can revisit this when we work on improving keyboard accessibility on the row.
        e.stopPropagation();
    }

    private _onClickQuery = (e: React.MouseEvent<HTMLElement>) => {
        // Stop navigation if its a normal click so that it does not do full page navigation
        // For ctrl + click , let the browser navigates
        // In Firefox and IE, middle click is reported as button === 1.
        if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
            this.context.navigationActionsCreator.navigateToRunQuery(this.props.queryItem.id, false);
            e.preventDefault();
            e.stopPropagation();
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
            WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_QUERY_ACTION,
            {
                "key": "run-query",
                "pivot": this.props.pivot,
                "source": "table-link",
                "queryId": this.props.queryItem.id,
                "isPublic": this.props.queryItem.isPublic,
                "isMyFavorite": (this.props.queryItem as FavoriteQueryItem).groupId === QueriesConstants.MyFavoritesGroupKey,
                "isLastVisited": (this.props.queryItem as FavoriteQueryItem).groupId === QueriesConstants.LastVisitedQueryGroupKey
            }));
    }
}
