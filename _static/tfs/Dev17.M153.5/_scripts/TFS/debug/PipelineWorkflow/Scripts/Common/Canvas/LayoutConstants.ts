
export class LayoutConstants {

    public static readonly corePropertiesWidth = 200;

    public static readonly corePropertiesHeight = 80;

    public static readonly releaseCorePropertiesHeight = 90;

    public static readonly horizontalMargin = 80;

    public static readonly verticalMargin = 60;

    public static readonly postDeploymentIndicatorElementRadius = 18;

    public static readonly postDeploymentIndicatorElementRadiusSmall = 14;

    public static readonly gatesInprogressIndicatorElementRadius = 17;

    public static readonly triggersAndPreDeploymentApprovalsElementWidth = LayoutConstants.postDeploymentIndicatorElementRadius * 2;

    public static readonly triggersAndPreDeploymentApprovalsElementHeight = 62;

    public static readonly prePostDeploymentApprovalsAndGatesElementHeight = 66;

    public static readonly stabilizationPhaseGatesRendererHeight = 50;

    public static readonly evaluationPhaseGatesRendererHeight = 46;

    public static readonly nodeWidth = LayoutConstants.corePropertiesWidth + LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth / 2 + LayoutConstants.postDeploymentIndicatorElementRadius;

    public static readonly nodeHeight = Math.max(LayoutConstants.corePropertiesHeight, LayoutConstants.triggersAndPreDeploymentApprovalsElementHeight, LayoutConstants.postDeploymentIndicatorElementRadius * 2);

    public static readonly releaseNodeHeight = Math.max(LayoutConstants.releaseCorePropertiesHeight, LayoutConstants.triggersAndPreDeploymentApprovalsElementHeight, LayoutConstants.postDeploymentIndicatorElementRadius * 2);

    public static readonly marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments = -LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth / 2;

    public static readonly marginLeftForPostDeploymentToOverlapOnCoreProperties = -LayoutConstants.postDeploymentIndicatorElementRadius;

    public static readonly artifactPropertiesWidth = 140;

    public static readonly artifactPropertiesHeight = 90;

    public static readonly artifactPropertiesTopMargin = 10;

    public static readonly artifactTriggerRadius = 18;

    public static readonly artifactTriggerLeftMargin = 30;

    public static readonly artifactLeftMargin = 10;

    public static readonly releaseScheduleTriggerSideLength = 18;

    public static readonly gapBetweenArtifactAndEnvironmentPanel = 20;

    public static readonly verticalMarginOfEdgeJoiningArtifactAndEnvironmentPanel = 153;

    public static readonly gridFocusZoneCellHeight = 10;

    public static readonly gridFocusZoneCellWidth = 10;

    public static readonly gridFocusMargin = 5;

    public static readonly inProgressPhaseContentHeight = 130;

    public static readonly inProgressDeploymentGroupPhaseContentHeight = 55;

    public static readonly subStatusMargin = 15;

    public static readonly subStatusLineHeight = 20;
}

export class ReleaseSummaryLayoutConstants {

    public static readonly verticalMarginOfEdgeJoiningReleaseAndEnvironmentPanel = 140;

    public static readonly gapBetweenReleaseAndEnvironmentPanel = 20;

    public static readonly releasePropertiesWidth = 200;

    public static readonly releasePropertiesMinimumHeight = 195;
}


/**
 * Below are the measures used in unit tests for graph layout helper. Copy paste these measurements above to debug unit test failures.
 */
// tslint:disable-next-line:max-classes-per-file
class UnitTestLayoutConstants {

    public static corePropertiesWidth = 60;

    public static corePropertiesHeight = 100;

    public static readonly releaseCorePropertiesHeight = 90;

    public static horizontalMargin = 100;

    public static verticalMargin = 100;

    public static postDeploymentApprovalsElementRadius = 20;

    public static triggersAndPreDeploymentApprovalsElementWidth = LayoutConstants.postDeploymentIndicatorElementRadius * 2;

    public static triggersAndPreDeploymentApprovalsElementHeight = 26;

    public static nodeWidth = LayoutConstants.corePropertiesWidth + LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth / 2 + LayoutConstants.postDeploymentIndicatorElementRadius;

    public static nodeHeight = Math.max(LayoutConstants.corePropertiesHeight, LayoutConstants.triggersAndPreDeploymentApprovalsElementHeight, LayoutConstants.postDeploymentIndicatorElementRadius * 2);

    public static readonly releaseNodeHeight = Math.max(LayoutConstants.releaseCorePropertiesHeight, LayoutConstants.triggersAndPreDeploymentApprovalsElementHeight, LayoutConstants.postDeploymentIndicatorElementRadius * 2);

    public static marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments = -LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth / 2;

    public static marginLeftForPostDeploymentToOverlapOnCoreProperties = -LayoutConstants.postDeploymentIndicatorElementRadius;

    public static artifactPropertiesRadius = 45;

    public static artifactTriggerRadius = 18;

    public static releaseScheduleTriggerSideLength = 18;

    public static gapBetweenArtifactAndEnvironmentPanel = 20;

    public static verticalMarginOfEdgeJoiningArtifactAndEnvironmentPanel = 140;

}

export class ReleaseEnvironmentSummaryCanvasConstants {
    public static readonly nodeWidth = 150;
    public static readonly verticalMarginOfEdgeJoiningReleaseAndEnvironmentPanel = 107;
    public static readonly verticalMargin = 40;
}

export class ReleaseProgressCanvasConstants {
    public static readonly verticalMargin = (LayoutConstants.verticalMargin + LayoutConstants.releaseScheduleTriggerSideLength);
    public static readonly horizontalMargin = 100;
}