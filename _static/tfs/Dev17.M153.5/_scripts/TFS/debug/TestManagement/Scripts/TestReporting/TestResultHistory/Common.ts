
export class ResultHistoryGroupPivots {
    public static Group_By_Branch = "Branch";
    public static Group_By_Environment = "Environment";

    public static MapGroupByToGroupIcon: IDictionaryStringTo<string> = {
        "Branch": "bowtie-icon bowtie-tfvc-branch",
        "Environment": "bowtie-icon bowtie-build"
    };
}

export class ResultHistoryCommands {

    public static GroupByBranch = "group-by-branch";
    public static GroupByEnvironment = "group-by-environment";

    public static Refresh = "refresh";

    public static MapGroupByCommandToPivot: IDictionaryStringTo<string> = {
        "group-by-branch": ResultHistoryGroupPivots.Group_By_Branch,
        "group-by-environment": ResultHistoryGroupPivots.Group_By_Environment
    };
}


export class ResultHistoryContants {

    //Histogram state constants
    public static Passed: string = "succeeded";
    public static Failed: string = "failed";
    public static Canceled: string = "canceled";
    public static OtherState: string = "partiallysucceeded";

    public static ResultCount: number = 50;
    public static TrendDays: number = 7;
}
