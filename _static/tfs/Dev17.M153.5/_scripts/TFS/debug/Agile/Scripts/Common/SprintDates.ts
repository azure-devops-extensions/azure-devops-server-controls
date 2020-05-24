/// <reference types="jquery" />

import * as VSS from "VSS/VSS";
import * as VSSError from "VSS/Error";
import * as Diag from "VSS/Diag";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Date from "VSS/Utils/Date";
import * as Controls from "VSS/Controls";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as Events_Action from "VSS/Events/Action";
import * as Events_Services from "VSS/Events/Services";
import * as Agile from "Agile/Scripts/Common/Agile";
import * as AgileControlsResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import * as Capacity_Models from "Agile/Scripts/Capacity/CapacityModels";
import * as TFS_AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as TFS_TeamAwarenessService from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import * as Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_Grid_Adapters from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters";
import * as TFS_Admin from "Admin/Scripts/TFS.Admin";
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import * as TFS_Admin_AreaIterations_NO_REQUIRE from "Agile/Scripts/Admin/AreaIterations";
import * as TFS_Admin_ManageClassificationDialogs_NO_REQUIRE from "Agile/Scripts/Admin/ManageClassificationDialogs";
import * as TFS_Admin_AreaIterations_DataModels_NO_REQUIRE from "Agile/Scripts/Admin/AreaIterations.DataModels";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { CssNode } from "Agile/Scripts/Admin/AreaIterations.DataModels";
import { DateRange } from "TFS/Work/Contracts";

export interface IWorkingDaysOptions {
    /**
     * Start date of the sprint
     */
    startDate: Date;

    /**
     * End date of the sprint
     */
    endDate: Date;

    /**
     * Weekends for this team
     */
    weekends: number[];

    /**
     * Days off for the whole team
     */
    teamDaysOff: DateRange[];
}

export class WorkingDays extends Controls.Control<IWorkingDaysOptions> {

    public static enhancementTypeName: string = "tfs.agile.workingdays";
    public static WORKING_DAYS_CONTROLLER_CLASS: string = "team-working-days";

    /**
     * Update the element on the screen with the team working days
     */
    public static updateBasedOnTeamCapacity() {
        const workingDaysElement = $(`.${WorkingDays.WORKING_DAYS_CONTROLLER_CLASS}`);

        const teamCapacity = Capacity_Models.getService().getCapacityPageModel();
        const workingDayMessage = WorkingDays._getWorkingDaysMessage(teamCapacity.getIterationStartDate(), teamCapacity.getIterationEndDate(), teamCapacity.getWeekends(), teamCapacity.getIterationInfo().getTeamDaysOffDates());
        workingDaysElement.text(workingDayMessage);
    }

    //Protected for Testing Purposes
    protected static _getWorkingDaysMessage(startDate: Date, endDate: Date, weekends: number[], teamDaysOff: DateRange[]): string {

        if (!startDate || !endDate) {
            return "";
        }

        let messageFormat: string;
        let workDays: number = IterationDateUtil.getNumberOfWorkingDays(Utils_Date.shiftToUTC(startDate), Utils_Date.shiftToUTC(endDate), weekends, teamDaysOff);

        if (workDays === null || workDays < 0) {
            // Working days were not passed in or were not calculated
            return "";
        }

        if (IterationDateUtil.isTodayInSprint(Utils_Date.shiftToUTC(startDate), Utils_Date.shiftToUTC(endDate))) {
            workDays = IterationDateUtil.getNumberWorkingDaysLeft(Utils_Date.shiftToUTC(endDate), weekends, teamDaysOff);
            // This iteration is currently happening, use remaining days string
            messageFormat = (workDays === 1) ? AgileControlsResources.WorkingDays_Work_Day_Remaining
                : AgileControlsResources.WorkingDays_Work_Days_Remaining;
        } else {
            // This iteration is not currently happening, use total days string
            messageFormat = (workDays === 1) ? AgileControlsResources.WorkingDays_Work_Day
                : AgileControlsResources.WorkingDays_Work_Days;
        }
        return Utils_String.format(messageFormat, workDays);
    }

    /**
     * Control to show working days
     *
     * @param options options object
     */
    constructor(options?: IWorkingDaysOptions) {
        super(options);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: IWorkingDaysOptions) {
        super.initializeOptions($.extend({
            cssClass: WorkingDays.WORKING_DAYS_CONTROLLER_CLASS
        }, options));
    }

    /**
     * initialize the control
     */
    public initialize() {
        super.initialize();
        this._element.text(WorkingDays._getWorkingDaysMessage(this._options.startDate, this._options.endDate, this._options.weekends, this._options.teamDaysOff));
    }
}

Controls.Enhancement.registerEnhancement(WorkingDays, ".team-working-days");

export interface ISprintDatesOptions {
    teamId: string;

    name: string;
    iterationPath: string;
    iterationId: string;
    accountCurrentDate: string;
    startDate?: Date;
    finishDate?: Date;

    /** Optional Weekends. Otherwise it is fetched from capacityModel */
    weekends?: number[];

    /** Optional TeamDaysOff. Otherwise it is fetched from capacityModel */
    teamDaysOff?: DateRange[];

    // Working Days Control Options
    isCurrentDateInIteration?: boolean;
    syncWorkItemTracking?: boolean;
    /**
     * TFS context from extending TfsContext.ControlExtensions.
     */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

/**
 * Displays sprint date information along with links to set dates
 */
export class SprintDates extends Controls.Control<ISprintDatesOptions> {

    public static enhancementTypeName: string = "tfs.agile.sprintdates";

    private _$sprintDates: JQuery;
    private _$workingDays: JQuery;
    private _dataProvider: TFS_Grid_Adapters.FieldDataProvider;

    private _richContentTooltip: RichContentTooltip;

    /**
     * @param options
     */
    public initializeOptions(options?: ISprintDatesOptions) {

        super.initializeOptions($.extend({
            cssClass: "sprint-dates-working-days",
            syncWorkItemTracking: true  // should we force a Work Item Tracking sync on save of the CSS updates
        }, options));
    }

    /**
     * Initializes the control, creates the layout and setup the WorkingDays control
     */
    public initialize() {
        super.initialize();

        this.createLayout();

        Events_Action.getService().registerActionWorker(TFS_Admin.Actions.EDIT_CLASSIFICATION, this._editIterationHandler);
    }

    public dispose() {
        Events_Action.getService().unregisterActionWorker(TFS_Admin.Actions.EDIT_CLASSIFICATION, this._editIterationHandler);

        super.dispose();
    }

    private _editIterationHandler = (actionArgs, next) => {
        Diag.Debug.assertParamIsStringNotEmpty(actionArgs, "actionArgs");

        const iterationId = actionArgs;
        this._showIterationDialog(iterationId);

        return next(actionArgs);
    }

    /**
     * Create the basic DOM structure and WorkingDates control
     */
    public createLayout() {
        this._$sprintDates = $("<button>").addClass("sprint-date hub-title-right");
        this._$workingDays = $("<div>").addClass("sprint-working-days hub-title-right-secondary");

        this._renderSprintDates();

        if (this._options.startDate && this._options.finishDate) {
            this._beginRenderWorkingDaysControl(this._options.startDate, this._options.finishDate);
        } else {
            this._addEditIterationDatesMessage();
        }

        this.getElement().append(this._$sprintDates).append(this._$workingDays);
    }

    /**
     * Get the data provider that manages the iteration data
     */
    public beginGetDataProvider(callback, errorCallback?) {
        if (this._dataProvider) {
            Utils_Core.delay(this, 0, callback, [this._dataProvider]);
        } else {
            this.beginGetIterations((data) => {
                this._dataProvider = new TFS_Grid_Adapters.FieldDataProvider(data);
                if (callback) {
                    callback.call(this, this._dataProvider);
                }
            },
                errorCallback
            );
        }
    }

    /**
     * Get project's iteration data from the Classification API controller
     */
    public beginGetIterations(callback, errorCallback?) {
        const actionUrl = this._options.tfsContext.getActionUrl("GetIterations", "classification", { area: "api" });

        Ajax.getMSJSON(actionUrl, null, (data) => {
            callback(data);
        }, errorCallback);
    }

    /**
     * Create the DOM structure for the display of sprint dates and setup click handlers
     *
     * @param dates The dates string to display
     */
    private _renderSprintDates() {
        const $sprintDates = this._$sprintDates;

        Diag.Debug.assert($sprintDates !== null || $sprintDates !== undefined, "Expected to find the $sprintDates object");

        if (!$sprintDates) {
            VSSError.publishErrorToTelemetry({
                name: "setSprintDatesFailed",
                message: `$sprintDates should not be null. Iteration Path: ${this._options.iterationPath}`
            });
            return;
        }

        // Get the display string based on our dates
        let dateDisplayString = "";
        if (this._options.startDate && this._options.finishDate) {
            dateDisplayString = IterationDateUtil.getSprintDatesDisplay(Utils_Date.shiftToUTC(this._options.startDate), Utils_Date.shiftToUTC(this._options.finishDate));
        }

        if (Agile.areAdvancedBacklogFeaturesEnabled()) {
            this._bind($sprintDates, "click", this._editIteration);
            if (dateDisplayString) {
                $sprintDates.text(dateDisplayString).addClass("dates-set");

                this._richContentTooltip = RichContentTooltip.add(AgileControlsResources.EditDatesForIteration, $sprintDates);

            } else {
                $sprintDates.text(AgileControlsResources.SprintDates_NoneSet)
                    .removeClass("dates-set");

                if (this._richContentTooltip) {
                    this._richContentTooltip.dispose();
                    this._richContentTooltip = null;
                }
            }
        } else {
            if (dateDisplayString) {
                this._$sprintDates.text(dateDisplayString);
            } else {
                this._$sprintDates.text(AgileControlsResources.SprintDates_NoneSet);
            }

            this._$sprintDates.attr("aria-label", `${dateDisplayString ? dateDisplayString : ""} ${AgileControlsResources.ClickToEditDatesForIteration}`);
        }
    }

    /**
     * Fetch working days from server and set workingDays element
     */
    private _beginRenderWorkingDaysControl(startDate: Date, endDate: Date): IPromise<void> {
        const capacityDataService = Capacity_Models.getService();
        // Check to see if the page includes Capacity Options
        const capacityOptions = capacityDataService.getCapacityOptions();

        // Capacity options are not in a json island, send sprint dates option
        if (!capacityOptions.accountCurrentDate) {
            capacityOptions.accountCurrentDate = this._options.accountCurrentDate;
        }

        const { weekends, teamDaysOff } = this._options;
        if (!!weekends && !!teamDaysOff) {
            // In the new xhr hubs, we don't want to rely on the capacityDataService to get teamDaysOff and weekends (hence optional parameters)
            <WorkingDays>Controls.Enhancement.enhance(WorkingDays, this._$workingDays, {
                startDate: startDate,
                endDate: endDate,
                weekends: weekends,
                teamDaysOff: teamDaysOff
            } as IWorkingDaysOptions);
            return Promise.resolve(null);
        } else {
            // Setup options and create working day controller
            return capacityDataService.beginGetTeamCapacityModel(this._options.iterationId, capacityOptions.allowedActivities, capacityOptions.accountCurrentDate).then((teamCapacity) => {
                // User can change the dates of a sprint directly using this control, and in the Sprints Hub we do not reload the whole page after change.
                // Here we set the working days options using the start/end date passed in because without page refresh the capacity model will not have the most recent values.
                // Weekends is up to date because it cannot be edited directly from the page.
                const workingDayOptions: IWorkingDaysOptions = {
                    startDate: startDate,
                    endDate: endDate,
                    weekends: teamCapacity.getWeekends(),
                    teamDaysOff: teamCapacity.getIterationInfo().getTeamDaysOffDates()
                };
                <WorkingDays>Controls.Enhancement.enhance(WorkingDays, this._$workingDays, workingDayOptions);
                return null;
            }, (reason) => {
                VSSError.publishErrorToTelemetry({
                    name: "beginGetTeamCapacityFailure",
                    message: `Failure occurred in _beginRenderWorkingDaysControl ${reason} Iteration Path: ${this._options.iterationPath}`
                });
                return null;
            });
        }
    }

    /**
     * Add edit iteration message. Uses Working Days element when no sprint dates have been set.
     */
    private _addEditIterationDatesMessage() {
        //Only put link to set dates if you have permission to change them.
        if (Agile.areAdvancedBacklogFeaturesEnabled()) {
            const $setDatesLink = $("<button>")
                .text(AgileControlsResources.SprintDates_SetDates)
                .addClass("agile-url-link-button")
                .addClass("sprint-set-dates-button")
                .click(this._editIteration);

            RichContentTooltip.add(AgileControlsResources.ClickToEditDatesForIteration, $setDatesLink);

            this._$workingDays.append($setDatesLink);
        }
    }

    /**
     * Click handler for the manage iterations link which requests that the iteration node be edited.
     *
     * @param e Event arguments.
     */
    private _editIteration = (e?: any) => {
        Diag.logTracePoint("SprintDates._editIteration.start");
        Events_Action.getService().performAction(TFS_Admin.Actions.EDIT_CLASSIFICATION, this._options.iterationId);
    }

    /**
     * Show the iteration dialog to edit the selected node
     *
     * @param id The ID (GUID) of the iteration
     */
    private _showIterationDialog(id: string) {
        Diag.Debug.assertParamIsStringNotEmpty(id, "id");

        // Have the Iterations dialog acquire the CssNode information from a Classification
        // OM service.
        Dialogs.Dialog.beginExecuteDialogAction((dialogActionComplete) => {

            function handleError(error, callback?, context?) {
                dialogActionComplete();
                VSS.handleError(error, callback, context);
            }

            VSS.using(["Agile/Scripts/Admin/AreaIterations.DataModels", "Agile/Scripts/Admin/AreaIterations", "Agile/Scripts/Admin/ManageClassificationDialogs"],
                (_TFS_Admin_AreaIterations_DataModels: typeof TFS_Admin_AreaIterations_DataModels_NO_REQUIRE,
                    _TFS_Admin_AreaIterations: typeof TFS_Admin_AreaIterations_NO_REQUIRE,
                    _TFS_Admin_ManageClassificationDialogs_NO_REQUIRE: typeof TFS_Admin_ManageClassificationDialogs_NO_REQUIRE) => {
                    this.beginGetDataProvider(
                        (dataProvider: TFS_Grid_Adapters.FieldDataProvider) => {
                            const CssNode = _TFS_Admin_AreaIterations_DataModels.CssNode;
                            const node = dataProvider.getNodeFromId(id);
                            let cssNode;
                            let originalData;
                            let options;

                            const saved = (newCssNode: CssNode) => {
                                // update the returned node in the data provider and then we can interrogate
                                // an updated version of the css node.
                                const updatedNode = dataProvider.updateNode(newCssNode.node);

                                newCssNode = CssNode.create(updatedNode, dataProvider);

                                // has anything changed?
                                if (originalData.path !== newCssNode.getPath() ||
                                    !Utils_Date.equals(originalData.startDate, newCssNode.getStartDate()) ||
                                    !Utils_Date.equals(originalData.endDate, newCssNode.getEndDate())) {
                                    this._raiseEventChanged(newCssNode.getPath());
                                }
                            };

                            const getPreviousId = (path, iterations) => {
                                let i;

                                for (i = iterations.length - 1; i >= 0; i -= 1) {
                                    if (iterations[i].friendlyPath === path) {
                                        return i > 0 ? iterations[i - 1].id : null;
                                    }
                                }

                                return null;
                            };

                            if (node !== null) {
                                cssNode = CssNode.create(node, dataProvider);

                                originalData = { // capture the current values in the closure - we'll be updating 'node' later in the "saved" function (above).
                                    path: cssNode.getPath(),
                                    startDate: cssNode.getStartDate(),
                                    endDate: cssNode.getEndDate()
                                };

                                options = {
                                    disableLocationEdit: true, // Disables the location from being changed on the dialog
                                    syncWorkItemTracking: this._options.syncWorkItemTracking
                                };

                                const connection = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext);
                                connection.getService(TFS_TeamAwarenessService.TeamAwarenessService).beginGetTeamSettings(
                                    this._options.teamId
                                ).then(
                                    (teamSettings) => {
                                        const iterations = teamSettings.previousIterations.concat(teamSettings.currentIteration, teamSettings.futureIterations);
                                        const previousId = getPreviousId(originalData.path, iterations);

                                        connection.getService(TFS_AgileCommon.ProjectProcessConfigurationService).beginGetProcessSettings(
                                            (processSettings) => {
                                                if (previousId) {
                                                    options.previousIteration = CssNode.create(dataProvider.getNodeFromId(previousId), dataProvider);
                                                    options.weekends = processSettings.weekends;
                                                }

                                                _TFS_Admin_ManageClassificationDialogs_NO_REQUIRE.ClassificationDialogs.showEditClassificationDialog(cssNode, saved, options);
                                                Diag.logTracePoint("CreateEditIterationDialog.show.complete");
                                            },
                                            handleError
                                        );
                                    },
                                    handleError
                                );
                            } else {
                                dialogActionComplete();
                                VSS.errorHandler.showError(Utils_String.format(AgileControlsResources.SprintDates_IterationNotFound, this._options.iterationId, this._options.iterationPath));
                            }
                        },
                        handleError
                    );
                });
        });
    }

    /**
     * Notify listeners that something about the iteration has changed
     *
     * @param iterationPath The iteration path of the node that changed
     */
    private _raiseEventChanged(iterationPath: string) {

        Diag.Debug.assertParamIsStringNotEmpty(iterationPath, "iterationPath");

        // Alert listeners that the iteration has changed.
        // See SprintPlanningPageView._handleIterationChanged.
        Events_Services.getService().fire(TFS_Admin.Notifications.CLASSIFICATION_CHANGED, this, iterationPath);
    }
}

VSS.classExtend(SprintDates, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(SprintDates, ".sprint-dates-working-days");
