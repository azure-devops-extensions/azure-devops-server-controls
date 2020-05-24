import React = require("react");
import Q = require("q");

import { IDefinitionSearchPickerOption } from "Build/Scripts/Components/DefinitionSearchPicker";
import { TitleBarControllerView } from "Build/Scenarios/Definition/Components/TitleBarControllerView";
import { DefinitionViewData } from "Build/Scenarios/Definition/DefinitionViewData";
import { historyUpdated } from "Build/Scenarios/Definition/History/Actions/History";
import { HistoryActionCreator } from "Build/Scenarios/Definition/History/Actions/HistoryActionCreator";
import * as DefinitionHistory from "Build/Scenarios/Definition/History/ControllerView";
import { HistorySource } from "Build/Scenarios/Definition/History/Sources/History";
import * as HistoryStore from "Build/Scenarios/Definition/History/Stores/History";
import * as ViewState from "Build/Scenarios/Definition/ViewState";
import { TagActionHub } from "Build/Scripts/Actions/Tags";
import * as Tags from "Build/Scripts/Components/Tags";
import * as Constants from "Build/Scripts/Constants";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { definitionChanged } from "Build/Scripts/HistoryHelper";
import { getDefaultBreadcrumbUrlForDefinition } from "Build/Scripts/Linking";
import { NavigationScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { TagsSource } from "Build/Scripts/Sources/Tags";
import { BuildStore, getBuildStore, initializeBuildStore, buildHistoryEntryTypeInfo } from "Build/Scripts/Stores/Builds";
import { AllTagsStore, SelectedTagsStore } from "Build/Scripts/Stores/Tags";
import * as Telemetry from "Build/Scripts/Telemetry";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { DefinitionStateProperties } from "Build.Common/Scripts/Navigation";

import * as BuildContracts from "TFS/Build/Contracts";

import * as PivotViewActionsHub from "Build/Scripts/PivotViewActionsHub";
import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation from "VSS/Controls/Navigation";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Serialization from "VSS/Serialization";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";
import * as VSS_Events from "VSS/Events/Services";
import { getCollectionService } from "VSS/Service";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import ReactDOM = require("react-dom");

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definition/DefinitionSummaryTags";

let tagsHub: TagActionHub = null;
let allTagsStore: AllTagsStore = null;
let selectedTagsStore: SelectedTagsStore = null;
let historyStore: HistoryStore.Store = null;

SDK_Shim.registerContent("build.definition.history", (context) => {
    // if a page-load scenario is active, this will retrieve it. otherwise, it will create a new scenario to measure navigation to this tab
    let navigationScenario = startNavigationScenario(NavigationScenarios.DefinitionHistory, true);

    navigationScenario.addSplitTiming("begin render definition history tab");

    if (!historyStore) {
        tagsHub = new TagActionHub();
        allTagsStore = new AllTagsStore(tagsHub, Utils_String.localeIgnoreCaseComparer);
        selectedTagsStore = new SelectedTagsStore(tagsHub, null, Utils_String.localeIgnoreCaseComparer);

        // create the history store
        historyStore = new HistoryStore.Store();
    }
    else {
        // refresh
        let definitionId: number = ViewState.getInstance().getDefinitionId();
        let filter = historyStore.getFilter();
        filter.continuationToken = "";

        Service.getCollectionService(HistoryActionCreator).getHistory(definitionId, filter);
    }

    ReactDOM.render(<DefinitionHistory.ControllerView historyStore={historyStore} tagStore={selectedTagsStore} />, context.$container[0]);
    navigationScenario.addSplitTiming("end render definition history tab");

    let initialized = _ensureStoresInitialized(navigationScenario);

    // render the title bar
    navigationScenario.addSplitTiming("begin render title");
    let titleElement = $(Constants.WellKnownClassNames.HubTitleContentSelector);
    ReactDOM.render(<div>
        <TitleBarControllerView
            title={BuildResources.BuildDefinitionsTitle}
            readonly={true}
            telemetrySource={Telemetry.Sources.DefinitionHistory}
            definitionPickerOptionChanged={definitionPickerOptionChanged}
        />
    </div>, titleElement[0]);

    navigationScenario.addSplitTiming("end render title");

    PivotViewActionsHub.getPivotViewActionsHub().UpdatePivotDataElement.invoke({
        tabKey: context.options.tabKey,
        element: <Tags.ControllerView className="tfs-tags build-tags" hub={tagsHub} allTagsStore={allTagsStore} selectedTagsStore={selectedTagsStore} addButtonAriaLabel={BuildResources.FilterByTagHistoryLabel} announceMessageOnKeyDownWithValue={BuildResources.TagAnnounceMessage} />
    });

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

interface DefinitionHistoryData extends DefinitionViewData {
    builds: BuildContracts.Build[];
    continuationToken: string;
}

var _storesInitialized = false;
function _ensureStoresInitialized(navigationScenario: NavigationScenario): IPromise<any> {
    let resultPromise: IPromise<any> = Q(null);

    if (!_storesInitialized) {
        // only do this once
        _storesInitialized = true;

        let definitionId: number = ViewState.getInstance().getDefinitionId();

        let contributionService: Contribution_Services.WebPageDataService = (this._options && this._options.contributionService) ? this._options.contributionService : Service.getService(Contribution_Services.WebPageDataService);
        let pageData = contributionService.getPageData<DefinitionHistoryData>("ms.vss-build-web.build-definition-hub-history-tab-data-provider");

        if (pageData) {
            let builds: BuildContracts.Build[] = Serialization.ContractSerializer.deserialize(pageData.builds || [DataProviderKeys.Builds], BuildContracts.TypeInfo.Build) || [];

            getBuildStore();
            initializeBuildStore.invoke(() => {
                return {
                    allBuilds: builds,
                    buildHistory: Serialization.ContractSerializer.deserialize(pageData[DataProviderKeys.BuildHistory], buildHistoryEntryTypeInfo) || []
                };
            });
            navigationScenario.addSplitTiming("initialized BuildStore");

            historyUpdated.invoke({
                filter: { definitions: definitionId.toString() },
                append: false,
                buildIds: builds.map((build) => build.id),
                continuationToken: pageData.continuationToken || pageData[DataProviderKeys.BuildsContinuationToken]
            });
        }
        else {
            resultPromise = Service.getCollectionService(HistoryActionCreator).getHistory(definitionId)
                .then(() => {
                    navigationScenario.addSplitTiming("end definition history store initialize");
                });
        }

        // load suggested tags. this is not part of the page-load scenario, so it is not included in the timing
        getCollectionService(TagsSource).getTags(tagsHub);
    }

    return resultPromise;
}

function definitionPickerOptionChanged(option: IDefinitionSearchPickerOption, index: number) {
    definitionChanged(option.data);
}