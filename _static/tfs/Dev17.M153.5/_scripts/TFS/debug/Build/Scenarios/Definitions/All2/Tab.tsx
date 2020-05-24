import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Q from "q";

import { allDefinitionsUpdated } from "Build/Scenarios/Definitions/All2/Actions/AllDefinitions";
import { AllDefinitionsActionCreator } from "Build/Scenarios/Definitions/All2/Actions/AllDefinitionsActionCreator";
import { TitleBar } from "Build/Scenarios/Definitions/All2/Components/TitleBar";
import * as AllDefinitions from "Build/Scenarios/Definitions/All2/ControllerView";
import * as AllDefinitionsStore from "Build/Scenarios/Definitions/All2/Stores/AllDefinitions";
import { DefinitionsViewData } from "Build/Scenarios/Definitions/DefinitionsViewData";
import * as Constants from "Build/Scripts/Constants";
import { sanitizePath } from "Build/Scripts/Folders";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { NavigationScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as PivotViewActionsHub from "Build/Scripts/PivotViewActionsHub";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { FolderSource } from "Build/Scripts/Sources/Folders";
import * as FoldersStore_NO_REQUIRE from "Build/Scripts/Stores/Folders";

import { GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { RootPath } from "Build.Common/Scripts/Security";

import * as PivotFilter from "Presentation/Scripts/TFS/Components/PivotFilter";
import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";

import * as BuildContracts from "TFS/Build/Contracts";

import { getPageContext } from "VSS/Context";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation_Controls from "VSS/Controls/Navigation";
import * as VSS_Events from "VSS/Events/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Serialization from "VSS/Serialization";
import * as VSS_Service from "VSS/Service";
import * as UserClaimsService from "VSS/User/Services";
import * as VSS from "VSS/VSS";

interface AllDefinitionsData extends DefinitionsViewData {
    allDefinitionIds: number[];
    folders: BuildContracts.Folder[];
    continuationToken: string;
}

SDK_Shim.registerContent("build.definitions.all2", (context) => {
    // if a page-load scenario is active, this will retrieve it. otherwise, it will create a new scenario to measure navigation to this tab
    const navigationScenario = startNavigationScenario(NavigationScenarios.AllDefinitions2, true);

    const projectId: string = getPageContext().webContext.project.id;

    // render the title bar
    const titleElement = $(Constants.WellKnownClassNames.HubTitleContentSelector);
    const userClaimsService = UserClaimsService.getService();
    const isMember: boolean = userClaimsService.hasClaim(UserClaimsService.UserClaims.Member);
    ReactDOM.render(<TitleBar isMember={isMember}/>, titleElement[0]);
    navigationScenario.addSplitTiming("end render title");

    // render the content
    ReactDOM.render(<AllDefinitions.ControllerView />, context.$container[0]);
    navigationScenario.addSplitTiming("rendered AllDefinitions tab");

    const tabProps: PivotView.ContributionTabProps = context.options;
    const initialized = ensureStoresInitialized(navigationScenario, RootPath, tabProps.tabKey);

    // return something that can be disposed
    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.$container[0]);
            ReactDOM.unmountComponentAtNode(titleElement[0]);
            $(context.$container[0]).remove();
        }
    };

    return disposable;
});

let _storesInitialized: boolean = false;
export function ensureStoresInitialized(navigationScenario: NavigationScenario, path: string, tabKey: string): IPromise<{}> {
    const deferred = Q.defer();

    if (!_storesInitialized) {
        // only do this once
        _storesInitialized = true;

        const builtFilter: PivotFilter.Props = {
            name: Constants.WellKnownViewFilters.AllDefinitionsViewBuiltFilter,
            key: Constants.WellKnownViewFilters.AllDefinitionsViewBuiltFilter,
            title: BuildResources.BuiltText,
            useBowtieStyle: true,
            changedHandler: (item: Navigation_Controls.IPivotFilterItem) => {
                if (item) {
                    VSS_Events.getService().fire(Constants.UserActions.ApplyBuiltFilter, this, item.value);
                }
            },
            items: [
                {
                    title: BuildResources.AnyTimeText,
                    text: BuildResources.AnyTimeText,
                    setTitleOnlyOnOverflow: true,
                    value: Constants.WellKnownBuiltFilterValues.AnyTime,
                    id: Constants.WellKnownBuiltFilterValues.AnyTime,
                    selected: true
                },
                {
                    title: BuildResources.TodayText,
                    text: BuildResources.TodayText,
                    setTitleOnlyOnOverflow: true,
                    value: Constants.WellKnownBuiltFilterValues.Today,
                    id: Constants.WellKnownBuiltFilterValues.Today,
                },
                {
                    title: BuildResources.YesterdayText,
                    text: BuildResources.YesterdayText,
                    setTitleOnlyOnOverflow: true,
                    value: Constants.WellKnownBuiltFilterValues.Yesterday,
                    id: Constants.WellKnownBuiltFilterValues.Yesterday,
                },
                {
                    title: BuildResources.Last7DaysText,
                    text: BuildResources.Last7DaysText,
                    value: Constants.WellKnownBuiltFilterValues.Last7Days,
                    id: Constants.WellKnownBuiltFilterValues.Last7Days
                },
                {
                    title: BuildResources.Last30DaysText,
                    text: BuildResources.Last30DaysText,
                    setTitleOnlyOnOverflow: true,
                    value: Constants.WellKnownBuiltFilterValues.Last30Days,
                    id: Constants.WellKnownBuiltFilterValues.Last30Days
                },
                { separator: true },
                {
                    title: BuildResources.NotInLast7daysText,
                    text: BuildResources.NotInLast7daysText,
                    value: Constants.WellKnownBuiltFilterValues.NotInLast7Days,
                    id: Constants.WellKnownBuiltFilterValues.NotInLast7Days
                },
                {
                    title: BuildResources.NotInLast30daysText,
                    text: BuildResources.NotInLast30daysText,
                    setTitleOnlyOnOverflow: true,
                    value: Constants.WellKnownBuiltFilterValues.NotInLast30Days,
                    id: Constants.WellKnownBuiltFilterValues.NotInLast30Days
                },
                {
                    title: BuildResources.NeverText,
                    text: BuildResources.NeverText,
                    setTitleOnlyOnOverflow: true,
                    value: Constants.WellKnownBuiltFilterValues.Never,
                    id: Constants.WellKnownBuiltFilterValues.Never
                }
            ]
        };

        PivotViewActionsHub.getPivotViewActionsHub().UpdatePivotItems.invoke({
            tabKey: tabKey,
            items: [builtFilter]
        });

        const contributionService = VSS_Service.getService(Contribution_Services.WebPageDataService);
        const pageData = contributionService.getPageData<AllDefinitionsData>("ms.vss-build-web.build-definitions-hub-alldefinitions2-tab-data-provider");

        const initPromises: IPromise<{}>[] = [];

        // folders
        initPromises.push(VSS.requireModules(["Build/Scripts/Stores/Folders"])
            .then((imports: any[]) => {
                const foldersStore: typeof FoldersStore_NO_REQUIRE = imports[0];

                foldersStore.getFolderStore();

                let folders: BuildContracts.Folder[] = [];
                if (pageData) {
                    navigationScenario.addSplitTiming("initializing Folders store from page data");
                    folders = Serialization.ContractSerializer.deserialize(pageData.folders || pageData[DataProviderKeys.Folders], BuildContracts.TypeInfo.Folder) || [];

                    foldersStore.initializeFolderStore.invoke({
                        folders: folders
                    });
                    navigationScenario.addSplitTiming("initialized Folders store from page data");
                }
                else {
                    const folderSource = VSS_Service.getCollectionService(FolderSource);
                    return folderSource.getFolders();
                }
            }));

        // AllDefinitions
        const allDefinitionStore = AllDefinitionsStore.getStore();
        const sanitizedPath = sanitizePath(path);

        if (pageData) {
            navigationScenario.addSplitTiming("initializing AllDefinitions store from page data");
            const filter: GetDefinitionsOptions = {
                queryOrder: BuildContracts.DefinitionQueryOrder.DefinitionNameAscending,
                $top: Constants.DefaultClientPageSizeMax,
                path: sanitizedPath
            };

            allDefinitionsUpdated.invoke({
                append: false,
                definitionIds: pageData.allDefinitionIds || pageData[DataProviderKeys.AllDefinitionIds],
                continuationToken: pageData.continuationToken || pageData[DataProviderKeys.DefinitionsContinuationToken],
                filter: filter
            });
            navigationScenario.addSplitTiming("initialized AllDefinitions store from page data");
        }
        else {
            const filter: GetDefinitionsOptions = {
                path: sanitizedPath
            };
            initPromises.push(VSS_Service.getCollectionService(AllDefinitionsActionCreator).getAllDefinitions(filter));
        }

        Q.all(initPromises)
            .then(() => {
                deferred.resolve(null);
            });
    }
    else {
        deferred.resolve(null);
    }

    return deferred.promise;
}

export function resetStoreInitialization() {
    _storesInitialized = false;
}
