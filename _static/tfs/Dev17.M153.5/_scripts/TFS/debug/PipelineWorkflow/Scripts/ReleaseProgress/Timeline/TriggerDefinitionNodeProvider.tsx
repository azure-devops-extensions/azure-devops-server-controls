import * as React from "react";

import { PrimaryButton } from "OfficeFabric/Button";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import { PipelineEnvironmentTriggerTypeConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { EnvironmentArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/EnvironmentArtifactTriggerUtils";
import { IArtifactTriggerContainer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";
import { IReleaseSummaryArtifact } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ActionClickTarget, IReleaseEnvironmentActionInfo, ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { curry } from "VSS/Utils/Core";
import { empty, equals, localeFormat } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { VssIcon, VssIconType, IVssIconProps } from "VSSUI/VssIcon";

interface IArtifactData {
    icon?: string;
    name: string;
    branch?: string;
}

interface IArtifactConditionData {
    exclude?: boolean;
    branch?: string;
    tags?: string[];
}

interface IArtifactConditionsData {
    artifactData: IArtifactData;
    exclusions?: IArtifactConditionData[];
    inclusions?: IArtifactConditionData[];
}

interface IEnvironmentTriggerDefinitionData {
    areArtifactsConditionsMet?: boolean;
    isTriggeredOnReleaseCreation?: boolean;
    dependentEnvironmentNames?: string[];
    equivalentDeploymentReason: RMContracts.DeploymentReason;
    nextScheduledUtcTime?: Date;
    artifactToFailingConditionsDataMap?: IDictionaryStringTo<IArtifactConditionsData>;
    pullRequestDeploymentEnabled?: boolean;
}

export class TriggerDefinitionNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _environment: RMContracts.ReleaseEnvironment,
        private _deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>,
        private _artifactSummaryList?: IReleaseSummaryArtifact[],
        private _releaseReason?: RMContracts.ReleaseReason
    ) {
        this._environmentTriggerDefinitionData = this._getEnvironmentTriggerDefinitionData(this._environment);
    }

    public getKey(): string {
        return "trigger-snapshot";
    }

    public getIconProps(): IVssIconProps {
        if ((this._releaseReason === RMContracts.ReleaseReason.PullRequest
            && !this._environmentTriggerDefinitionData.pullRequestDeploymentEnabled
            && this._environmentTriggerDefinitionData.isTriggeredOnReleaseCreation)
            || (this._environmentTriggerDefinitionData.equivalentDeploymentReason === RMContracts.DeploymentReason.Automated
                && !this._environmentTriggerDefinitionData.areArtifactsConditionsMet)) {
            // TODO: use trigger failed icon
            return {
                iconName: css("bowtie-trigger", "trigger-failed"),
                iconType: VssIconType.bowtie
            };
            
        }

        return {
            iconName: "bowtie-trigger",
            iconType: VssIconType.bowtie
        };
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        return this._initializeTriggerDefinitionSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        let header = empty;

        switch (this._environmentTriggerDefinitionData.equivalentDeploymentReason) {
            case RMContracts.DeploymentReason.Automated:
                if (!this._environmentTriggerDefinitionData.areArtifactsConditionsMet) {
                    header = Resources.ArtifactConditionsNotMetText;
                }
                else if (this._releaseReason === RMContracts.ReleaseReason.PullRequest) {
                    header = this._environmentTriggerDefinitionData.pullRequestDeploymentEnabled
                        ? Resources.Timeline_PRTrigger_Enabled
                        : Resources.Timeline_PRTrigger_Disabled;
                }
                else {
                    header = Resources.TimelineHeaderAutomaticTriggerPending;
                }
                break;
            case RMContracts.DeploymentReason.Manual:
                header = Resources.TimelineHeaderManualTriggerPending;
                break;
            case RMContracts.DeploymentReason.Scheduled:
                header = Resources.TimelineHeaderScheduledTriggerPending;
                break;
        }

        return {
            name: header
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        let descriptionData: Types.ISnapshotDescriptionData = {};

        switch (this._environmentTriggerDefinitionData.equivalentDeploymentReason) {
            case RMContracts.DeploymentReason.Manual:
                descriptionData.text = Resources.TimelineDescriptionManualTrigger;
                break;
            case RMContracts.DeploymentReason.Automated:
                if (!this._environmentTriggerDefinitionData.areArtifactsConditionsMet) {
                    descriptionData.text = Resources.TimelineDescriptionAutomaticTriggerConditionsNotMet;
                }
                else if (this._releaseReason === RMContracts.ReleaseReason.PullRequest && !this._environmentTriggerDefinitionData.pullRequestDeploymentEnabled) {
                    descriptionData.text = this._environmentTriggerDefinitionData.isTriggeredOnReleaseCreation
                        ? Resources.Timeline_PRTrigger_EnableOnCurrentEnvironmentText
                        : Resources.Timeline_PRTrigger_EnableOnCurrentAndPreviousEnvironmentsText;
                }
                else {
                    const dependentEnvironments = this._environmentTriggerDefinitionData.dependentEnvironmentNames;
                    let dependentEnvironmentsText = empty;
                    if (dependentEnvironments.length === 1) {
                        dependentEnvironmentsText = localeFormat(
                            Resources.TimelineDescriptionAutomaticTriggerEnvironmentFormat1,
                            dependentEnvironments[0]
                        );
                    }
                    else if (dependentEnvironments.length > 1) {
                        dependentEnvironmentsText = localeFormat(
                            Resources.TimelineDescriptionAutomaticTriggerEnvironmentFormatMany,
                            dependentEnvironments[0],
                            dependentEnvironments.length - 1);
                    }
                    descriptionData.descriptionElement = (
                        <FormatComponent format={Resources.TimelineDescriptionAutomaticTrigger} elementType="div">
                            <span className="text-highlight">{dependentEnvironmentsText}</span>
                        </FormatComponent>
                    );
                }
                break;
            case RMContracts.DeploymentReason.Scheduled:
                descriptionData.timeStampDescriptionPrefix = Resources.TimelineDescriptionDeploymentScheduledPrefix;
                descriptionData.timeStamp = this._environmentTriggerDefinitionData.nextScheduledUtcTime;
                break;
        }

        return descriptionData;
    }

    public getAdditionalContent(instanceId?: string): JSX.Element {
        if (this._deploymentActionsMap) {
            const deployActionInfo = this._deploymentActionsMap[ReleaseEnvironmentAction.Deploy];
            if (deployActionInfo && deployActionInfo.isVisible) {

                switch (this._environmentTriggerDefinitionData.equivalentDeploymentReason) {
                    case RMContracts.DeploymentReason.Manual:
                        return (
                            <PrimaryButton
                                onClick={this._onDeployClick(deployActionInfo, instanceId)}
                                disabled={deployActionInfo.isDisabled}>
                                {deployActionInfo.actionText}
                            </PrimaryButton>
                        );
                    case RMContracts.DeploymentReason.Automated:
                        if (!this._environmentTriggerDefinitionData.areArtifactsConditionsMet && !deployActionInfo.isDisabled) {

                            const failingArtifactConditionsSection: JSX.Element[] = this._getFailingArtifactConditionsSection();

                            return (
                                <div>
                                    {failingArtifactConditionsSection}
                                    {this._getDeployManuallyLinkElement(deployActionInfo, instanceId)}
                                </div>
                            );
                        }
                    default:
                        if (!deployActionInfo.isDisabled) {
                            return this._getDeployManuallyLinkElement(deployActionInfo, instanceId);
                        }
                }
            }
        }

        return null;
    }

    private _getDeployManuallyLinkElement(deployActionInfo: IReleaseEnvironmentActionInfo, instanceId?: string): JSX.Element {
        const onDeployClick = this._onDeployClick(deployActionInfo, instanceId);
        return (
            <FormatComponent format={Resources.UserActionTextFormat} elementType="div" className="deploy-manually-text">
                <Link
                    onClick={onDeployClick}
                    onKeyDown={curry(this._handleKeyDownOnDeployManually, onDeployClick)}
                    className="deploy-link"
                >
                    {Resources.DeployManuallyActionText}
                </Link>
            </FormatComponent>
        );
    }

    private _getFailingArtifactConditionsSection(): JSX.Element[] {
        let sectionContent: JSX.Element[] = [];

        if (this._environmentTriggerDefinitionData && this._environmentTriggerDefinitionData.artifactToFailingConditionsDataMap) {
            Object.keys(this._environmentTriggerDefinitionData.artifactToFailingConditionsDataMap).forEach((key) => {
                if (key && key !== empty
                    && this._environmentTriggerDefinitionData.artifactToFailingConditionsDataMap.hasOwnProperty(key)
                    && this._environmentTriggerDefinitionData.artifactToFailingConditionsDataMap[key]) {

                    const conditionsData = this._environmentTriggerDefinitionData.artifactToFailingConditionsDataMap[key];

                    if (!(conditionsData.artifactData && (
                        (conditionsData.exclusions && conditionsData.exclusions.length > 0)
                        || (conditionsData.inclusions && conditionsData.inclusions.length > 0)
                    ))) {
                        return null;
                    }

                    const headerElement = this._getHeaderElement(conditionsData.artifactData);
                    const exclusionsElements = this._getConditionElements(conditionsData.exclusions);
                    const inclusionsElements = this._getConditionElements(conditionsData.inclusions);

                    sectionContent.push(
                        <div key={key} className="artifact-conditions-section">
                            {headerElement}
                            {Resources.TimelineContent_ArtifactCondition_SubText}
                            {exclusionsElements}
                            {inclusionsElements}
                        </div>
                    );
                }
            });
        }

        return sectionContent;
    }

    private _getHeaderElement(artifactData: IArtifactData): JSX.Element {
        let headerElement: JSX.Element = null;

        const artifactNameElement: JSX.Element = (
            <FormatComponent format={Resources.TimelineContent_ArtifactCondition_ArtifactNameFormat} elementType="div" className="artifact-name text-highlight">
                <VssIcon
                    iconName={artifactData.icon}
                    iconType={VssIconType.bowtie}
                />
                {artifactData.name}
            </FormatComponent>
        );

        const branchElement: JSX.Element = this._getBranchElement(artifactData.branch);

        if (branchElement) {
            headerElement = (
                <FormatComponent format={Resources.TimelineContent_ArtifactCondition_HeaderBranchFormat} elementType="div" className="artifact-conditions-header">
                    {artifactNameElement}
                    {branchElement}
                </FormatComponent>
            );
        }
        else {
            headerElement = artifactNameElement;
        }

        return headerElement;
    }

    private _getConditionElements(conditionsData: IArtifactConditionData[]): JSX.Element[] {
        return conditionsData.map((conditionData: IArtifactConditionData, index: number) => {
            const branchElement: JSX.Element = this._getBranchElement(conditionData.branch);
            const tagsElement: JSX.Element = this._getTagsElement(conditionData.tags);

            let conditionElementFormat: string = empty;
            if (branchElement && tagsElement) {
                conditionElementFormat = Resources.TimelineContent_ArtifactCondition_BranchAndTagsConditionFormat;
            }
            else if (branchElement || tagsElement) {
                conditionElementFormat = Resources.TimelineContent_ArtifactCondition_BranchOrTagsConditionFormat;
            }

            const conditionElement: JSX.Element = (
                <FormatComponent format={conditionElementFormat} elementType="div" className="artifact-condition-text">
                    {conditionData.exclude ? Resources.Exclude : Resources.Include}
                    {branchElement}
                    {tagsElement}
                </FormatComponent>
            );

            return (conditionElement &&
                <div key={index}>
                    {conditionElement}
                </div>
            );
        });
    }

    private _getBranchElement(branchName: string): JSX.Element {
        if (branchName && branchName.trim()) {
            return (
                <FormatComponent format={Resources.TimelineContent_ArtifactCondition_BranchNameFormat} elementType="div" className="branch-name text-highlight">
                    <VssIcon
                        className="inline-icon"
                        iconName="bowtie-tfvc-branch"
                        iconType={VssIconType.bowtie}
                    />
                    {branchName}
                </FormatComponent>
            );
        }

        return null;
    }

    private _getTagsElement(tags: string[]): JSX.Element {
        if (tags && tags.length > 0) {
            const tagsString = tags.join(Resources.CommaSeperatorForJoin);
            return (
                <FormatComponent format={Resources.TimelineContent_ArtifactCondition_TagsListFormat} elementType="div" className="tags-list text-highlight">
                    <VssIcon
                        className="inline-icon"
                        iconName="Tag"
                        iconType={VssIconType.fabric}
                    />
                    {tagsString}
                </FormatComponent>
            );
        }

        return null;
    }

    private _getEnvironmentTriggerDefinitionData(environment: RMContracts.ReleaseEnvironment): IEnvironmentTriggerDefinitionData {
        let equivalentDeploymentReason: RMContracts.DeploymentReason = RMContracts.DeploymentReason.Manual;
        let dependentEnvironments: string[] = [];
        let areArtifactConditionsMet: boolean = true;
        let failingArtifactConditions: RMContracts.Condition[] = [];
        let isTriggeredOnReleaseCreation: boolean = false;

        if (environment.conditions) {
            for (const condition of environment.conditions) {
                switch (condition.conditionType) {
                    case RMContracts.ConditionType.Artifact:
                        areArtifactConditionsMet = areArtifactConditionsMet && condition.result;
                        if (!condition.result) {
                            failingArtifactConditions.push(condition);
                        }
                        break;
                    case RMContracts.ConditionType.EnvironmentState:
                        dependentEnvironments.push(condition.name);
                        equivalentDeploymentReason = RMContracts.DeploymentReason.Automated;
                        break;
                    case RMContracts.ConditionType.Event:
                        if (equals(condition.name, PipelineEnvironmentTriggerTypeConstants.ReleaseStarted, true)) {
                            isTriggeredOnReleaseCreation = true;
                            equivalentDeploymentReason = RMContracts.DeploymentReason.Automated;
                        }
                        break;
                }
            }
        }

        if (environment.status === RMContracts.EnvironmentStatus.Scheduled) {
            equivalentDeploymentReason = RMContracts.DeploymentReason.Scheduled;
        }

        return {
            areArtifactsConditionsMet: areArtifactConditionsMet,
            isTriggeredOnReleaseCreation: isTriggeredOnReleaseCreation,
            dependentEnvironmentNames: dependentEnvironments,
            equivalentDeploymentReason: equivalentDeploymentReason,
            nextScheduledUtcTime: environment.nextScheduledUtcTime,
            artifactToFailingConditionsDataMap: this._getArtifactToConditionsDataMap(failingArtifactConditions),
            pullRequestDeploymentEnabled: environment.environmentOptions && environment.environmentOptions.pullRequestDeploymentEnabled
        } as IEnvironmentTriggerDefinitionData;
    }

    private _getArtifactToConditionsDataMap(artifactConditions: RMContracts.Condition[]): IDictionaryStringTo<IArtifactConditionsData> {
        let artifactToConditionsDataMap: IDictionaryStringTo<IArtifactConditionsData> = {};

        const artifactTriggerContainers: IArtifactTriggerContainer[] = EnvironmentArtifactTriggerUtils.getArtifactTriggerContainers(artifactConditions);

        if (artifactTriggerContainers && artifactTriggerContainers.length > 0) {
            artifactTriggerContainers.forEach((artifactTriggerContainer: IArtifactTriggerContainer) => {
                let inclusions: IArtifactConditionData[] = [];
                let exclusions: IArtifactConditionData[] = [];
                if (artifactTriggerContainer.triggerConditions && artifactTriggerContainer.triggerConditions.length > 0) {
                    artifactTriggerContainer.triggerConditions.forEach((triggerCondition: RMContracts.ArtifactFilter) => {
                        const artifactConditionData = {
                            branch: triggerCondition.sourceBranch,
                            tags: triggerCondition.tags
                        } as IArtifactConditionData;

                        if (ArtifactTriggerUtils.isExcludeTrigger(triggerCondition.sourceBranch)) {
                            artifactConditionData.branch = ArtifactTriggerUtils.trimSourceBranch(triggerCondition.sourceBranch);
                            artifactConditionData.exclude = true;
                            exclusions.push(artifactConditionData);
                        }
                        else {
                            artifactConditionData.exclude = false;
                            inclusions.push(artifactConditionData);
                        }
                    });

                    if (!artifactToConditionsDataMap[artifactTriggerContainer.alias]) {
                        artifactToConditionsDataMap[artifactTriggerContainer.alias] = {
                            artifactData: {
                                name: artifactTriggerContainer.alias
                            } as IArtifactData
                        };
                    }

                    artifactToConditionsDataMap[artifactTriggerContainer.alias].inclusions = inclusions;
                    artifactToConditionsDataMap[artifactTriggerContainer.alias].exclusions = exclusions;
                }
            });

            if (this._artifactSummaryList && this._artifactSummaryList.length > 0) {
                this._artifactSummaryList.forEach((artifactSummary: IReleaseSummaryArtifact) => {
                    if (artifactToConditionsDataMap[artifactSummary.alias]) {
                        artifactToConditionsDataMap[artifactSummary.alias].artifactData = {
                            icon: artifactSummary.icon,
                            name: artifactSummary.alias,
                            branch: artifactSummary.sourceBranchText
                        } as IArtifactData;
                    }
                });
            }
        }

        return artifactToConditionsDataMap;
    }

    private _onDeployClick(deployActionInfo: IReleaseEnvironmentActionInfo, instanceId?: string) {
        return () => {
            deployActionInfo.onExecute(instanceId, ActionClickTarget.environmentSummary);
        };
    }

    private _handleKeyDownOnDeployManually = (onClick: () => void, e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            onClick();
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _initializeTriggerDefinitionSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        // current timestamp to make sure this is the latest element in the timeline
        callback(new Date());
    }

    private _environmentTriggerDefinitionData: IEnvironmentTriggerDefinitionData;
}