/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!WorkCustomizationStyles";

import * as React from "react";
import * as VSS from "VSS/VSS";
import * as VSS_Service from "VSS/Service";
import { ExtensionService } from "VSS/Contributions/Services";
import { PivotViewItem } from "Presentation/Scripts/TFS/Components/PivotView";
import { initializeRouter } from "Presentation/Scripts/TFS/Router/ContributionRouter";
import SDK_Shim = require("VSS/SDK/Shim");
import { ProcessNavPage } from "WorkCustomization/Scripts/Common/Components/ProcessNavPage";
import { InheritedProcess } from "WorkCustomization/Scripts/Views/Processes/Components/InheritedProcess";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { getProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { WitWizardActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/WitWizardActions";
import Utils_String = require("VSS/Utils/String");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

import * as CollectionFieldsPivotAsync from "WorkCustomization/Scripts/Views/Fields/Components/CollectionFieldsPivot";
import * as ProcessesPivotAsync from "WorkCustomization/Scripts/Views/Processes/Components/ProcessesPivot";
import * as BacklogsPivotAsync from "WorkCustomization/Scripts/Views/BacklogLevels/Components/BacklogsPivot";
import * as ProjectsPivotAsync from "WorkCustomization/Scripts/Views/Projects/Components/ProjectsPivot";
import * as WorkItemTypesPivotAsync from "WorkCustomization/Scripts/Views/WorkItemTypes/Components/WorkItemTypesPivot";
import * as WorkItemTypeLayoutPivotAsync from "WorkCustomization/Scripts/Views/Layout/Components/WorkItemTypeLayoutPivot";
import * as WorkItemTypeRulesPivotAsync from "WorkCustomization/Scripts/Views/Rules/Components/WorkItemTypeRulesPivot";
import * as WorkItemTypeStatesPivotAsync from "WorkCustomization/Scripts/Views/States/Components/WorkItemTypeStatesPivot";
import { showMessageAction, IMessageActionPayload, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { showCreateInheritedProcessAction } from "WorkCustomization/Scripts/Common/Actions/CreateInheritedProcessMessageBarAction";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { NavigationParameters, NavigationActions } from "WorkCustomization/Scripts/Constants";
import * as NavigationServices from "VSS/Navigation/Services";
import { getWorkItemTypesStore, WorkItemTypesStore } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { WorkCustomizationPageContext } from "WorkCustomization/Scripts/WorkCustomizationPageContext";

let _historyService = NavigationServices.getHistoryService();
let _previousHistoryState: any = null; // could be more elegantly done via hub request handling via custom router initialization

const AsyncBacklogsPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/BacklogLevels/Components/BacklogsPivot"],
    (m: typeof BacklogsPivotAsync) => m.BacklogsPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncProjectsPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/Projects/Components/ProjectsPivot"],
    (m: typeof ProjectsPivotAsync) => m.ProjectsPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncWorkItemTypesPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/WorkItemTypes/Components/WorkItemTypesPivot"],
    (m: typeof WorkItemTypesPivotAsync) => m.WorkItemTypesPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncWorkItemTypeLayoutPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/Layout/Components/WorkItemTypeLayoutPivot"],
    (m: typeof WorkItemTypeLayoutPivotAsync) => m.WorkItemTypeLayoutPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncWorkItemTypeRulesPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/Rules/Components/WorkItemTypeRulesPivot"],
    (m: typeof WorkItemTypeRulesPivotAsync) => m.WorkItemTypeRulesPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncWorkItemTypeStatesPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/States/Components/WorkItemTypeStatesPivot"],
    (m: typeof WorkItemTypeStatesPivotAsync) => m.WorkItemTypeStatesPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncProcessesPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/Processes/Components/ProcessesPivot"],
    (m: typeof ProcessesPivotAsync) => m.ProcessesPivot,
    () => <Spinner type={SpinnerType.large} />);

const AsyncCollectionFieldsPivot = getAsyncLoadedComponent(
    ["WorkCustomization/Scripts/Views/Fields/Components/CollectionFieldsPivot"],
    (m: typeof CollectionFieldsPivotAsync) => m.CollectionFieldsPivot,
    () => <Spinner type={SpinnerType.large} />);

SDK_Shim.registerContent("routerInit", (context: SDK_Shim.InternalContentContextData) => {
    // setting pageContext of type IVssPageContext so that it can be consumed by new web platform components
    WorkCustomizationPageContext.setPageContext(context.options.pageContext);
    initializeRouter(context.container, undefined, "ms.vss-work-web.work-customization-hub");
});

SDK_Shim.registerContent("createinheritedprocess", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(
        <div>
            <InheritedProcess />
        </div>
    );
});

SDK_Shim.registerContent("all", (context: SDK_Shim.InternalContentContextData) => {
    // check if we need to fast forward
    if (UrlUtils.getParameterValue(NavigationParameters.LaunchWizard)) {

        let wizardProcId: string = UrlUtils.getParameterValue(NavigationParameters.WizardProcessId);
        let proc: IProcess = getProcessesDataStore().getProcessById(wizardProcId);
        if (getProcessesDataStore().getAllProcesses().
            filter(p => p.isInheritedTemplate && p.parentTemplateTypeId === proc.templateTypeId).length === 0) {
            // If there are no customized process for this system process type, simply go ahead and create and migrate for them
            return _registerContent(<InheritedProcess />);
        }
    }

    return getNavPageForTabGroup("ms.vss-work-web.allprocesses-hub-tab-group", () => {
        WitWizardActionCreator.tryLaunchWizard();
    });
});

SDK_Shim.registerContent("all.tab.processes", (context: SDK_Shim.InternalContentContextData) => {
    let initialSelectedProcessName: string = null;
    if (_previousHistoryState != null) {
        initialSelectedProcessName = _previousHistoryState[NavigationParameters.ProcessName];
    }

    return _registerContent(<AsyncProcessesPivot initialSelectedProcessName={initialSelectedProcessName} />);
});

SDK_Shim.registerContent("all.tab.fields", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(<AsyncCollectionFieldsPivot />);
});

SDK_Shim.registerContent("process", (context: SDK_Shim.InternalContentContextData) => {
    return getNavPageForTabGroup("ms.vss-work-web.process-hub-tab-group", () => {
        let processName: string = UrlUtils.getCurrentProcessNameFromUrl();
        let process: IProcess = getProcessesDataStore().getProcessByName(processName);

        // Process either system or phase1
        if (process.isSystemTemplate) {
           showCreateInheritedProcessAction.invoke(process);
        }

        else if (!process.isInheritedTemplate) {
            let message: string = Utils_String.format(Resources.XMLProcessCannotEditMessage, UrlUtils.getAllProcessUrl());

            showMessageAction.invoke({ message: message, isDangerousHTML: true } as IMessageActionPayload);
        }
    });
});

SDK_Shim.registerContent("process.tab.workitemtypes", (context: SDK_Shim.InternalContentContextData) => {
    let initialSelectedWorkItemTypeId: string = null;
    if (_previousHistoryState != null) {
        initialSelectedWorkItemTypeId = _previousHistoryState[NavigationParameters.WorkItemTypeId];
    }
    return _registerContent(<AsyncWorkItemTypesPivot initialSelectedWorkItemTypeId={initialSelectedWorkItemTypeId} />);
});

SDK_Shim.registerContent("process.tab.backlogs", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(<AsyncBacklogsPivot />);
});

SDK_Shim.registerContent("process.tab.projects", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(<AsyncProjectsPivot />);
});

SDK_Shim.registerContent("workitemtype", (context: SDK_Shim.InternalContentContextData) => {
    return getNavPageForTabGroup("ms.vss-work-web.workitemtype-hub-tab-group");
});

SDK_Shim.registerContent("workitemtype.tab.layout", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(<AsyncWorkItemTypeLayoutPivot />);
});

SDK_Shim.registerContent("workitemtype.tab.states", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(<AsyncWorkItemTypeStatesPivot />);
});

SDK_Shim.registerContent("workitemtype.tab.rules", (context: SDK_Shim.InternalContentContextData) => {
    return _registerContent(<AsyncWorkItemTypeRulesPivot />);
});

function _registerContent(content: JSX.Element): JSX.Element {
    clearErrorAction.invoke(null);
    _previousHistoryState = _historyService.getCurrentState();
    resolveProcessIdInUrl();
    return content;
}

export function getNavPageForTabGroup(tabGroupContributionId: string, onPageLoad?: () => void): IPromise<JSX.Element> {
    const contributionService = VSS_Service.getService(ExtensionService);
    return contributionService.getContributionsForTarget(tabGroupContributionId, "ms.vss-web.tab")
        .then((contributions: Contribution[]) => {
            let store: WorkItemTypesStore = getWorkItemTypesStore();
            let currentProcess: IProcess = store.getCurrentProcess();

            if (currentProcess && !currentProcess.isInheritedTemplate) {
                if (currentProcess.isSystemTemplate) {
                    contributions = contributions.filter((value: Contribution) => {
                        return value.properties.action !== NavigationActions.WorkItemTypeRules
                    });
                }
                else { // Hosted XML template
                    contributions = contributions.filter((value: Contribution) => {
                        return value.properties.action !== NavigationActions.WorkItemTypeRules
                            && value.properties.action !== NavigationActions.ProcessBacklogLevels
                    });
                }
            }

            let onClick = (ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
                UrlUtils.checkRunningDocumentsTable(ev.nativeEvent);
            };

            const items = contributions.map((contribution: Contribution, index: number) => {
                return {
                    tabKey: contribution.properties.action,
                    title: contribution.properties.name,
                    contribution: contribution,
                    onClick: onClick
                } as PivotViewItem;
            });

            return <ProcessNavPage items={items} onPageLoad={onPageLoad} />;
        });
}

export function resolveProcessIdInUrl(): void {

    let procId: string = UrlUtils.getParameterValue(NavigationParameters.ProcessId);
    let wizardProcId: string = UrlUtils.getParameterValue(NavigationParameters.WizardProcessId);

    if (procId) {
        let proc: IProcess = getProcessesDataStore().getProcessById(procId);
        if (proc) {
            UrlUtils.addParam(NavigationParameters.ProcessName, proc.name);
            UrlUtils.removeParams([NavigationParameters.ProcessId]);
        }
    }

    if (wizardProcId) {
        let proc: IProcess = getProcessesDataStore().getProcessById(wizardProcId);
        if (proc) {
            UrlUtils.addParam(NavigationParameters.WizardProcessName, proc.name);
            UrlUtils.removeParams([NavigationParameters.WizardProcessId]);
        }
    }
}