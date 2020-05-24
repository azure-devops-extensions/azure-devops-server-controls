/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind, getId, IRenderFunction } from 'OfficeFabric/Utilities';
import { CommandButton } from 'OfficeFabric/Button';
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { ISearchPickListItem } from "SearchUI/SearchPickList";
import { PathControl } from "Search/Scripts/React/Components/PathControl/PathControl";
import { TreeViewPathControl } from "Search/Scripts/React/Components/PathTreeControl/TreeViewPathControl";
import { WrappedMultiSelectMenu } from "Search/Scripts/React/Components/WrappedMultiSelectMenu";
import {
    versionControlElementRenderer,
    areaPathElementRenderer,
    branchPathElementRenderer
} from "Search/Scripts/React/Components/PathControl/PathControlDropdownElementRenderer";
import * as Models from "Search/Scripts/React/Models";
import { scrub, isPathFilter, reset } from "Search/Scripts/React/Components/MiddleSection/FilterScrubbers";
import { viewScrubber } from "Search/Scripts/React/Components/MiddleSection/FilterViewScrubber";
import { getCalloutAble } from "Search/Scripts/React/Components/Callout";
import { filterCategoryViewProps, fetchImmediateChildinPath, substringSort } from "Search/Scripts/React/Common";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";

import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { ignoreCaseComparer } from "VSS/Utils/String";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import {
    DefaultFilterCategory,
    PathScopeFilterCategory,
    AreaPathFilterCategory,
    BranchFilterCategory,
    VersionControlType
} from "Search/Scripts/Contracts/TFS.Search.Base.Contracts";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as AreaPathTree_Source_NO_REQUIRE from "Search/Scripts/React/Sources/AreaPathTreeDataSource";
import * as VersionControlPathTree_Source_NO_REQUIRE from "Search/Scripts/React/Sources/VersionControlPathTreeDataSource";

import "VSS/LoaderPlugins/Css!Search/React/Components/MiddleSection";

export interface IMiddleSectionState {
    // ToDo: piyusing, come up with filters contract.
    items: any[],
    filtersVisibility: boolean
}

export interface IFilterRendererProps {
    options: Models.IItemProps,
    enabled: boolean,
    actionCreator: ActionCreator,
    storesHub: StoresHub,
    featureAvailabilityStates: IDictionaryStringTo<boolean>
}

const enum FilterCategory {
    DefaultFilterCategory,
    PathScopeFilterCategory,
    AreaPathFilterCategory,
    BranchFilterCategory
}

const renderers: IDictionaryNumberTo<(props: IFilterRendererProps) => any> = {};

const CalloutWrappedPathControl = getCalloutAble(PathControl);
const CalloutWrappedTreeViewPathControl = getCalloutAble(TreeViewPathControl);

renderers[FilterCategory.DefaultFilterCategory] =
    (props: IFilterRendererProps) => {
        let options = props.options,
            calloutProps = filterCategoryViewProps[options.item.name].calloutProps,
            dropdownItemDisplayLabels = filterCategoryViewProps[options.item.name].dropdownItemDisplayLabels
        return <WrappedMultiSelectMenu
            name={options.item.name}
            width={filterCategoryViewProps[options.item.name].width}
            enabled={props.enabled}
            items={options.item.filters}
            displayName={
                filterCategoryViewProps[options.item.name].displayName ||
                Search_Resources[options.item.name] ||
                options.item.name
            }
            dropdownItemDisplayLabels={dropdownItemDisplayLabels}
            allItemLabel={
                filterCategoryViewProps[options.item.name].allItemLabel ||
                Search_Resources.AllText
            }
            allItemDisplayName={
                filterCategoryViewProps[options.item.name].allFilterLabel ||
                Search_Resources.AllText
            }
            onRefineItems={(items: ISearchPickListItem[], searchText: string) => {
                return substringSort<ISearchPickListItem>(
                    items,
                    (item: ISearchPickListItem) => item.name,
                    searchText);
            }}
            onSelectionChanged={options.onItemSelectionChanged}
            searchTextPlaceholder={filterCategoryViewProps[options.item.name].watermark}
            calloutProps={calloutProps}
            featureAvailabilityStates={props.featureAvailabilityStates} />
    };

renderers[FilterCategory.PathScopeFilterCategory] =
    (props: IFilterRendererProps) => {
        let options = props.options,
            defaultPath = options.item.defaultPathForExpansion,
            defaultSelectedItem: IItem = {
                fullName: options.item.defaultPathForExpansion ? options.item.defaultPathForExpansion :
                    (props.options.item.repositoryType === VersionControlType.Git ? "/" : props.options.item.repoName)
            } as IItem,
            calloutProps = filterCategoryViewProps[options.item.name].calloutProps;

        // Setting the default root path for TFVC and Git Repository
        if (!defaultPath) {
            defaultPath = options.item.repoName[0] === "$" ? props.options.item.repoName : "/";
        }

        let cache = null;
        let rootPath = props.options.item.repositoryType === VersionControlType.Git ? "/" : props.options.item.repoName;

        if (props.options.item.repositoryType === VersionControlType.Git) {
            cache = VersionControlPathTree_Source_NO_REQUIRE.GitPathTreeCache.getInstance();
            cache.initialize({
                projectName: options.item.projectName,
                repoId: options.item.repoId,
                repoName: options.item.repoName,
                branchName: options.item.branchName
            });
        } else {
            cache = VersionControlPathTree_Source_NO_REQUIRE.TFVCPathTreeCache.getInstance();
            cache.initialize(options.item.projectName);
        }

        return <CalloutWrappedTreeViewPathControl
            searchBoxWatermark={filterCategoryViewProps[options.item.name].watermark}
            label={Search_Resources.PathScopFilterDisplayPrefix + ":"}
            defaultSelectedItem={defaultSelectedItem}
            dropdownItemDisplayLabels={filterCategoryViewProps[options.item.name].dropdownItemDisplayLabels}
            dataSource={cache}
            enabled={props.enabled}
            rootPath={rootPath}
            separator={"/"}
            defaultPath={defaultPath}
            calloutProps={calloutProps}
            {...options } />
    };

renderers[FilterCategory.AreaPathFilterCategory] =
    (props: IFilterRendererProps) => {
        let options = props.options,
            defaultSelectedItem: IItem = {
                fullName: options.item.areaPath ? options.item.areaPath : options.item.projectName
            } as IItem;

        let cache = AreaPathTree_Source_NO_REQUIRE.WIAreaPathCache.getInstance();
        cache.initialize({
            projectName: options.item.projectName
        });

        let calloutProps = filterCategoryViewProps[options.item.name].calloutProps;

        return <CalloutWrappedTreeViewPathControl
            searchBoxWatermark={filterCategoryViewProps[options.item.name].watermark}
            label={Search_Resources.AreaPathScopFilterDisplayPrefix + ":"}
            defaultSelectedItem={defaultSelectedItem}
            dropdownItemDisplayLabels={filterCategoryViewProps[options.item.name].dropdownItemDisplayLabels}
            dataSource={cache}
            enabled={props.enabled}
            rootPath={options.item.projectName}
            defaultPath={defaultSelectedItem.fullName}
            separator={"\\"}
            calloutProps={calloutProps}
            {...options } />
    };

renderers[FilterCategory.BranchFilterCategory] =
    (props: IFilterRendererProps) => {
        let options = props.options,
            calloutProps = filterCategoryViewProps[options.item.name].calloutProps;

        return <CalloutWrappedPathControl
            searchBoxWatermark={filterCategoryViewProps[options.item.name].watermark}
            behaviour={{
                elementRenderer: branchPathElementRenderer,
                getItemsOnActivation: (allItems: Models.IPathControlElement[], textBoxInput: string): Models.IPathControlElement[] => {
                    return allItems;
                },
                getActivatedItemIndexOnActivation: (allItems: Models.IPathControlElement[], textBoxInput: string): number => {
                    let index: number = -1,
                        itemCount: number = allItems.length;
                    for (let idx = 0; idx < itemCount; idx++) {
                        if (ignoreCaseComparer(allItems[idx].displayName, textBoxInput) === 0) {
                            index = idx;
                            break;
                        }
                    }

                    return index;
                }
            }}
            label={Search_Resources.BranchFilters + ":"}
            defaultSelectedItem={{ displayName: options.item.selectedBranch } as Models.IPathControlElement}
            dropdownItemDisplayLabels={filterCategoryViewProps[options.item.name].dropdownItemDisplayLabels}
            actionCreator={props.actionCreator}
            storesHub={props.storesHub}
            enabled={props.enabled}
            calloutProps={calloutProps}
            {...options} />
    };

export interface MiddleSectionProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    featureAvailabilityStates: IDictionaryStringTo<boolean>;
    currentPageContext: NavigationContextLevels;
}

export class MiddleSection extends React.Component<MiddleSectionProps, IMiddleSectionState> {
    constructor(props: MiddleSectionProps) {
        super(props);
        this.state = { items: [] } as IMiddleSectionState;
    };

    public render(): JSX.Element {
        let renderFilters = this.state.items.length > 0;
        if (renderFilters) {
            const scrubbedFilters = viewScrubber(
                this.props.storesHub.searchProvidersStore.CurrentProvider,
                this.state.items,
                this.props.featureAvailabilityStates.contextualNavigationEnabled,
                this.props.currentPageContext);

            return (
                <div className="middle-section">
                    {
                        this.state.filtersVisibility &&
                        <div className="search-FilterPane--container">
                            <div
                                className="filter-pane"
                                role="region"
                                aria-label={Search_Resources.FiltersRegionArialabel}>
                                {
                                    scrubbedFilters.map((filter, index) => {
                                        let filterType: FilterCategory = this._getFilterTypeName(filter),
                                            renderer: (p: IFilterRendererProps) => any = renderers[filterType];

                                        if (renderer && typeof renderer === "function") {
                                            return (
                                                <span className="filter" key={filter.name}>
                                                    {
                                                        renderer(
                                                            {
                                                                options: {
                                                                    item: filter,
                                                                    onItemSelectionChanged: this._onItemSelectionChanged
                                                                } as Models.IItemProps,
                                                                enabled: filter.enabled,
                                                                actionCreator: this.props.actionCreator,
                                                                storesHub: this.props.storesHub,
                                                                featureAvailabilityStates: this.props.featureAvailabilityStates
                                                            })
                                                    }
                                                </span>);
                                        }
                                    })
                                }
                                <div className="reset-container">
                                    <CommandButton
                                        iconProps={{ iconName: 'Cancel', className: 'reset-icon' }}
                                        className="reset"
                                        onClick={this._onResetClick}
                                        onRenderText={
                                            (): JSX.Element => {
                                                return (<span className="reset-Label">
                                                    {Search_Resources.ResetText}
                                                </span>);
                                            }
                                        } />
                                </div>
                            </div>
                        </div>
                    }
                </div>
            );
        }
        else {
            return (<div />);
        }
    }

    public componentDidMount(): void {
        this.props.storesHub.filterStore.addChangedListener(this._onFiltersUpdated);

        // we are listening to searchProvidersStore as we want to render disabled filters whenever the search entity switch is made.
        this.props.storesHub.searchProvidersStore.addChangedListener(this._onFiltersUpdated);
    }

    @autobind
    private _onFiltersUpdated(): void {
        let searchEntity = this.props.storesHub.searchProvidersStore.CurrentProvider,
            filters = this.props.storesHub.filterStore.filters(searchEntity),
            visibility = this.props.storesHub.filterStore.getFiltersVisibility();
        this.setState({ items: filters, filtersVisibility: visibility });
    }

    @autobind
    private _onItemSelectionChanged(name: string, filters: any[]): void {
        let applicableFilters = {},
            currentSearchProvider: Models.SearchProvider = this.props.storesHub.searchProvidersStore.CurrentProvider;
        this.state.items.forEach((filter, index) => {
            let categoryName: string = filter.name,
                enabled: boolean = filter.enabled,
                categorySelectedFilters: any[],
                filterType = this._getFilterTypeName(filter);
            // include filter in the request only if the filter is enabled.
            if (ignoreCaseComparer(categoryName, name) !== 0 && enabled) {
                if (filterType === FilterCategory.DefaultFilterCategory) {
                    categorySelectedFilters = (filter.filters || [])
                        .filter((f, i) => {
                            return f.selected;
                        });

                    applicableFilters[categoryName] = categorySelectedFilters;
                }
                else if (filterType === FilterCategory.PathScopeFilterCategory) {
                    applicableFilters[categoryName] = [filter.defaultPathForExpansion];
                }
                else if (filterType === FilterCategory.AreaPathFilterCategory) {
                    applicableFilters[categoryName] = [filter.areaPath];
                }
                else if (filterType === FilterCategory.BranchFilterCategory) {
                    applicableFilters[categoryName] = [filter.defaultBranch];
                }
            }
        });

        applicableFilters[name] = filters.map((f) => {
            if (ignoreCaseComparer(name, SearchConstants.PathFilters) === 0 ||
                ignoreCaseComparer(name, WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME) === 0 ||
                ignoreCaseComparer(name, SearchConstants.BranchFilters) === 0) {
                return f.displayName || f;
            }
            else {
                return f;
            }
        });

        // Log every selection/deselection of filters in new layout.
        TelemetryHelper.traceLog({
            "FilterSelectionChangedInNewLayout": name
        });

        let scrubbedFilters: any[] = scrub(currentSearchProvider, applicableFilters),
            pathFilterChanged: boolean = isPathFilter(currentSearchProvider, name);
        // if path filters are clicked, since we are hidindg the correspoding dropdowns we want the focus to shift to results view
        // that's why we are calling changeFilterSelection with "retainFocusOnDropdown" as false.
        this.props.actionCreator.changeFilterSelection(scrubbedFilters, !pathFilterChanged);
    }

    @autobind
    private _onResetClick(): void {
        TelemetryHelper.traceLog({
            "ResetToDefaultClicked": true
        });

        // on reset click we want the focus to shift to results view as soon as the results are obtained.
        let currentSearchProvider = this.props.storesHub.searchProvidersStore.CurrentProvider,
            resetFilters: any[] = reset(currentSearchProvider);
        this.props.actionCreator.changeFilterSelection(resetFilters, false);
    }

    private _getFilterTypeName(filter: any): FilterCategory {
        if (filter instanceof DefaultFilterCategory) {
            return FilterCategory.DefaultFilterCategory;
        }
        else if (filter instanceof PathScopeFilterCategory) {
            return FilterCategory.PathScopeFilterCategory;
        }
        else if (filter instanceof AreaPathFilterCategory) {
            return FilterCategory.AreaPathFilterCategory;
        }
        else if (filter instanceof BranchFilterCategory) {
            return FilterCategory.BranchFilterCategory;
        }
    }
}