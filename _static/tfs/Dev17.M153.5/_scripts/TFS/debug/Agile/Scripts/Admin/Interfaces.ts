
/** Base DataManager record */
export interface ITeamClassificationRecord {
    id: string; // Guid
    friendlyPath: string;
}

/** DataManager record for Area */
export interface ITeamAreaRecord extends ITeamClassificationRecord {
    isDefault: boolean;
    includeChildren: boolean;
}

/** DataManager record for Iteration */
export interface ITeamIterationRecord extends ITeamClassificationRecord {
    startDate: string;
    endDate: string;
}

export interface IClassificationValidationResult {
    /** Indicates whether the result is valid or not*/
    valid: boolean;
    /** Message to be shown when valid == false */
    errorMessage: string;
}