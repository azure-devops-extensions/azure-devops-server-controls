import * as React from "react";

import * as TFS_Agile_Controls from "Agile/Scripts/Common/Controls";
import { ISprintDatesOptions, SprintDates } from "Agile/Scripts/Common/SprintDates";
import { BacklogConstants } from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as AgileControlsResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import { DateRange } from "TFS/Work/Contracts";
import * as Controls from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";

export interface IVelocityChartProps {
    /**
     * Team to render the chart for
     */
    teamId: string;
}

export class VelocityChartComponent extends React.Component<IVelocityChartProps> {
    private _velocityChartControl: TFS_Agile_Controls.VelocityChartControl;
    private _containerRef: HTMLDivElement;

    public render(): JSX.Element {
        return (
            <div ref={this._setContainerRef} />
        );
    }

    public componentDidMount() {
        this._createVelocityChartControl();
    }

    public componentWillUnmount() {
        this._destroyVelocityChartControl();
    }

    private _setContainerRef = (ref) => {
        this._containerRef = ref;
    }

    private _createVelocityChartControl() {
        this._destroyVelocityChartControl();

        const options = {
            teamId: this.props.teamId,
            title: AgileControlsResources.Velocitychart_Title,
            iterationsNumber: BacklogConstants.NumberOfIterationsInVelocity
        };

        const chartContainer = $("<div>", { class: "velocity-chart small-chart-container" });
        chartContainer.appendTo($(this._containerRef));
        this._velocityChartControl = Controls.Enhancement.enhance(TFS_Agile_Controls.VelocityChartControl, chartContainer, options) as TFS_Agile_Controls.VelocityChartControl;
    }

    private _destroyVelocityChartControl() {
        if (this._velocityChartControl) {
            this._velocityChartControl.dispose();
            this._velocityChartControl = null;
        }
    }
}

export interface ICumulativeFlowChartProps {
    /**
     * Team to render the chart for
     */
    teamId: string;

    /**
     * Backlog level to render the chart for
     */
    backlogLevelId: string;
}

export class CumulativeFlowChartComponent extends React.Component<ICumulativeFlowChartProps, {}> {
    private _cfdChartControl: TFS_Agile_Controls.CumulativeFlowChartControl;
    private _containerRef: HTMLDivElement;

    public render(): JSX.Element {
        return (
            <div ref={this._setContainerRef} />
        );
    }
    public shouldComponentUpdate(nextProps: ICumulativeFlowChartProps) {
        if (this._cfdChartControl && this.props.backlogLevelId === nextProps.backlogLevelId) {
            // We have current chart, no need to update
            return false;
        }
        return true;
    }

    public componentDidUpdate() {
        this._createCFDControl();
    }

    public componentDidMount() {
        this._createCFDControl();
    }

    public componentWillUnmount() {
        this._destroyCFDControl();
    }

    private _setContainerRef = (ref) => {
        this._containerRef = ref;
    }

    private _createCFDControl() {
        this._destroyCFDControl();

        const options: TFS_Agile_Controls.ICumulativeFlowChartControlOptions = {
            teamId: this.props.teamId,
            backlogLevelId: this.props.backlogLevelId,
            title: AgileControlsResources.Charts_Settings_Cfd_Title,
            hideIncoming: null,
            hideOutgoing: null,
            startDate: null
        };

        const chartContainer = $("<div>", { class: "cumulative-flow-chart small-chart-container" });
        chartContainer.appendTo($(this._containerRef));
        this._cfdChartControl = Controls.Enhancement.enhance(TFS_Agile_Controls.CumulativeFlowChartControl, chartContainer, options) as TFS_Agile_Controls.CumulativeFlowChartControl;
    }

    private _destroyCFDControl() {
        if (this._cfdChartControl) {
            this._cfdChartControl.dispose();
            this._cfdChartControl = null;
        }
    }
}

export interface ISprintBurndownChartProps {
    /** Current iteration */
    iteration: Iteration;

    /** Weekends for this team */
    teamWeekends: number[];

    /** Days off for the whole team */
    teamDaysOff: DateRange[];

    /** Team id to render the chart for */
    teamId: string;
}

export class SprintBurndownChartComponent extends React.Component<ISprintBurndownChartProps, {}> {
    private _burndownControl: TFS_Agile_Controls.BurndownChartControl;
    private _sprintDates: SprintDates;
    private _containerRef: HTMLDivElement;

    public render(): JSX.Element {
        return (
            <div ref={this._setContainerRef} className="sprint-hub sprint-dates-container" />
        );
    }

    public shouldComponentUpdate(nextProps: ISprintBurndownChartProps, nextState: any, nextContext: any): boolean {
        return this.props.iteration !== nextProps.iteration
            || this.props.teamId !== nextProps.teamId
            || this.props.teamDaysOff !== nextProps.teamDaysOff
            || this.props.teamWeekends !== nextProps.teamWeekends
            || !this._burndownControl;
    }

    public componentDidUpdate() {
        this._createControl();
    }

    public componentDidMount() {
        this._createControl();
    }

    public componentWillUnmount() {
        this._destroyControl();
    }

    private _createControl() {
        this._destroyControl();

        const {
            teamDaysOff,
            teamWeekends,
            teamId
        } = this.props;
        const {
            id,
            name,
            iterationPath,
            startDateLocal,
            finishDateLocal
        } = this.props.iteration;

        const burndownChartOptions: any = {
            title: `${AgileControlsResources.Burndownchart_TitlePrefix} ${name}`,
            iterationPath: iterationPath,
            teamId: teamId
        };

        // Put the data into the shape the SprintDates control wants
        const sprintDateOptions: ISprintDatesOptions = {
            teamId,
            name,
            iterationPath: iterationPath,
            iterationId: id,
            accountCurrentDate: Date.now().toString(),
            startDate: startDateLocal,
            finishDate: finishDateLocal,

            // Though marked as optional, we need to pass in teamDaysOff and weekends
            // Otherwise the data is fetched from capacityModels, which makes an extra REST call
            teamDaysOff: teamDaysOff,
            weekends: teamWeekends
        };

        if (!startDateLocal || !finishDateLocal) {
            burndownChartOptions.errors = Utils_String.format(AgileControlsResources.BurndownValidation_Dates, iterationPath) ;
        }

        const datesContainer = $("<div>", { class: "sprint-dates-working-days" });
        datesContainer.appendTo($(this._containerRef));

        const chartContainer = $("<div>", { class: "burndown-chart small-chart-container" });
        chartContainer.appendTo($(this._containerRef));

        this._burndownControl = Controls.Enhancement.enhance(TFS_Agile_Controls.BurndownChartControl, chartContainer, burndownChartOptions) as TFS_Agile_Controls.BurndownChartControl;
        this._sprintDates = Controls.Enhancement.enhance(SprintDates, datesContainer, sprintDateOptions) as SprintDates;
    }

    private _setContainerRef = (ref) => {
        this._containerRef = ref;
    }

    private _destroyControl() {
        if (this._burndownControl) {
            this._burndownControl.dispose();
            this._burndownControl = null;
        }

        if (this._sprintDates) {
            this._sprintDates.dispose();
            this._sprintDates = null;
        }
    }
}