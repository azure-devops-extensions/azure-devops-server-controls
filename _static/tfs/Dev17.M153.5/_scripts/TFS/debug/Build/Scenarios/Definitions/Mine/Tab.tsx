import React = require("react");
import Q = require("q");

import { DefinitionsViewData } from "Build/Scenarios/Definitions/DefinitionsViewData";
import { TitleBar } from "Build/Scenarios/Definitions/Mine/Components/TitleBar";
import * as MyDefinitions from "Build/Scenarios/Definitions/Mine/ControllerView";
import { MyBuildsSource } from "Build/Scenarios/Definitions/Mine/Sources/MyBuilds";
import * as MyDefinitionsStore from "Build/Scenarios/Definitions/Mine/Stores/MyDefinitions";
import * as Constants from "Build/Scripts/Constants";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { NavigationScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { hasProjectPermission } from "Build/Scripts/Security";
import * as Telemetry from "Build/Scripts/Telemetry";

import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { getPageContext } from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS from "VSS/VSS";
import * as VSS_Events from "VSS/Events/Services";
import * as VSS_Service from "VSS/Service";
import * as UserClaimsService from "VSS/User/Services";
import { WebPageDataService } from "VSS/Contributions/Services";

import ReactDOM = require("react-dom");

SDK_Shim.registerContent("build.definitions.mine", (context) => {
    const projectId: string = getPageContext().webContext.project.id;

    // if a page-load scenario is active, this will retrieve it. otherwise, it will create a new scenario to measure navigation to this tab
    const navigationScenario = startNavigationScenario(NavigationScenarios.MyDefinitions, true);

    // render the title bar
    const hasEditPermission = hasProjectPermission(projectId, BuildPermissions.EditBuildDefinition);
    const canManagePermissions = hasProjectPermission(projectId, BuildPermissions.AdministerBuildPermissions);
    const titleElement = $(Constants.WellKnownClassNames.HubTitleContentSelector);
    const userClaimsService = UserClaimsService.getService();
    const isMember: boolean = userClaimsService.hasClaim(UserClaimsService.UserClaims.Member);
    ReactDOM.render(<TitleBar canCreateNewDefinition={hasEditPermission} canImportDefinition={hasEditPermission} isMember={isMember} />, titleElement[0]);
    navigationScenario.addSplitTiming("rendered title");

    // render the content
    ReactDOM.render(<MyDefinitions.ControllerView />, context.$container[0]);
    navigationScenario.addSplitTiming("rendered Mine tab");

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

interface MyDefinitionsData extends DefinitionsViewData {
    buildIds: number[];
    hasMyBuilds: boolean;
}

var _storesInitialized: boolean = false;
function _ensureStoresInitialized(navigationScenario: NavigationScenario): IPromise<any> {
    if (!_storesInitialized) {
        // only do this once
        _storesInitialized = true;

        navigationScenario.addSplitTiming("initializing MyDefinitions store");

        let contributionService: WebPageDataService = VSS_Service.getService(WebPageDataService);
        let pageData = contributionService.getPageData<MyDefinitionsData>("ms.vss-build-web.build-definitions-hub-mine-tab-data-provider");

        if (pageData) {
            const hasMyBuilds = !!pageData.hasMyBuilds || !!pageData[DataProviderKeys.HasMyBuilds];
            const buildIds: number[] = pageData.buildIds || pageData[DataProviderKeys.BuildIds] || [];

            MyDefinitionsStore.initializeMyDefinitionsStore.invoke(() => {
                return {
                    hasMyBuilds: hasMyBuilds,
                    buildIds: buildIds
                };
            });
        }
        else {
            // initialize via XHR: get my builds or recent builds
            // this assumes that favorite ids are already loaded.
            // the definition store will pull definitions in lazily
            let myBuildsSource = VSS_Service.getCollectionService(MyBuildsSource);
            myBuildsSource.getBuilds(TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id, MyDefinitionsStore.MyDefinitionsStore.DefaultMaxBuilds, 1);
        }

        return MyDefinitionsStore.getMyDefinitionsStore().initialized().fin(() => {
            navigationScenario.addSplitTiming("initialized MyDefinitions store");
        });
    }
    else {
        return Q(null);
    }
}