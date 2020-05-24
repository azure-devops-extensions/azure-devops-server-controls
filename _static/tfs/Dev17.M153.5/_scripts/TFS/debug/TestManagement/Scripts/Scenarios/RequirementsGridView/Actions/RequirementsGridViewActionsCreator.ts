import { IColumn } from "OfficeFabric/DetailsList";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    IWorkItemColorsAndIcon,
    RequirementsGridViewActionsHub,
} from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsHub";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import {
    RequirementsGridViewSource,
} from "TestManagement/Scripts/Scenarios/RequirementsGridView/Sources/RequirementsGridViewSource";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TCMContracts = require("TFS/TestManagement/Contracts");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import Events_Action = require("VSS/Events/Action");
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

export class RequirementsGridViewActionsCreator {

    constructor(private _actionsHub: RequirementsGridViewActionsHub, private _source: RequirementsGridViewSource) {
        this._colorsProvider = WorkItemStateColorsProvider.getInstance();
        this._colorsAndIconsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
		this._projectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId; 
    }

    public loadRequirements(testCaseResult: TCMContracts.TestCaseResult): void {
		this._source.getRequirements(this._projectId, testCaseResult).then(
            (requirements) => {
                if (requirements && requirements.length > 0) {
                    requirements = requirements.reverse();
                    const workItemColorsAndIcon: IWorkItemColorsAndIcon[] = [];
                    this._colorsProvider.ensureColorsArePopulated([testCaseResult.project.name]).then(
                        () => {
                            this._colorsAndIconsProvider.ensureColorAndIconsArePopulated([testCaseResult.project.name]).then(
                                () => {
                                    requirements.forEach((requirement) => {
                                        const workItemColorAndIcon = this._colorsAndIconsProvider.getColorAndIcon(
                                            testCaseResult.project.name,
                                            requirement.fields["System.WorkItemType"]
                                        );
                                        const workItemStateColor: string = this._colorsProvider.getColor(
                                            testCaseResult.project.name,
                                            requirement.fields["System.WorkItemType"],
                                            requirement.fields["System.State"]
                                        );
                                        workItemColorsAndIcon.push({
                                            id: requirement.id,
                                            stateColor: workItemStateColor,
                                            color: workItemColorAndIcon.color,
                                            icon: workItemColorAndIcon.icon
                                        });
                                    });
                                    this._actionsHub.colorsLoaded.invoke(workItemColorsAndIcon);
                                    this._actionsHub.requirementsLoaded.invoke(requirements);
                                },
                                (error) => {
                                    this._actionsHub.requirementsLoaded.invoke(requirements);
                                });
                        },
                        (error) => {
                            this._actionsHub.requirementsLoaded.invoke(requirements);
                        });
                }
                else {
                    this._actionsHub.requirementsLoaded.invoke([]);
                }
            },
            (error) => {
                this._handleError(error);
            }
        );
    }

    public openRequirement(requirement: WIT_Contracts.WorkItem): void {
        let url: string = TMUtils.UrlHelper.getWorkItemUrl(requirement.id);
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url,
            target: "_blank",
            rel: "nofollow noopener noreferrer"
        });
    }

    public updateWorkItem(testCaseResult: TCMContracts.TestCaseResult, workItem: WIT_Contracts.WorkItem): void {
        this._source.getUpdatedWorkItem(workItem).then(
            (updatedWorkItem) => {
                const workItemStateColor: string = this._colorsProvider.getColor(
                    testCaseResult.project.name,
                    updatedWorkItem.fields["System.WorkItemType"],
                    updatedWorkItem.fields["System.State"]
                );
                const workItemColorAndIcon = this._colorsAndIconsProvider.getColorAndIcon(
                    testCaseResult.project.name,
                    updatedWorkItem.fields["System.WorkItemType"]
                );

                this._actionsHub.updateWorkItemColorsAndInfo.invoke({
                    id: updatedWorkItem.id,
                    color: workItemColorAndIcon.color,
                    stateColor: workItemStateColor,
                    icon: workItemColorAndIcon.icon
                });
                this._actionsHub.updateWorkItem.invoke(updatedWorkItem);
            },
            (error) => {
                this._handleError(error);
            });
    }

    public deleteAssociations(testCaseResult: TCMContracts.TestCaseResult, requirements: WIT_Contracts.WorkItem[]): void {
        this._source.deleteAssociations(testCaseResult, requirements).then((unlinkedRequirements) => {
            this._actionsHub.afterRequirementsDeleted.invoke(unlinkedRequirements);
            if (unlinkedRequirements.length > 0) {
                announce(Utils_String.format(Resources.AnnounceAssociationsDeleted, unlinkedRequirements.length));
            }
            if (unlinkedRequirements.length !== requirements.length) {
                let remainingRequirements: WIT_Contracts.WorkItem[] = requirements.filter((x) => { return unlinkedRequirements.indexOf(x) < 0; });
                let errorMessage: string = Utils_String.format(Resources.UnableToDeleteAssociationText, remainingRequirements.map(x => x.fields["System.Title"]).join(Resources.CommaSeparator));
                this._handleCustomError(errorMessage);
            }
            if (unlinkedRequirements.length > 0) {
                TelemetryService.publishEvents(TelemetryService.featureRequirementsGridView_RemoveAssociation_Requirements, {
                    "Number of items": unlinkedRequirements.length
                });
            }
        }, (error) => {
            this._handleError(error);
        });
    }

    public afterSortRequirements(requirements: WIT_Contracts.WorkItem[]): void {
        this._actionsHub.afterSort.invoke(requirements);
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
