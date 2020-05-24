import { IColumn } from "OfficeFabric/DetailsList";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    BugsGridViewActionsHub,
    IWorkItemColorsAndIcon,
} from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsHub";
import { BugsGridViewSource } from "TestManagement/Scripts/Scenarios/BugsGridView/Sources/BugsGridViewSource";
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TCMContracts = require("TFS/TestManagement/Contracts");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import Events_Action = require("VSS/Events/Action");
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

let TelemetryService = TCMTelemetry.TelemetryService;
let TelemetryHelper = TCMTelemetry.TelemetryHelper;

export class BugsGridViewActionsCreator {

    constructor(private _actionsHub: BugsGridViewActionsHub, private _source: BugsGridViewSource) {
        this._colorsProvider = WorkItemStateColorsProvider.getInstance();
        this._colorsAndIconsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        this._projectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId; 
    }

    public loadAssociatedBugs(testCaseResult: TCMContracts.TestCaseResult): void {
        this._source.loadAssociatedBugs(this._projectId, testCaseResult).then(
            (bugs) => {
                if (bugs && bugs.length > 0) {
                    const workItemColorsAndIcon: IWorkItemColorsAndIcon[] = [];
                    this._colorsProvider.ensureColorsArePopulated([testCaseResult.project.name]).then(
                        () => {
                            this._colorsAndIconsProvider.ensureColorAndIconsArePopulated([testCaseResult.project.name]).then(
                                () => {
                                    bugs.forEach((bug) => {
                                        const workItemColorAndIcon = this._colorsAndIconsProvider.getColorAndIcon(
                                            testCaseResult.project.name,
                                            bug.fields["System.WorkItemType"]
                                        );
                                        const workItemStateColor: string = this._colorsProvider.getColor(
                                            testCaseResult.project.name,
                                            bug.fields["System.WorkItemType"],
                                            bug.fields["System.State"]
                                        );
                                        workItemColorsAndIcon.push({
                                            id: bug.id,
                                            stateColor: workItemStateColor,
                                            color: workItemColorAndIcon.color,
                                            icon: workItemColorAndIcon.icon
                                        });
                                    });
                                    this._actionsHub.colorsLoaded.invoke(workItemColorsAndIcon);
                                    this._actionsHub.bugsLoaded.invoke(bugs);
                                },
                                (error) => {
                                    this._actionsHub.bugsLoaded.invoke(bugs);
                                });
                        },
                        (error) => {
                            this._actionsHub.bugsLoaded.invoke(bugs);
                        });
                } else {
                    this._actionsHub.bugsLoaded.invoke([]);
                }
            },
            (error) => {
                this._handleError(error);
            }
        );
    }

    public openBug(bug: WIT_Contracts.WorkItem): void {
        let url: string = TMUtils.UrlHelper.getWorkItemUrl(bug.id);
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url,
            target: "_blank",
            rel: "nofollow noopener noreferrer"
        });
    }

    public updateWorkItem(testCaseResult: TCMContracts.TestCaseResult, workItem: WIT_Contracts.WorkItem): void {
        this._source.getUpdatedWorkItem(workItem).then((updatedWorkItem) => {
            const workItemStateColor: string = this._colorsProvider.getColor(
                testCaseResult.project.name,
                updatedWorkItem.fields["System.WorkItemType"],
                updatedWorkItem.fields["System.State"]
            );
            const workItemColorAndIcon = this._colorsAndIconsProvider.getColorAndIcon(
                testCaseResult.project.name,
                updatedWorkItem.fields["System.WorkItemType"]
            );
            this._actionsHub.updateWorkItemColorsAndInfo.invoke(
                {
                    id: updatedWorkItem.id,
                    color: workItemColorAndIcon.color,
                    stateColor: workItemStateColor,
                    icon: workItemColorAndIcon.icon
                }
            );
            this._actionsHub.updateWorkItem.invoke(updatedWorkItem);
        }, (error) => {
            this._handleError(error);
        });
    }

    public deleteAssociations(testCaseResult: TCMContracts.TestCaseResult, bugs: WIT_Contracts.WorkItem[]): void {
        this._source.deleteAssociations(testCaseResult, bugs).then((unlinkedBugs) => {
            this._actionsHub.afterBugsDeleted.invoke(unlinkedBugs);
            if (unlinkedBugs.length > 0) {
                announce(Utils_String.format(Resources.AnnounceAssociationsDeleted, unlinkedBugs.length));
            }
            if (unlinkedBugs.length !== bugs.length) {
                let remainingBugs: WIT_Contracts.WorkItem[] = bugs.filter((x) => { return unlinkedBugs.indexOf(x) < 0; });
                let errorMessage: string = Utils_String.format(Resources.UnableToDeleteAssociationText, remainingBugs.map(x => x.fields["System.Title"]).join(Resources.CommaSeparator));
                this._handleCustomError(errorMessage);
            }
        }, (error) => {
            this._handleError(error);
        });

        TelemetryService.publishEvents(TelemetryService.featureBugsGridView_RemoveAssociation_Bugs, {
            "Number of items": bugs.length
        });
    }

    public afterSortBugs(bugs: WIT_Contracts.WorkItem[]): void {
        this._actionsHub.afterSort.invoke(bugs);
    }

    public initializeColumns(columns: IColumn[]): void {
        this._actionsHub.initializeColumns.invoke(columns);
    }

    public dismissContextualMenu(columns: IColumn[]): void {
        this._actionsHub.dismissContextMenu.invoke(columns);
    }

    public updateContextMenuOpenIndex(openIndex: number): void {
        this._actionsHub.updateContextMenuOpenIndex.invoke(openIndex);
    }

    public clearState(): void {
        this._actionsHub.clearState.invoke(null);
    }

    private _handleError(error: Error) {
        this._actionsHub.onError.invoke(error.message || error.toString());
    }

    private _handleCustomError(error: string) {
        this._actionsHub.onError.invoke(error);
    }

    public closeErrorMessage(): void {
        this._actionsHub.onErrorMessageClose.invoke(null);
    }

    private _colorsProvider: WorkItemStateColorsProvider;
    private _colorsAndIconsProvider: WorkItemTypeColorAndIconsProvider;
    private _projectId: string;
}