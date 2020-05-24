import { IPivotItemContentProps } from "Agile/Scripts/Common/Components/PivotItemContent";
import { ITeam } from "Agile/Scripts/Models/Team";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";
import { IObservableValue } from "VSS/Core/Observable";

export interface IContributedPivotContext {
    level: string;

    workItemTypes: string[];

    team: {
        id: string,
        name: string
    };

    foregroundInstance: boolean;
}

/** Data passed from the backlog view to the individual pivots */
export interface ITeamBoardPivotContext extends IPivotItemContentProps {
    /** Indicates to the pivot that it should force refresh its data providers */
    shouldReloadDataProviders: boolean;
    /** The current team */
    team: ITeam;

    /** The currently selected backlog configuration */
    currentBacklog: IBacklogLevelConfiguration;

    visibleBacklogLevels: IBacklogLevelConfiguration[];

    /**  Name of the pivot */
    pivotName: string;
    /** View options as set by the viewActions */
    viewOptions: IViewOptions;

    newBacklogLevelsSignature: string;

    /** context to be passed to contributable view actions */
    contributableViewActionContext: IObservableValue<IContributableViewActionContext>;

    /** Flag indicating whether the current pivot is rendering for embedded view or not */
    embedded?: boolean;
}

export interface IContributableViewActionContext {
    /** board id */
    id: string;
    team: ITeam;
}