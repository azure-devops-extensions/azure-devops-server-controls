import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { AllBuildsActionCreator, getAllBuildsActionCreator } from "Build/Scenarios/Definitions/AllBuilds/Actions/AllBuildsActionCreator";
import { getAllBuildsActionHub } from "Build/Scenarios/Definitions/AllBuilds/Actions/AllBuilds";
import {
    IFilterData,
    getCurrentBuildStatus,
    BuildOrder,
    getBuildQueryOrder,
    getCurrentDefinitionId
} from "Build/Scenarios/Definitions/AllBuilds/Common";
import { TitleBar } from "Build/Scenarios/Definitions/AllBuilds/Components/TitleBar";
import { ControllerView } from "Build/Scenarios/Definitions/AllBuilds/ControllerView";
import { getAllBuildsStore } from "Build/Scenarios/Definitions/AllBuilds/Stores/AllBuilds";
import { DefinitionsViewData } from "Build/Scenarios/Definitions/DefinitionsViewData";
import { definitionsUpdated } from "Build/Scripts/Actions/Definitions";
import { UserActions, WellKnownClassNames } from "Build/Scripts/Constants";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { NavigationScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { Build, BuildDefinition, TypeInfo } from "TFS/Build/Contracts";

import { registerContent } from "VSS/SDK/Shim";
import { getService as getEventsService } from "VSS/Events/Services";
import { ContractSerializer } from "VSS/Serialization";
import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";

registerContent("build.definitions.allbuilds", (context) => {
    // if a page-load scenario is active, this will retrieve it. otherwise, it will create a new scenario to measure navigation to this tab
    let navigationScenario = startNavigationScenario(NavigationScenarios.AllBuilds, true);

    // render the title bar
    let titleElement = $(WellKnownClassNames.HubTitleContentSelector);
    ReactDOM.render(<TitleBar />, titleElement[0]);
    navigationScenario.addSplitTiming("rendered title");

    // render the content
    ReactDOM.render(<ControllerView />, context.$container[0]);
    navigationScenario.addSplitTiming("rendered All Builds tab");

    let initialized = _ensureStoresInitialized(navigationScenario);

    // return something that can be disposed
    let disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.$container[0]);
            ReactDOM.unmountComponentAtNode(titleElement[0]);
            $(context.$container[0]).remove();
        }
    };

    initialized.then(() => {
        navigationScenario.end();
    });

    return disposable;
});

interface AllBuildsData extends DefinitionsViewData {
    continuationToken: string;
}

function _ensureStoresInitialized(navigationScenario: NavigationScenario): IPromise<any> {
    var deferred = Q.defer();

    const contributionService: WebPageDataService = getService(WebPageDataService);
    const pageData = contributionService.getPageData<AllBuildsData>("ms.vss-build-web.build-definitions-hub-allbuilds-tab-data-provider");
    const store = getAllBuildsStore();
    const filter = getFilterData();

    if (!pageData) {
        navigationScenario.addSplitTiming("initializing AllBuilds store");

        // This usually happens in tab-switch scenarios
        // Make rest call to get builds
        getAllBuildsActionCreator().getBuilds(filter).then(() => {
            navigationScenario.addSplitTiming("initialized AllBuilds store");
            deferred.resolve(null);
        });
        // We usually don't need to make any get definition calls to determine if the project has any definitions or not, since in tab-switch we should have been already initialized
        // If the definition is coming from navigation state then the search picker will get the definition from definition store
    }
    else {
        // Builds initialized from data provider
        // Update continuation token
        filter.continuationToken = pageData.continuationToken || pageData[DataProviderKeys.BuildsContinuationToken];

        const builds: Build[] = ContractSerializer.deserialize(pageData.builds || [DataProviderKeys.Builds], TypeInfo.Build) || [];
        getAllBuildsActionHub().allBuildsUpdated.invoke({
            buildIds: builds.map((build) => build.id),
            filter: filter
        });

        const definitions: BuildDefinition[] = ContractSerializer.deserialize(pageData.definitions || pageData[DataProviderKeys.Definitions], TypeInfo.BuildDefinition) || [];
        let definitionMap: IDictionaryNumberTo<BuildDefinition> = {};
        definitions.forEach((definition) => {
            definitionMap[definition.id] = definition;
        });
        definitionsUpdated.invoke({
            definitions: definitionMap
        });

        deferred.resolve(null);
    }

    return deferred.promise;
}

function getFilterData(): IFilterData {
    const buildStatus = getCurrentBuildStatus();
    return {
        status: buildStatus,
        // we don't propagate query order to navigation state, so by default it would be descending
        order: getBuildQueryOrder(buildStatus, BuildOrder.Descending),
        definitionId: getCurrentDefinitionId()
    };
}