

import q = require("q");

import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WorkItemTrackingControls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");

export interface WorkItemOptions {
    ownerTeamProject: string;
    ownerAreaPath?: string;
    iterationPath?: string;
    searchTag?: string;
}

export interface FeedbackOptions {
    sendFeedbackLink: string;
    workItemOptions: WorkItemOptions;
}

export class Feedback extends Controls.Control<FeedbackOptions> {

    constructor(options: FeedbackOptions) {
        super(options);
        this._workItemHelper = new WorkItemHelper(options.workItemOptions);
    }

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("feedback-control");
        this._createMenu();
    }

    private _createMenu(): void {
        this._menu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this.getElement(), {
            items: [{
                orientation: "vertical",
                hideDrop: true,
                showText: false,
                childItems: this._getSubMenus(),
                icon: "bowtie-icon bowtie-feedback-positive"
            }]
        });
    }

    private _getSubMenus(): Menus.IMenuItemSpec[] {
        let subMenus: Menus.IMenuItemSpec[] = [];

        subMenus.push({
            id: "send-smile",
            icon: "bowtie-icon bowtie-feedback-positive",
            text: "Send feedback",
            showText: true,
            arguments: this._options.sendFeedbackLink,
            action: (arg: any) => {
                window.open(arg.url, "_blank");
            }
        });

         subMenus.push({
            id: "report-bug",
            icon: "icon icon-tfs-tcm-tra-create-bug",
            text: "Report an issue",
            showText: true,
            action: (arg: any) => {
                this._workItemHelper.launchBugCreationDialog();
            }
        });

        return subMenus;
    }

    private _menu: Menus.MenuBar;
    private _workItemHelper: WorkItemHelper;
}

class WorkItemHelper {

    constructor(options: WorkItemOptions) {
        this._workItemOptions = options;
    }

    public launchBugCreationDialog(): void {
        let workItemStore: WITOM.WorkItemStore,
            bugWorkItemTypeName: string,
            workItemCategoryPromise: IPromise<string>;

        workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        workItemStore.beginGetProject(this._workItemOptions.ownerTeamProject, (ownerTeamProject: WITOM.Project) => {
            workItemCategoryPromise = this._getWorkItemCategory(ownerTeamProject, WorkItemHelper._bugCategory);

            workItemCategoryPromise.then((bugCategoryTypeName: string) => {
                ownerTeamProject.beginGetWorkItemType(bugCategoryTypeName, (bugWorkItemTypeName) => {
                    let bugWorkItem = WorkItemManager.get(workItemStore).createWorkItem(bugWorkItemTypeName);

                    this._setWorkItemFieldValues(ownerTeamProject, bugWorkItem);

                    WorkItemTrackingControls.WorkItemFormDialog.showWorkItem(bugWorkItem);
                }, (error) => {
                    // ERROR
                    Diag.logError(Utils_String.format("[WorkItemHelp.launchBugCreationDialog]: Error getting workitem type: error: {0}", error));
                });
            }, (error) => {
                // Error
                Diag.logError(Utils_String.format("[WorkItemHelp.launchBugCreationDialog]: Error getting workitem category: error: {0}", error));
            });
        }, (error) => {
            //ERROR
            Diag.logError(Utils_String.format("[WorkItemHelp.launchBugCreationDialog]: Error getting projects: error: {0}", error));
        });
    }

    private _setWorkItemFieldValues(project: WITOM.Project, workItem: WITOM.WorkItem): void {
        if (this._workItemOptions.ownerAreaPath) {
            workItem.setFieldValue(WITConstants.CoreField.AreaPath, this._workItemOptions.ownerAreaPath);
        }

        if (this._workItemOptions.iterationPath) {
            workItem.setFieldValue(WITConstants.CoreField.IterationPath, this._workItemOptions.iterationPath);
        }

        if (this._workItemOptions.searchTag) {
            workItem.setFieldValue(WITConstants.CoreField.Tags, this._workItemOptions.searchTag);
        }
    }

    private _getWorkItemCategory(teamProject: WITOM.Project, categoryName: string): IPromise<string> {
        let deferred: Q.Deferred<string> = q.defer<string>();

        teamProject.beginGetWorkItemCategories((categories) => {
            $.each(categories, (index, category) => {
                if (Utils_String.equals(category.referenceName, categoryName, true)) {
                    deferred.resolve(category.defaultWorkItemTypeName);
                }
            });
        });

        return deferred.promise;
    }

    private static _bugCategory: string = "Microsoft.BugCategory";
    private _workItemOptions: WorkItemOptions;
    private _workItemStore: WITOM.WorkItemStore;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TFS.TestManagement.Controls.Feedback", exports);
