import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Mapping/Components/WorkItemList";
import { SkeletonTitle } from "Agile/Scripts/BacklogsHub/Mapping/Components/SkeletonTitle";
import { UrlUtilities } from "Agile/Scripts/Common/HubUrlUtilities";
import { FocusZone } from "OfficeFabric/FocusZone";
import { Link } from "OfficeFabric/Link";
import { IPage, List } from "OfficeFabric/List";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { Async, IRenderFunction } from "OfficeFabric/Utilities";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { showWorkItemById } from "WorkItemTracking/SharedScripts/WorkItemDialogShim";

export interface IWorkItemListProps {
    /** Work item ids to display */
    workItemIds: number[];
    /** Get a materialized work item, or undefined if it has not been loaded */
    getWorkItem: (workItemId: number) => IWorkItem;
    /** Check if a work item has an error */
    getWorkItemError: (workItemId: number) => boolean;
    /** Check if we should page a work item */
    shouldPageWorkItem: (workItemId: number) => boolean;
    /** Callback to page work items */
    onPageWorkItems: (workItemIds: number[]) => void;
    /** Custom render function for a work item */
    onRenderWorkItemRow?: IRenderFunction<IWorkItemRowProps>;
}

const DEFAULT_ROW_HEIGHT = 34;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_THROTTLE_INTERVAL = 500;

export class WorkItemList extends React.Component<IWorkItemListProps> {
    private _async: Async;
    private _pageVisibleWorkItemsDebounced: () => void;
    private _visiblePages: IDictionaryStringTo<IPage>;

    constructor(props: IWorkItemListProps) {
        super(props);

        this._async = new Async(this);
        this._pageVisibleWorkItemsDebounced = this._async.throttle(this._pageVisibleWorkItems, PAGE_THROTTLE_INTERVAL, { leading: false });
        this._visiblePages = {};
    }

    public render(): JSX.Element {
        const {
            workItemIds
        } = this.props;

        return (
            <FocusZone className="work-item-list" data-is-scrollable="true">
                <List
                    role="list"
                    items={workItemIds}
                    onRenderCell={this._renderWorkItem}
                    getItemCountForPage={this._getItemsPerPage}
                    getPageHeight={this._computePageHeight}
                    onPageAdded={this._onPageAdded}
                    onPageRemoved={this._onPageRemoved}
                    renderedWindowsAhead={1}
                />
            </FocusZone>
        );
    }

    public componentWillUnmount(): void {
        this._async.dispose();
        this._async = null;
    }

    private _renderWorkItem = (workItemId: number, index: number): JSX.Element => {
        const {
            getWorkItem,
            onRenderWorkItemRow = this._defaultRenderWorkItem,
            workItemIds
        } = this.props;

        const workItem = getWorkItem(workItemId);
        return onRenderWorkItemRow({ workItem, index, setSize: workItemIds ? workItemIds.length : 0 }, this._defaultRenderWorkItem);
    }

    private _defaultRenderWorkItem = (props: IWorkItemRowProps) => {
        return (
            <WorkItemRow
                {...props}
            />
        );
    }

    private _computePageHeight = (startIndex: number): number => {
        const endIndex = Math.min(startIndex + DEFAULT_PAGE_SIZE, this.props.workItemIds.length);
        return DEFAULT_ROW_HEIGHT * (endIndex - startIndex + 1);
    }

    private _getItemsPerPage = (): number => {
        return DEFAULT_PAGE_SIZE;
    }

    private _onPageAdded = (page: IPage): void => {
        this._visiblePages[page.key] = page;
        this._pageVisibleWorkItemsDebounced();
    }

    private _onPageRemoved = (page: IPage): void => {
        delete this._visiblePages[page.key];
    }

    private _pageVisibleWorkItems = (): void => {
        const {
            shouldPageWorkItem,
            onPageWorkItems,
            workItemIds
        } = this.props;

        // Materialize all the visible pages
        const idsToPage: number[] = [];
        for (const pageKey in this._visiblePages) {
            const page = this._visiblePages[pageKey];
            if (page) {
                for (let i = 0; i < page.itemCount; i++) {
                    const workItemId = workItemIds[page.startIndex + i];
                    if (shouldPageWorkItem(workItemId)) {
                        idsToPage.push(workItemId);
                    }
                }
            }
        }

        if (idsToPage.length > 0) {
            onPageWorkItems(idsToPage);
        }
    }
}

export interface IWorkItemRowProps {
    workItem: IWorkItem;
    index: number;
    setSize: number;
}

class WorkItemRow extends React.PureComponent<IWorkItemRowProps> {
    public render(): JSX.Element {
        const {
            workItem,
            index,
            setSize
        } = this.props;

        if (workItem) {
            const teamProject = workItem.fields[CoreFieldRefNames.TeamProject] || getDefaultWebContext().project.name;
            const workItemTypeIconDetails = WorkItemTypeColorAndIconsProvider.getInstance().getColorAndIcon(teamProject, workItem.fields[CoreFieldRefNames.WorkItemType]);
            return (
                <div className="work-item-row">
                    <VssIcon
                        className="work-item-type-icon"
                        iconType={VssIconType.bowtie}
                        iconName={workItemTypeIconDetails.icon}
                        styles={{ root: { color: workItemTypeIconDetails.color } }}
                    />
                    <Link className="work-item-title" href={UrlUtilities.getWorkItemEditUrl(workItem.id)} onClick={this._onWorkItemClicked} role="listitem" aria-posinset={index + 1} aria-setsize={setSize}>
                        <TooltipHost overflowMode={TooltipOverflowMode.Parent} content={workItem.fields[CoreFieldRefNames.Title]}>
                            {workItem.fields[CoreFieldRefNames.Title]}
                        </TooltipHost>
                    </Link>
                </div>
            );
        } else {
            return (
                <div className="work-item-row">
                    <div className="work-item-type-icon work-item-type-icon--loading" />
                    <SkeletonTitle />
                </div>
            );
        }
    }

    private _onWorkItemClicked = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            showWorkItemById(this.props.workItem.id);
        }
    }
}