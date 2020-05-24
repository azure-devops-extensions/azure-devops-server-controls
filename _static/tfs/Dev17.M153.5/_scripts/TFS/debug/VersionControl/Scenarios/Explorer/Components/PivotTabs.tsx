import { Pivot, PivotItem, PivotLinkFormat, PivotLinkSize } from "OfficeFabric/Pivot";
import * as React from "react";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";
import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import * as _GitHistoryPivotFilters from "VersionControl/Scenarios/Explorer/Components/GitHistoryPivotFilters";
import { ItemCommandBarContainer } from "VersionControl/Scenarios/Explorer/Components/ItemCommandBar";
import { PivotTabItem } from "VersionControl/Scenarios/Explorer/Stores/PivotTabsStore";
import { GitFilterSearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Components/GitHistoryFilter";
import * as _TfvcHistoryPivotFilters from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";

/**
 * A component that displays the tabs selectors for the current item (not the content).
 */
export const PivotTabsContainer = VCContainer.create(
    ["pivotTabs", "itemContent"],
    ({ pivotTabsState, itemContentState, isGit }, { actionCreator, storesHub }) =>
        !pivotTabsState.isFullScreen &&
        !itemContentState.notFoundErrorMessage &&
        <div className="pivot-tabs-container">
            <PivotTabs
                visibleTabs={pivotTabsState.visibleTabs}
                currentTab={pivotTabsState.currentTab}
                onClick={actionCreator.changeTab}
            />
            {
                pivotTabsState.currentTab !== VersionControlActionIds.History &&
                <ItemCommandBarContainer actionCreator={actionCreator} storesHub={storesHub} />
            }
            <div className={"filters" + (pivotTabsState.isHistoryFilterVisible ? "" : " hidden")}>
                {
                    pivotTabsState.isHistoryFilterVisible &&
                    (isGit
                        ? <GitHistoryFilterContainer actionCreator={actionCreator} storesHub={storesHub} />
                        : <TfvcHistoryFilterContainer actionCreator={actionCreator} storesHub={storesHub} />)
                }
            </div>
        </div>);

export interface PivotTabsProps {
    visibleTabs: PivotTabItem[];
    currentTab: string;
    onClick(tabKey: string): void;
}

const PivotTabs = (props: PivotTabsProps): JSX.Element =>
    <div className="views">
        <Pivot
            linkFormat={PivotLinkFormat.links}
            linkSize={PivotLinkSize.normal}
            selectedKey={props.currentTab}
            headersOnly={true}
            getTabId={getExplorerTabId}
            onLinkClick={pivotItem => props.onClick(pivotItem.props.itemKey)}>
            {
                props.visibleTabs.map(pivotTabItem =>
                    <PivotItem
                        key={pivotTabItem.tabKey}
                        linkText={pivotTabItem.title}
                        itemKey={pivotTabItem.tabKey}
                    />)
            }
        </Pivot>
    </div>;

export function getExplorerTabId(itemKey: string): string {
    return `ExplorerTab_${itemKey}`;
}

const TfvcHistoryFilterContainer = VCContainer.create(
    ["tfvcHistoryFilter"],
    ({ tfvcHistoryFilterState }, { actionCreator }) =>
        <div className={"explorer-history-pivot-filters"}>
            <TfvcHistoryPivotFiltersAsync
                initialSearchCriteria={tfvcHistoryFilterState}
                filterUpdatedCallback={actionCreator.updateTfvcHistoryFilters} />
        </div>);

const GitHistoryFilterContainer = VCContainer.create(
    ["historyList", "context", "settingsPermissions"],
    ({ historyListState, settingPermissionState }, { actionCreator }) => {

        const searchCriteria: GitFilterSearchCriteria = historyListState.searchCriteria ? {
            user: historyListState.searchCriteria.user,
            alias: historyListState.searchCriteria.alias,
            fromDate: historyListState.searchCriteria.fromDate,
            toDate: historyListState.searchCriteria.toDate,
            gitLogHistoryMode: historyListState.searchCriteria.gitLogHistoryMode,
        } : null;
        const filterState = FilterHelpers.hasNonEmptyProperties(searchCriteria as GitFilterSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED;
        return <div className={"explorer-history-pivot-filters"}>
            <GitHistoryPivotFiltersAsync
                onGraphColumnToggleClick={actionCreator.toggleHistoryGraph}
                onDismissMessage={actionCreator.dismissHistoryGraphInfo}
                isChecked={historyListState.isGitGraphFeatureEnabled}
                message={historyListState.gitGraphMessage}
                filterState={filterState}
                toggleFilterPanel={actionCreator.toggleFilterPanelVisibility}
                isFilterPanelVisible={historyListState.isFilterPanelVisible}
                isGraphEnabled={settingPermissionState.Write} />
        </div>;
    });

const GitHistoryPivotFiltersAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Explorer/Components/GitHistoryPivotFilters"],
    (gitHistoryPivotFilters: typeof _GitHistoryPivotFilters) => gitHistoryPivotFilters.GitHistoryPivotFilters);

const TfvcHistoryPivotFiltersAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter"],
    (tfvcHistoryPivotFilters: typeof _TfvcHistoryPivotFilters) => tfvcHistoryPivotFilters.ChangesetsFilter);
