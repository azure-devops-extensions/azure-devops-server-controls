
export class CCPerfScenarios {
    public static Area = "Code Coverage";

    public static CodeCoverageInBuild_NoCCDetails = "VSO.TFS.DTA.CodeCoverageInBuild.NoCCDetails";
    public static CodeCoverageInBuild_WithCCDetails = "VSO.TFS.DTA.CodeCoverageInBuild.WithCCDetails";

    public static CodeCoverageInCCTab_NoCCDetails = "VSO.TFS.DTA.CodeCoverageInCCTab.NoCCDetails";
    public static CodeCoverageInCCTab_WithCCDetails = "VSO.TFS.DTA.CodeCoverageInCCTab.WithCCDetails";
    public static CodeCoverageInCCTab_BeginFetchSummaryData = CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails + ".BeginFetchSummaryData";
    public static CodeCoverageInCCTab_EndFetchBuildCoverageSummaryData = CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails + ".EndFetchBuildCoverageSummaryData";
    public static CodeCoverageInCCTab_EndFetchCodeCoverageSummaryData = CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails + ".EndFetchCodeCoverageSummaryData";
    public static CodeCoverageInCCTab_EndFetchBuildArtifactData = CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails + ".EndFetchBuildArtifactData";
    
    public static NewCodeCoverageInCCTab_DetailsListColumnClick = "VSO.TFS.DTA.NewCodeCoverageInCCTab.DetailsListColumnClick";
    public static NewCodeCoverageInCCTab_DetailsListConstructor = "VSO.TFS.DTA.NewCodeCoverageInCCTab.DetailsListConstructor";
    public static NewCodeCoverageInCCTab_DetailsListRenderComplete = "VSO.TFS.DTA.NewCodeCoverageInCCTab.DetailsListRenderComplete";
    public static NewCodeCoverageInCCTab_DetailsListComponentDidMount = "VSO.TFS.DTA.NewCodeCoverageInCCTab.DetailsListComponentDidMount";
}
