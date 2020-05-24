import { IBreadCrumbData } from "OfficeFabric/Breadcrumb";
import { ContributionHubViewStateRouterContextPropTypes, IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { DEFAULT_SEPARATOR } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import "VSS/LoaderPlugins/Css!Queries/Components/QueriesHub";
import { IHubBreadcrumbBaseProps, IHubBreadcrumbItem } from "VSSUI/HubHeader";
import { IPickListSelection, IPickListItem } from "VSSUI/PickList";
import { FILTER_CHANGE_EVENT, IFilterState } from "VSSUI/Utilities/Filter";
import { VssIconType } from "VSSUI/VssIcon";
import { ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { IQueriesHubContext, QueriesHubContext, QueriesHubContextPropTypes } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { IQueriesHubProps } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubProps";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueriesViewState } from "WorkItemTracking/Scripts/Queries/QueriesViewState";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WorkHubShortcutGroup } from "WorkItemTracking/Scripts/WorkShortcutGroup";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { getLocalService } from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";

import * as React from "react";

export interface IQueriesHubState {
    errorMessage: string | JSX.Element;
}

const MAXDISPLAY_BREADCRUMB_ITEMS = 8;
const MINDISPLAY_BREADCRUMB_ITEMS = 3;
const OVERFLOW_INDEX = 2;
const DEFAULT_OVERFLOW_INDEX = 0;

export abstract class QueriesHub<TProps extends IQueriesHubProps, TState extends IQueriesHubState> extends React.Component<TProps, TState> {
    static contextTypes = ContributionHubViewStateRouterContextPropTypes;
    public context: IContributionHubViewStateRouterContext;
    protected _hubViewState: QueriesViewState;
    static childContextTypes = QueriesHubContextPropTypes;
    protected _queriesHubContext: IQueriesHubContext;

    constructor(props: TProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);
        this.state = { errorMessage: null } as TState;
        this._queriesHubContext = this._ensureQueriesHubContext();
        this._hubViewState = this._queriesHubContext.queryHubViewState;
        new WorkHubShortcutGroup(this._hubViewState);
        this._hubViewState.filter.subscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
    }

    public getChildContext(): IQueriesHubContext {
        return this._queriesHubContext;
    }

    public componentWillUnmount() {
        // Reset query performance scenarios
        QueryUtilities.resetQueryPerformanceScenarios();

        this._queriesHubContext.actionsCreator.setSearchText("");
        this._hubViewState.filter.unsubscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
        this._hubViewState.filter.setFilterItemState(QueriesHubConstants.SearchKeyword, { value: "" });
    }

    private _ensureQueriesHubContext(): IQueriesHubContext {
        let queriesHubContext = this.context.contextManager.getContext<IQueriesHubContext>(QueriesHubConstants.QueriesHubContext);

        if (!queriesHubContext) {
            queriesHubContext = QueriesHubContext.getInstance();
            this.context.contextManager.setContext<IQueriesHubContext>(QueriesHubConstants.QueriesHubContext, queriesHubContext);
        }

        return queriesHubContext;
    }

    private navigateToFolderPage = (path: string, ev: React.MouseEvent<HTMLElement>) => {
        // if control key is pressed, don't do the navigation since the user
        // is intending for the href to opened in a new tab
        if (ev.ctrlKey) {
            return;
        }
        // prevent the href on the breadcrumb from navigating
        ev.preventDefault();

        if (this._shouldNavigate(path)) {
            this._queriesHubContext.navigationActionsCreator.navigateToQueriesFolderPage(path, true);
            QueryUtilities.recordBreadcrumbTelemetry(true /*isRoot*/);
        }
    }

    private navigateToQueriesPage = (ev: React.MouseEvent<HTMLElement>) => {
        // if control key is pressed, don't do the navigation since the user
        // is intending for the href to opened in a new tab
        if (ev.ctrlKey) {
            return;
        }

        // prevent the href on the breadcrumb from navigating
        ev.preventDefault();

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.QueryDirectoryNewWebPlatform, false)) {
            const tfsContext = TfsContext.getDefault();
            const href = tfsContext.getPublicActionUrl(
                QueriesHubConstants.AllQueriesPageAction,
                QueriesHubConstants.ControllerName,
                {
                    project: tfsContext.navigation.project,
                    team: tfsContext.navigation.team
                });

            getLocalService(HubsService).getHubNavigateHandler("ms.vss-work-web.query:hub", href)(ev);
        } else {
            this._queriesHubContext.navigationActionsCreator.navigateToQueriesHub(QueriesHubConstants.AllQueriesPageAction, true);
        }

        QueryUtilities.recordBreadcrumbTelemetry(true /*isRoot*/);
    }

    protected _onSearchTextChanged = (filterState: IFilterState) => {
        if (filterState[QueriesHubConstants.SearchKeyword]) {
            this._queriesHubContext.actionsCreator.setSearchText(filterState[QueriesHubConstants.SearchKeyword].value);
        }
    }

    protected _shouldNavigate(path: string): boolean {
        return true;
    }

    protected _getMinDisplayedBreadcrumbItems(): number {
        return MINDISPLAY_BREADCRUMB_ITEMS;
    }

    /**
     * Gets custom breadcrumb props applicable to queries view
     * @param numOfItems The number of items in the breadcrumb
     */
    protected _getBreadCrumbProps(numOfItems: number): IHubBreadcrumbBaseProps {
        const isFullScreen = this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN);
        // We always want to show Queries > Shared Queries > ... > QueryItem
        // Also in fullscreen view, we show only leaf item but the path here is full query path
        return {
            maxDisplayedItems: MAXDISPLAY_BREADCRUMB_ITEMS,
            overflowIndex: numOfItems > OVERFLOW_INDEX && !isFullScreen ? OVERFLOW_INDEX : DEFAULT_OVERFLOW_INDEX,
            onReduceData: this._onReduceData
        };
    }

    private _onReduceData = (data: IBreadCrumbData): IBreadCrumbData | undefined => {
        let { renderedItems, renderedOverflowItems } = data;
        const { overflowIndex } = data.props;
        let movedItem;
        const lastIndex = renderedItems.length - 1;

        // Always show the first two items and the last item
        if (overflowIndex !== lastIndex && overflowIndex !== 0) {
            renderedItems = [...renderedItems];
            movedItem = renderedItems.splice(overflowIndex, 1);
            renderedOverflowItems = renderedOverflowItems.concat(movedItem);
        }

        if (movedItem !== undefined) {
            return { ...data, renderedItems, renderedOverflowItems };
        }
    }

    /**
     * @param path - Parent path
     * @param currentQueryItemPath - Current Query Item path if incase of triage view
     * @param workItemsNavigator
     */
    protected _getBreadCrumbItems(path: string, currentQueryItemPath?: string, workItemsNavigator?: WorkItemsNavigator): IHubBreadcrumbItem[] {
        const tfsContext = TfsContext.getDefault();
        const href = tfsContext.getPublicActionUrl(
            QueriesHubConstants.AllQueriesPageAction,
            QueriesHubConstants.ControllerName,
            {
                project: tfsContext.navigation.project,
                team: tfsContext.navigation.team
            });

        const parentTitles = path ? path.split(DEFAULT_SEPARATOR) : [];

        const onSelectionChanged = (selection: IPickListSelection): boolean => {
            const selectedItem = selection.selectedItems[0];
            const queryItemSelected = this._queriesHubContext.stores.queryHierarchyItemStore.getItem(selectedItem.key);
            if (!queryItemSelected.isFolder) {
                if (workItemsNavigator) {
                    workItemsNavigator.reset();
                }
                PerfScenarioManager.startScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENBREADCRUMBQUERYRESULTS, false);
                this._queriesHubContext.navigationActionsCreator.navigateToQueryPreservingSupportedState(queryItemSelected.id, true);
            } else {
                this._queriesHubContext.navigationActionsCreator.navigateToQueriesFolderPage(queryItemSelected.id, true);
            }

            QueryUtilities.recordBreadcrumbTelemetry();
            return true; // prevent default;
        };

        let lastPath = "";
        const getQueryHierarchyPicklistItems = (items: QueryHierarchyItem[]) => {
            QueryUtilities.sortQueryFolderItems(items);
            return items.map((item: QueryHierarchyItem): IPickListItem => ({
                name: item.name,
                key: item.path,
                href: item.isFolder ? QueryUtilities.createUrlForQueryFolderByPath(item.path) :
                    QueryUtilities.createUrlForQuery(item.id),
                iconProps: {
                    iconName: item.isFolder ? "bowtie-folder" : QueryUtilities.getQueryTypeIconClassName(item.queryType, false),
                    iconType: VssIconType.bowtie,
                    className: item.isFolder ? "query-folder-picklist-folder" : null
                }
            }));
        };

        const breadcrumbItems: IHubBreadcrumbItem[] = parentTitles.map((title: string, index: number) => {
            const intermediatePath: string = lastPath + title;
            lastPath = intermediatePath + DEFAULT_SEPARATOR;
            const selectedItemPath = index < parentTitles.length - 1 ? lastPath + parentTitles[index + 1] : currentQueryItemPath || path;
            let ensureQueryItemPromise;

            return {
                text: title,
                key: intermediatePath,
                onClick: this.navigateToFolderPage.bind(this, intermediatePath),
                href: QueryUtilities.createUrlForQueryFolderByPath(intermediatePath),
                itemPicker: {
                    selectedItem: {
                        name: selectedItemPath,
                        key: selectedItemPath
                    },
                    getItems: () => {
                        if (!ensureQueryItemPromise) {
                            ensureQueryItemPromise = new Promise((resolve) => {
                                this._queriesHubContext.actionsCreator.ensureQueryItem(intermediatePath, 1).then(
                                    () => {
                                        const parent = this._queriesHubContext.stores.queryHierarchyItemStore.getItem(intermediatePath);
                                        const items = parent.children;
                                        resolve(getQueryHierarchyPicklistItems(items));
                                    },
                                    (error: Error) => {
                                        this._queriesHubContext.actionsCreator.showErrorMessageForQueriesView(error.message);
                                        resolve([]);
                                    }
                                );
                            });
                        }
                        return ensureQueryItemPromise;
                    },
                    getListItem: i => i
                },
                onSelectionChanged
            };
        });
        let ensureRootQueryItemPromise;
        const rootQueryItem = {
            text: Resources.QueriesView_PivotTitle,
            key: "Queries",
            onClick: this.navigateToQueriesPage,
            href,
            itemPicker: {
                selectedItem: {
                    name: parentTitles[0],
                    key: parentTitles[0]
                },
                getItems: () => {
                    if (!ensureRootQueryItemPromise) {
                        ensureRootQueryItemPromise = new Promise((resolve) => {
                            this._queriesHubContext.actionsCreator.ensureRootQueryFolders().then(
                                () => {
                                    const rootQueryFolders = this._queriesHubContext.stores.queryHierarchyItemStore.getRootFolderItems();
                                    resolve(getQueryHierarchyPicklistItems(rootQueryFolders));
                                },
                                (error: Error) => {
                                    this._queriesHubContext.actionsCreator.showErrorMessageForQueriesView(error.message);
                                    resolve([]);
                                }
                            );
                        });
                    }
                    return ensureRootQueryItemPromise;
                },
                getListItem: i => i
            },
            onSelectionChanged
        };

        breadcrumbItems.unshift(rootQueryItem);

        return breadcrumbItems;
    }
}
