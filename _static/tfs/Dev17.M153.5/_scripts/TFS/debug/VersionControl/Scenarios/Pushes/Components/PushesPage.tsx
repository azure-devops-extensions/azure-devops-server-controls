/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Fabric } from "OfficeFabric/Fabric";
import { Spinner } from "OfficeFabric/Spinner";

import { FilterPanelToggleButton, FilterPanelToggleButtonProps } from "Presentation/Scripts/TFS/Controls/Filters/FilterPanelToggleButton";
import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { ActionCreator } from  "VersionControl/Scenarios/Pushes/ActionCreator";
import * as BranchUpdateContainer from "VersionControl/Scenarios/Pushes/Components/BranchUpdateContainer";
import { BranchUpdatesFilter } from "VersionControl/Scenarios/Pushes/Components/BranchUpdatesFilter";
import { BranchUpdatesList } from "VersionControl/Scenarios/Pushes/Components/BranchUpdatesList";
import { StoresHub, AggregateState } from "VersionControl/Scenarios/Pushes/Stores/StoresHub";
import { EmptyResultPage } from "VersionControl/Scenarios/Shared/EmptyResultPage";
import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/PushesPage";

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(
        <Page {...props} />,
        container);
}

export interface PageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    customerIntelligenceData?: CustomerIntelligenceData;
}

/**
 * Container for the Pushes Page
 */
const Page = (props: PageProps): JSX.Element =>
    <div className="absolute-full">
        <Fabric className="vc-page absolute-full">
            <Header {...props} />
            <HubContent {...props} />
        </Fabric>
    </div>;

const Header = (props: PageProps) =>
    <HeaderPure
        actionCreator={props.actionCreator}
        stores={[props.storesHub.stores.searchCriteriaStore, props.storesHub.stores.contextStore, props.storesHub.stores.pushesPermissionStore]}
        getState={props.storesHub.getAggregateState}
        customerIntelligenceData={props.customerIntelligenceData}
        />;

const HubContent = (props: PageProps) =>
    <HubContentPure
        actionCreator={props.actionCreator}
        stores={[props.storesHub.stores.searchCriteriaStore, props.storesHub.stores.contextStore, props.storesHub.stores.branchUpdatesStore]}
        getState={props.storesHub.getAggregateState}
        customerIntelligenceData={props.customerIntelligenceData}
        />;

const HeaderPure = BranchUpdateContainer.create(
    ({ repositoryContext, searchCriteriaState, pushesPermissionState }, props) => <div className="vc-pushes-header">
        <div className="vc-pushes-selector-panel">
            {
                pushesPermissionState && pushesPermissionState.isPermissionLoaded &&
                <GitRefDropdownSwitch
                    repositoryContext={repositoryContext}
                    versionSpec={VersionSpecs.VersionSpec.parse(searchCriteriaState.searchCriteria.itemVersion)}
                    onSelectionChanged={props.actionCreator.changeVersionSpec}
                    className={"vc-pushes-versionSelector"}
                    viewMyBranches={pushesPermissionState.viewMyBranches}
                    viewTagsPivot={false}
                />
            }
            <FilterPanelToggleButton
                isFilterPanelVisible={searchCriteriaState.isFilterPanelVisible}
                filterState={searchCriteriaState.isFilterApplied ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED}
                toggleFilterPanel={props.actionCreator.onFilterPanelVisibilityToggled} />
        </div>
        <BranchUpdatesFilter
            initialSearchCriteria={{
                userName: searchCriteriaState.searchCriteria.userName,
                userId: searchCriteriaState.searchCriteria.userId,
                fromDate: searchCriteriaState.searchCriteria.fromDate,
                toDate: searchCriteriaState.searchCriteria.toDate,
                excludeUsers: searchCriteriaState.searchCriteria.excludeUsers,
            }}
            repositoryId={repositoryContext.getRepositoryId()}
            filterUpdatedCallback={props.actionCreator.onFiltersUpdated}
            isFilterPanelVisible={searchCriteriaState.isFilterPanelVisible}
            />
    </div>);

const HubContentPure = BranchUpdateContainer.create(
    ({ branchUpdatesState, repositoryContext, searchCriteriaState }, props) =>

        <div className="content-container-relative">
            {branchUpdatesState.isLoading || (branchUpdatesState.refUpdates && branchUpdatesState.refUpdates.length)
                ? <div>
                    <BranchUpdatesList
                        refUpdates={branchUpdatesState.refUpdates}
                        hasMoreUpdates={branchUpdatesState.hasMoreUpdates}
                        repositoryContext={repositoryContext}
                        searchFilterItemVersion={
                            searchCriteriaState.searchCriteria.itemVersion
                                ? (VersionSpecs.VersionSpec.parse(searchCriteriaState.searchCriteria.itemVersion))
                                : null }
                        onRenderMissingItem={props.actionCreator.fetchMissingItemBranchUpdates}
                        isLoading={branchUpdatesState.isLoading}
                        className="pushes-list"
                        onScenarioComplete={props.actionCreator.onBranchUpdatesScenarioComplete}
                        customerIntelligenceData={props.customerIntelligenceData}/>
                    {branchUpdatesState.isLoading &&
                        <Spinner key={"Spinner"} className={"vc-history-spinner"} label={VCResources.FetchingResultsText} />
                    }
                </div>
                : <EmptyResultPage
                    key={"PushesEmptyResultPage"}
                    title={VCResources.EmptyHistoryResultTitle}
                    message={VCResources.NoPushesFound} />}
        </div>
);
