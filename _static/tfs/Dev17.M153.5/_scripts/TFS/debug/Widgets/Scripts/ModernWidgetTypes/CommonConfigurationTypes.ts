
/** Describes a team, scoped to a particular project. */
export interface TeamScope {
    /** Guid of the project. This may get relaxed, if our client scenarios can optimally run without it. e.g. a *public REST API* which can describe teams from a variety of projects. */
    projectId: string;
    /** Guid of the team. */
    teamId: string;    
}

/**
 * Describes the mode for performing an aggregation of data
 */
export enum AggregationMode {
    Count = 0,
    Sum = 1
};

/** Used for describing when a behavior should be invoked. */
export enum BehaviorTiming {
    Delayed,
    Immediate
}

/** Describes if change notifications are to be used */
export enum NotificationMode {
    On,
    Silent
}