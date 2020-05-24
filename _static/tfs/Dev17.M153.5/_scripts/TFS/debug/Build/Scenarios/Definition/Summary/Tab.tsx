import Q = require("q");
import React = require("react");
import ReactDOM = require("react-dom");

import { TitleBarControllerView } from "Build/Scenarios/Definition/Components/TitleBarControllerView";
import * as Summary from "Build/Scenarios/Definition/Summary/ControllerView";
import * as ViewState from "Build/Scenarios/Definition/ViewState";
import { DefinitionViewData } from "Build/Scenarios/Definition/DefinitionViewData";
import * as Build_Actions from "Build/Scripts/Actions/Actions";
import { getDefinition } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { IDefinitionSearchPickerOption } from "Build/Scripts/Components/DefinitionSearchPicker";
import { UserActions, WellKnownClassNames } from "Build/Scripts/Constants";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { definitionChanged } from "Build/Scripts/HistoryHelper";
import { getDefaultBreadcrumbUrlForDefinition, getDefinitionEditorLink } from "Build/Scripts/Linking";
import { NavigationScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { BuildStore, getBuildStore, initializeBuildStore } from "Build/Scripts/Stores/Builds";
import { getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import Telemetry = require("Build/Scripts/Telemetry");

import { DefinitionStateProperties } from "Build.Common/Scripts/Navigation";

import * as BuildContracts from "TFS/Build/Contracts";

import { WebPageDataService } from "VSS/Contributions/Services";
import { getService as getEventService } from "VSS/Events/Services";
import { registerContent } from "VSS/SDK/Shim";
import { ContractSerializer } from "VSS/Serialization";
import { getService, getCollectionService } from "VSS/Service";

registerContent("build.definition.summary", (context) => {
    // if a page-load scenario is active, this will retrieve it. otherwise, it will create a new scenario to measure navigation to this tab
    let navigationScenario = startNavigationScenario(NavigationScenarios.DefinitionSummary, true);

    let initialized = _ensureStoresInitialized(navigationScenario);

    ReactDOM.render(<Summary.ControllerView />, context.$container[0]);
    navigationScenario.addSplitTiming("rendered Summary tab");

    // render the title bar
    navigationScenario.addSplitTiming("begin render title");
    let titleElement = $(WellKnownClassNames.HubTitleContentSelector);
    ReactDOM.render(<div>
        <TitleBarControllerView
            title={BuildResources.BuildDefinitionsTitle}
            readonly={true}
            telemetrySource={Telemetry.Sources.DefinitionSummary}
            definitionPickerOptionChanged={definitionPickerOptionChanged}
        />
    </div>, titleElement[0]);

    navigationScenario.addSplitTiming("end render title");

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

interface DefinitionSummaryData extends DefinitionViewData {
    builds: BuildContracts.Build[];
}

var _storesInitialized = false;
function _ensureStoresInitialized(navigationScenario: NavigationScenario): IPromise<any> {
    let promise = Q(null);
    if (!_storesInitialized) {
        // only do this once
        _storesInitialized = true;

        let contributionService: WebPageDataService = (this._options && this._options.contributionService) ? this._options.contributionService : getService(WebPageDataService);
        let pageData = contributionService.getPageData<DefinitionSummaryData>("ms.vss-build-web.build-definition-hub-summary-tab-data-provider");

        let definitionStore = getDefinitionStore();

        if (pageData) {
            navigationScenario.addSplitTiming("initializing from page data");

            let definitionId: number = ViewState.getInstance().getDefinitionId();
            let builds: BuildContracts.Build[] = ContractSerializer.deserialize(pageData.builds || [DataProviderKeys.Builds], BuildContracts.TypeInfo.Build) || [];

            getBuildStore();
            initializeBuildStore.invoke(() => {
                return {
                    allBuilds: builds,
                    buildHistory: [{
                        definitionId: definitionId,
                        builds: builds
                    }]
                };
            });
            navigationScenario.addSplitTiming("initialized BuildStore");

            navigationScenario.addSplitTiming("end initialize");
        }
        else {
            // initialize via XHR
            const definitionSource = getCollectionService(DefinitionSource);
            navigationScenario.addSplitTiming("initializing from XHR");

            let deferred = Q.defer();
            promise = deferred.promise;

            let changedListener = () => {
                if (!definitionStore.getDefinition(definitionId).pending) {
                    deferred.resolve(null);
                    definitionStore.removeChangedListener(changedListener);

                    navigationScenario.addSplitTiming("end initialize");
                }
            };
            definitionStore.addChangedListener(changedListener);

            let definitionId: number = ViewState.getInstance().getDefinitionId();
            getDefinition(definitionSource, definitionId);
        }
    }

    return promise;
}

function definitionPickerOptionChanged(option: IDefinitionSearchPickerOption, index: number) {
    definitionChanged(option.data);
}