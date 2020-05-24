import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefinitionsViewData } from "Build/Scenarios/Definitions/DefinitionsViewData";
import { queuedDefinitionBuildsUpdated } from "Build/Scenarios/Definitions/Queued/Actions/QueuedDefinitions";
import { QueuedDefinitionsActionCreator } from "Build/Scenarios/Definitions/Queued/Actions/QueuedDefinitionsActionCreator";
import { ControllerView } from "Build/Scenarios/Definitions/Queued/ControllerView";
import { TitleBar } from "Build/Scenarios/Definitions/Queued/Components/TitleBar";
import { getStore as getQueuedDefinitionsStore } from "Build/Scenarios/Definitions/Queued/Stores/QueuedDefinitions";
import { UserActions, WellKnownClassNames } from "Build/Scripts/Constants";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { NavigationScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { hasProjectPermission } from "Build/Scripts/Security";

import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as BuildContracts from "TFS/Build/Contracts";

import { getPageContext } from "VSS/Context";
import { registerContent } from "VSS/SDK/Shim";
import { ContractSerializer } from "VSS/Serialization";
import { getCollectionService, getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as UserClaimsService from "VSS/User/Services";

registerContent("build.definitions.queued", (context) => {
    // if a page-load scenario is active, this will retrieve it. otherwise, it will create a new scenario to measure navigation to this tab
    const navigationScenario = startNavigationScenario(NavigationScenarios.Queued, true);

    const projectId: string = getPageContext().webContext.project.id;

    const hasEditPermission = hasProjectPermission(projectId, BuildPermissions.EditBuildDefinition);
    const canManagePermissions = hasProjectPermission(projectId, BuildPermissions.AdministerBuildPermissions);

    // render the title bar
    const titleElement = $(WellKnownClassNames.HubTitleContentSelector);
    const userClaimsService = UserClaimsService.getService();
    const isMember: boolean = userClaimsService.hasClaim(UserClaimsService.UserClaims.Member);
    ReactDOM.render(<TitleBar canCreateNewDefinition={hasEditPermission} isMember={isMember} />, titleElement[0]);
    navigationScenario.addSplitTiming("rendered title");

    // render the content
    ReactDOM.render(<ControllerView isMember={isMember}/>, context.$container[0]);
    navigationScenario.addSplitTiming("rendered Queued tab");

    const initialized = _ensureStoresInitialized(navigationScenario);

    // return something that can be disposed
    const disposable = {
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

function _ensureStoresInitialized(navigationScenario: NavigationScenario): IPromise<any> {
    var deferred = Q.defer();

    let contributionService: WebPageDataService = getService(WebPageDataService);
    let pageData = contributionService.getPageData<DefinitionsViewData>("ms.vss-build-web.build-definitions-hub-queued-tab-data-provider");
    let store = getQueuedDefinitionsStore();

    if (!pageData) {
        navigationScenario.addSplitTiming("initializing QueuedDefinitions store");

        getCollectionService(QueuedDefinitionsActionCreator).getBuilds().then(() => {
            navigationScenario.addSplitTiming("initialized QueuedDefinitions store");
            deferred.resolve(null);
        });
    }
    else {
        // already initialized from dataprovider
        let builds: BuildContracts.Build[] = ContractSerializer.deserialize(pageData.builds || pageData[DataProviderKeys.Builds], BuildContracts.TypeInfo.Build) || [];
        queuedDefinitionBuildsUpdated.invoke({
            buildIds: builds.map((build) => build.id)
        });
        deferred.resolve(null);
    }

    return deferred.promise;
}