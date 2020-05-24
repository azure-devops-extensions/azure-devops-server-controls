
import Q = require("q");
import Controls = require("VSS/Controls");
import CoreContracts = require("TFS/Core/Contracts");
import CoreRestClient = require("TFS/Core/RestClient");
import VSS = require("VSS/VSS");
import SDK_Shim = require("VSS/SDK/Shim");
import * as Service from "VSS/Service";
import Utils_String = require("VSS/Utils/String");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

let _workitemStore: WITOM.WorkItemStore = null;

(function () {

    let messageArea: MessageArea.MessageAreaView;
    let messageAreaViewModel: MessageArea.MessageAreaViewModel = new MessageArea.MessageAreaViewModel();
    let $div = $("<div />").addClass("error-message-holder");
    messageArea = <MessageArea.MessageAreaView>Controls.BaseControl.enhance(MessageArea.MessageAreaView, $div, {
        viewModel: messageAreaViewModel
    });
    $div.insertBefore($(".hub-content")[0]);

    let exploreWorkItemMenu = {
        execute: function (actionContext) {

            let workItemId: number = getWorkItemId(actionContext);

            if (workItemId !== -1) {
                if ($(".ui-dialog-titlebar-progress-element").length !== 0) {
                    $(".ui-dialog-titlebar-progress-element").show();
                } else {
                    $(".hub-progress").show();
                }
                XTUtils.doExploratoryTesting(workItemId, (message) => {
                    if ($(".ui-dialog-titlebar-progress-element").length !== 0) {
                        $(".ui-dialog-titlebar-progress-element").hide();
                    } else {
                        $(".hub-progress").hide();
                    }
                    messageAreaViewModel.logInfoJQuery($("<span class='bowtie-icon  bowtie-status-info' style='margin-right: 5px;'></span><span>" + message + "</span>"));
                }, (error) => {
                    $(".hub-progress").hide();
                    alert(VSS.getErrorMessage(error));
                });
            }

        }, // end execute
        getMenuItems: function (actionContext): IContributedMenuItem[] | IPromise<IContributedMenuItem[]> {
            let menuItems: IContributedMenuItem[] = [
                {
                    text: Resources.ExploreUsingXTText,
                    title: Resources.ExploreUsingXTToolTip,
                    icon: "css://bowtie-icon bowtie-test-explore-fill",
                    groupId: XTUtility.xtMenuItemGroupId,
                    id: "explore-work-item",
                    hidden: true
                }
            ];

            validateToShowContextMenu(actionContext, menuItems[0])
                .then((show: boolean) => {
                    if (show) {
                        menuItems[0].hidden = false;
                    }
                    actionContext.updateMenuItems(menuItems);
                });

            return menuItems;


        }
    };

    // Fullqualified path for explore work item menu
    SDK_Shim.VSS.register("ms.vss-test-web.explore-work-item", exploreWorkItemMenu);
} ());

function validateToShowContextMenu(actionContext, menuItem): IPromise<boolean> {

    let traceabilityEnabled: boolean = false;
    let xtExtensionNotEnabledOrInstalled: boolean = false;
    let deferred: Q.Deferred<boolean> = Q.defer<boolean>();

    if (!traceabilityEnabled) {
        if (!xtExtensionNotEnabledOrInstalled) {
            window.postMessage({ type: XTUtility.verificationType }, "*");
            window.addEventListener("message", function (event) {
                if (event.data && event.data.type && (event.data.type === XTUtility.xtEnabledType)) {
                    traceabilityEnabled = true;
                    setVisibiltyOfXtMenuItem(actionContext, menuItem).then((show: boolean) => {
                        deferred.resolve(show);
                    });
                }
            }, false);

            setTimeout(function () {
                xtExtensionNotEnabledOrInstalled = true;
                deferred.resolve(false);
            }, XTUtility.timeout);
        } else {
            return Q(false);
        }
    } else {
        setVisibiltyOfXtMenuItem(actionContext, menuItem).then((show: boolean) => {
            deferred.resolve(show);
        });
    }

    return deferred.promise;
}

function setVisibiltyOfXtMenuItem(actionContext, menuItem): IPromise<boolean> {
    let workItemTypeName: string;
    let workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    let manager = WorkItemManager.get(workItemStore);

    let workItemId: number = getWorkItemId(actionContext);
    if (workItemId !== -1) {
        let deferred: Q.Deferred<any> = Q.defer<any>();
        doesWISupportWebXT(workItemId).
            then((show: boolean) => {
                deferred.resolve(show);
            });

        return deferred.promise;
    }
    else {
        return Q(false);
    }
}

function getWorkItemId(actionContext): number {

    let workItemId: number;

    // for test suite
    if (actionContext.suite && actionContext.suite.requirementId) {
        workItemId = actionContext.suite.requirementId;
    }
    // for test case and not allowed for multiple selection
    else if (actionContext[0] && actionContext[0].testCaseId && actionContext[1] === undefined) {
        workItemId = actionContext[0].testCaseId;
         }
    // for backlog workitem
    else if (actionContext.workItemIds && actionContext.workItemIds.length === 1) {
        workItemId = actionContext.workItemIds[0];
    }
    // for workitem results queries
    else if (actionContext.ids && actionContext.ids.length === 1) {
        workItemId = actionContext.ids[0];
    }
    // for work item tile
    else if (actionContext.id) {
        workItemId = actionContext.id;
    }
    // for open wit form
    else if (actionContext.workItemId) {
        workItemId = actionContext.workItemId;
    } else {
        workItemId = -1;
    }

    return workItemId;
}

// TODO: needs to do refactoring as same verification code used other places as well
export function doesWISupportWebXT(workItemId: number): IPromise<boolean> {
    let deferred: Q.Deferred<boolean> = Q.defer<boolean>();
    let workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    let manager = WorkItemManager.get(workItemStore);
    manager.beginGetWorkItem(workItemId, (workItem) => {
        let workItemType = workItem.workItemType.name;

        workItemStore.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId, (project: WITOM.Project) => {
            project.beginGetWorkItemCategories((categories) => {
                let found = false;
                $.each(categories, (index, category) => {
                    switch (category.referenceName) {

                        case WorkItemCategories.TestSuiteCategory:
                            if (isWorkItemAvailableInCategory(category, workItemType) &&
                                workItem &&
                                workItem.getFieldValue("Microsoft.VSTS.TCM.TestSuiteTypeId") === TestSuiteTypeId.RequirementBasedSuiteTypeId) {
                                found = true;

                            }
                            break;
                        case WorkItemCategories.RequirementCategory:
                        case WorkItemCategories.FeatureCategory:
                        case WorkItemCategories.EpicCategory:
                        case WorkItemCategories.TestCaseCategory:
                        case WorkItemCategories.ScenarioCategory:
                            if (isWorkItemAvailableInCategory(category, workItemType)) {
                                found = true;
                            }
                            break;
                    }
                });
                deferred.resolve(found);
            }, (error) => {
                deferred.resolve(false);
            });
        }, (error) => {
            deferred.resolve(false);
        });
    }, (error) => {
        deferred.resolve(false);
    }, false, null, /* Ensure we load extension fields */ true);

    return deferred.promise;
}

function isWorkItemAvailableInCategory(category, workItemType): boolean {

    if (category.workItemTypeNames.indexOf(workItemType) > -1) {
        return true;
    }
    else {
        return false;
    }
}

// These vales are used in XT code as well
// So whenever you make changes here make sure to change in XT code as well.
export class XTUtility {
    public static verificationType: string = "xtPage-traceability-c07e08f5-c27c-4025-868c-e4ddc3947767";
    public static xtEnabledType: string = "xtPage-traceability-enabled";
    public static workItemType: string = "xtPage-traceability-workItem";
    public static workitemUrlSuffix: string = "/_workitems#_a=edit&id=";
    public static timeout: number = 2000;  //in ms
    public static xtMenuItemGroupId: string = "externalTools";
}

export class XTUtils {

    public static defaultTeam: string;

    public static doExploratoryTesting(workItemId: number, callBack: IResultCallback, errorCallBack?: IErrorCallback) {
        let isTraceabilityEnabled: Boolean = false;
        window.postMessage({ type: XTUtility.verificationType }, "*");
        window.addEventListener("message", function (event) {
            if (event.data.type && (event.data.type === XTUtility.xtEnabledType)) {
                isTraceabilityEnabled = true;
            }
        }, false);
        setTimeout(function () {
            if (isTraceabilityEnabled) {
                XTUtils.sendWorkItemForExlporatoryTesting(workItemId, (workItemType) => {
                    callBack(Utils_String.format(Resources.TraceabilityOnWorkitemEnabled, "icon bowtie-icon bowtie-test-explore-fill", workItemType, workItemId));
                }, (error) => {
                    if (errorCallBack) {
                        errorCallBack(error);
                    }
                });
            } else {
                callBack(Resources.WebXTExntesionInstallRequired);
            }
        }, XTUtility.timeout);
    }

    public static sendWorkItemForExlporatoryTesting(workItemId: number, callBack: IResultCallback, errorCallBack?: IErrorCallback) {
        WorkItemManager.get(XTUtils.getWorkItemStore()).beginGetWorkItem(workItemId, (workItem) => {
            let workItemObject = {};

            let fields = {};
            fields[WorkItemField.id] = workItemId;
            fields[WorkItemField.workItemType] = workItem.workItemType.name;
            fields[WorkItemField.title] = workItem.getFieldValue("System.Title");
            fields[WorkItemField.iterationPath] = workItem.getFieldValue("System.IterationPath");
            fields[WorkItemField.assignedTo] = workItem.getFieldValue("System.AssignedTo");
            fields[WorkItemField.acceptanceCriteria] = workItem.getFieldValue("Microsoft.VSTS.Common.AcceptanceCriteria");
            fields[WorkItemField.description] = workItem.getFieldValue("System.Description");
            fields[WorkItemField.areaPath] = workItem.getFieldValue("System.AreaPath");
            workItemObject[WorkItemField.fields] = fields;

            workItemObject[WorkItemField.url] = XTUtils.generateWorkItemUrl(workItemId.toString());

            this.getDefaultTeam().then(() => {
                window.postMessage({ type: XTUtility.workItemType, workItem: workItemObject, tfsTeamPath: XTUtils.getTfsTeamPath() }, "*");
                callBack(workItem.workItemType.name);
            }, (error) => {
                    if(errorCallBack) {
                        errorCallBack(error);
                    }
            });

        }, (error) => {
            if (errorCallBack) {
                errorCallBack(error);
            }
        }, false, null, /* Ensure we load extension fields */ true);
    }

    public static getDefaultTeam(): IPromise<void>{
        return new Promise((resolve, reject) => {
            if (this.defaultTeam) {
                return resolve();
            } else {
                const projectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
                Service.getClient(CoreRestClient.CoreHttpClient).getProject(projectId).then((project: CoreContracts.TeamProject) => {
                    this.defaultTeam = project.defaultTeam.name;
                    return resolve();
                }, (error) => {
                    reject(error);
                });
            }
        });
    }

    public static generateWorkItemUrl(workItemId: string): string {
        let collectionUrl = TFS_Host_TfsContext.TfsContext.getDefault().navigation.collection.uri;
        let project = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
        let workItemUrl = collectionUrl.concat(project).concat(XTUtility.workitemUrlSuffix).concat(workItemId);

        return workItemUrl;
    }

    public static getTfsTeamPath() {
        return TFS_Host_TfsContext.TfsContext.getDefault().navigation.collection.uri + TFS_Host_TfsContext.TfsContext.getDefault().navigation.project + "/" + this.defaultTeam;
    }

    public static getWorkItemStore(): WITOM.WorkItemStore {
        if (!_workitemStore) {
            _workitemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        }
        return _workitemStore;
    }
}

export class WorkItemField {
    public static workItemType: string = "System.WorkItemType";
    public static id: string = "System.Id";
    public static title: string = "System.Title";
    public static iterationPath: string = "System.IterationPath";
    public static assignedTo: string = "System.AssignedTo";
    public static acceptanceCriteria: string = "Microsoft.VSTS.Common.AcceptanceCriteria";
    public static description: string = "System.Description";
    public static areaPath: string = "System.AreaPath";
    public static url: string = "url";
    public static fields: string = "fields";
}

export class WorkItemCategories {
    public static TestCaseCategory = "Microsoft.TestCaseCategory";
    public static ScenarioCategory = "Microsoft.ScenarioCategory";
    public static EpicCategory = "Microsoft.EpicCategory";
    public static RequirementCategory = "Microsoft.RequirementCategory";
    public static FeatureCategory = "Microsoft.FeatureCategory";
    public static TestSuiteCategory = "Microsoft.TestSuiteCategory";
}

export enum TestSuiteTypeId {
    StaticSuiteTypeId = 1,
    QueryBasedSuiteTypeId = 2,
    RequirementBasedSuiteTypeId = 3
}

VSS.tfsModuleLoaded("TFS.TestManagement.ExploreWorkItemContextMenu", exports);
