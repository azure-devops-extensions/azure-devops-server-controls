import * as React from "react";
import { PrimaryButton } from "OfficeFabric/Button";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";
import { getId, css } from "OfficeFabric/Utilities";
import { GitStatus, GitStatusState } from "TFS/VersionControl/Contracts";
import { Flyout } from "VersionControl/Scenarios/Shared/Flyout";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";
import { getService as getUserClaimsService, UserClaims } from "VSS/User/Services";
import { getLocalService } from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";

import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

import "VSS/LoaderPlugins/Css!VersionControl/StatusBadge";

export interface StatusBadgeProps {
    className?: string;
    headerClassName?: string;
    statuses: GitStatus[];
    isSetupExperienceVisible: boolean;
    isSetupReleaseExperienceVisible: boolean;
    isSetupExperienceDisabled?: boolean;
    onSetupNowClick?(): void;
    onSetupReleaseClick?(): void;
    showOnlyBadge?: boolean;
}

export class StatusTextIcon extends React.Component<StatusBadgeProps, {}> {
    private _ariaDescribedById: string;

    constructor(props: StatusBadgeProps) {
        super(props);

        this._ariaDescribedById = getId("build-status-flyout-describedby");
    }

    public render(): JSX.Element {
        // filter out all not applicable statuses. They are not applicable and thus no need to display them.
        const statuses = (this.props.statuses || []).filter(s => s.state !== GitStatusState.NotApplicable);

        if (this.props.isSetupExperienceVisible) {
            return <StatusBadgeNotSetHeader onSetupNowClick={this.props.onSetupNowClick} isSetupExperienceDisabled={this.props.isSetupExperienceDisabled} />;
        }
        else if (this.props.isSetupReleaseExperienceVisible && statuses.length === 0) {
            return <SetupReleaseButton onSetupReleaseClick={this.props.onSetupReleaseClick} isSetupExperienceDisabled={this.props.isSetupExperienceDisabled} />;
        }

        const statusState = getProminentState(statuses);
        if (statusState === GitStatusState.NotSet) {
            return null;
        }

        return (
            <Flyout
                className={"status-badge-icon " + (this.props.className || "")}
                headerClassName={this.props.headerClassName || ""}
                isEnabled={statuses.length > 0}
                ariaDescribedBy={this._ariaDescribedById}
                setInitialFocus={true}
                dropdownContent={
                    <StatusFlyoutContent
                        statuses={statuses}
                        showSetupReleaseButton={this.props.isSetupReleaseExperienceVisible}
                        onSetupReleaseClick={this.props.onSetupReleaseClick}
                    />
                }
                calloutHasFocusableElements={true}
                calloutAriaLabel={VCResources.GitBranches_BuildStatusList}
                toolTip={Utils_String.format(VCResources.HistoryList_BuildTooltip, mapStateToCaption[statusState])}
                ariaLabel={VCResources.BuildStatusLabel}
            >
                <StatusTextIconHeader statusState={statusState} showOnlyBadge={this.props.showOnlyBadge} />
                <div className="hidden" id={this._ariaDescribedById}>
                    {VCResources.BuildStatusBadge_AriaDescription}
                </div>
            </Flyout>
        );
    }
}

export const StatusTextIconHeader = (props: {
    statusState: GitStatusState,
    showOnlyBadge?: boolean,
}): JSX.Element => {
    if (props.statusState === GitStatusState.NotSet) {
        return null;
    }

    return (
        <span>
            <StatusSoloIcon status={props.statusState} stateAsTooltip={props.showOnlyBadge} />
            {
                !props.showOnlyBadge &&
                <span className={"status-state " + mapStateToStyle[props.statusState]}>
                    {mapStateToCaption[props.statusState]}
                </span>
            }
        </span>
    );
};

const StatusSoloIcon = (props: {
    status: GitStatusState,
    stateAsTooltip?: boolean,
}): JSX.Element => {
    let tooltip: string = VCResources.GitStatusTitle;

    if (props.stateAsTooltip) {
        tooltip = Utils_String.format(VCResources.HistoryList_BuildTooltip, mapStateToCaption[props.status]);
    }

    return <span className={getStatusBowtieIcon(props.status)} />;
};

const StatusBadgeNotSetHeader = (props: {
    onSetupNowClick(): void,
    isSetupExperienceDisabled?: boolean,
}): JSX.Element =>
    <PrimaryButton className="status-badge-icon" onClick={props.onSetupNowClick} disabled={props.isSetupExperienceDisabled}>
        <span className="bowtie-icon bowtie-build" />
        {VCResources.GitStatusStateSetupBuildCaption}
    </PrimaryButton>;

const SetupReleaseButton = (props: {
    onSetupReleaseClick(): void,
    isSetupExperienceDisabled?: boolean,
}): JSX.Element =>
    <PrimaryButton className="setup-release-button status-badge-icon" onClick={props.onSetupReleaseClick} disabled={props.isSetupExperienceDisabled}>
        <span className="bowtie-icon bowtie-deploy" />
        {VCResources.SetupRelease}
    </PrimaryButton>;

const mapStateToProminentIndex = {
    [GitStatusState.Error]: 1,
    [GitStatusState.Failed]: 2,
    [GitStatusState.Pending]: 3,
    [GitStatusState.Succeeded]: 4,
    [GitStatusState.NotSet]: 5,
};

export function getProminentState(statuses: GitStatus[]): GitStatusState {
    if (!statuses) {
        return GitStatusState.NotSet;
    }

    return statuses.reduce(
        (previous, status) => mapStateToProminentIndex[previous] < mapStateToProminentIndex[status.state] ? previous : status.state,
        GitStatusState.NotSet);
}

function getStatusBowtieIcon(state: GitStatusState): string {
    return "status-icon bowtie-icon " + mapStateToBowtieIcon[state] + " " + mapStateToStyle[state];
}

const releaseManagementStatusGenre = "continuous-deployment/release";
const releaseManagementContextNameSeperator = ")^!!(!";
const buildStatusGenre = "continuous-integration";
const buildStatusNamePrefix = "build/";
const releaseManagementTruncatedPostFix = "#$";
const releaseDefinitionNameMaxLength = 90;

const mapStateToBowtieIcon = {
    [GitStatusState.Error]: "bowtie-status-error-sm",
    [GitStatusState.Failed]: "bowtie-edit-delete",
    [GitStatusState.Pending]: "bowtie-play-fill",
    [GitStatusState.Succeeded]: "bowtie-check",
    [GitStatusState.NotSet]: "",
};

const mapStateToStyle = {
    [GitStatusState.Error]: "error",
    [GitStatusState.Failed]: "failure",
    [GitStatusState.Pending]: "pending",
    [GitStatusState.Succeeded]: "success",
    [GitStatusState.NotSet]: "not-set",
};

const mapStateToCaption = {
    [GitStatusState.Error]: VCResources.GitStatusStateError,
    [GitStatusState.Failed]: VCResources.GitStatusStateFailed,
    [GitStatusState.Pending]: VCResources.GitStatusStatePending,
    [GitStatusState.Succeeded]: VCResources.GitStatusStateSucceeded,
    [GitStatusState.NotSet]: VCResources.GitStatusStateNeverBuilt,
};

export interface IReleaseStatusContext {
    definitionName: string;
    rank: number;
}

export function parseReleaseContextName(contextName: string): IReleaseStatusContext {
    if (!contextName) {
        return null;
    }
    let seperator: string = releaseManagementContextNameSeperator;
    if (contextName.indexOf(seperator) < 0) {
        seperator = "/"
    }

    const parts = contextName.split(seperator);

    // Environment name was a part of the context previously. It has been removed because it wasn't required
    // Old statuses will have 3 parts. We need to handler both cases
    // "/" was the old seperator. So if the context name contains rd name and rank, the seperator shouldn't be "/"
    if (parts.length !== 3 && (parts.length !== 2 || seperator === "/")) {
        return null;
    }

    const definitionName = parts[0].lastIndexOf(releaseManagementTruncatedPostFix) === (releaseDefinitionNameMaxLength - releaseManagementTruncatedPostFix.length)
        ? Utils_String.localeFormat(VCResources.ReleaseGitStatusEllipsisFormat, parts[0].substring(0, releaseDefinitionNameMaxLength - releaseManagementTruncatedPostFix.length))
        : parts[0];

    let rank = 0;
    if (parts.length === 3) {
        rank = parseInt(parts[2], 10);
    }
    else if (parts.length === 2) {
        rank = parseInt(parts[1], 10);
    }

    return {
        definitionName: definitionName,
        rank: rank
    }
}

export function filterOutReleaseStatuses(
    statuses: GitStatus[],
    releaseStatuses: { [key: string]: GitStatus[] },
    nonReleaseStatuses: GitStatus[]
): void {
    statuses.forEach((status: GitStatus) => {
        if (status.context.genre === releaseManagementStatusGenre) {
            const context = parseReleaseContextName(status.context.name);
            if (!!context && !!context.definitionName) {
                if (!releaseStatuses.hasOwnProperty(context.definitionName)) {
                    releaseStatuses[context.definitionName] = [];
                }

                releaseStatuses[context.definitionName].push(status);
            }
            else {
                nonReleaseStatuses.push(status);
            }
        }
        else {
            nonReleaseStatuses.push(status);
        }
    });

    return;
}

export interface StatusFlyoutContentProps {
    statuses: GitStatus[];
    ignoreNonReleaseIcon?: boolean;
    stateIconClassName?: string;
    secondarySectionClassName?: string;
    showSetupReleaseButton?: boolean;
    onSetupReleaseClick?(): void;
}

export const StatusFlyoutContent = (props: StatusFlyoutContentProps) => {
    const releaseStatuses: { [key: string]: GitStatus[] } = {};
    const nonReleaseStatuses: GitStatus[] = [];

    filterOutReleaseStatuses(props.statuses, releaseStatuses, nonReleaseStatuses);

    return (
        <FocusZone className="status-flyout-content" direction={FocusZoneDirection.bidirectional}>
            {
                nonReleaseStatuses && nonReleaseStatuses.map(status =>
                    <StatusRow
                        key={status.description + status.creationDate.getMilliseconds().toString()}
                        status={status}
                        ignoreNonReleaseIcon={props.ignoreNonReleaseIcon}
                        stateIconClassName={props.stateIconClassName}
                        secondarySectionClassName={props.secondarySectionClassName}
                        isBuild={isBuildStatus(status)}
                    />)
            }
            {
                props.showSetupReleaseButton && <SetupReleaseButton onSetupReleaseClick={props.onSetupReleaseClick} />
            }
            {
                Object.getOwnPropertyNames(releaseStatuses).map((definitionName: string) =>
                    <ReleaseStatusRow
                        key={definitionName + releaseStatuses[definitionName][0].creationDate.getMilliseconds().toString()}
                        statuses={releaseStatuses[definitionName]}
                        definitionName={definitionName}
                        stateIconClassName={props.stateIconClassName}
                    />)
            }
        </FocusZone>);
};

function isBuildStatus(status: GitStatus): boolean {
    return status.context.genre === buildStatusGenre
        && status.context.name
        && status.context.name.indexOf(buildStatusNamePrefix) === 0;
}

const StatusRow = (props: { status: GitStatus, ignoreNonReleaseIcon?: boolean, stateIconClassName?: string, secondarySectionClassName?: string, isBuild: boolean }) => {
    const secondaryText = props.status.context.genre ? props.status.context.genre + "/" + props.status.context.name
        : props.status.context.name;
    const description = props.status.description || props.status.context.name;

    return <div className="status-tooltip-row">
        <div className="status-tooltip-primary">
            {!props.ignoreNonReleaseIcon && <span className={css("type-icon", "bowtie-icon", "bowtie-build")} />}
            <FpsLink
                className="status-target-url-link"
                href={props.status.targetUrl}
                targetHubId={props.isBuild && CodeHubContributionIds.newBuildEditorContributionId}>
                {description}
            </FpsLink>
            <span className={css(getStatusBowtieIcon(props.status.state), props.stateIconClassName)} />
        </div>
        <div className={css("status-tooltip-secondary", props.secondarySectionClassName)}>
            {secondaryText}
        </div>
    </div>;
};

const ReleaseStatusRow = (props: { statuses: GitStatus[], definitionName: string, stateIconClassName?: string }) => {
    const sortedStatuses = getReleaseGitStatusesSortedByRank(props.statuses);

    return (
        <div className="release-status status-tooltip-row">
            <div className="status-tooltip-primary">
                <span className="type-icon bowtie-icon bowtie-deploy" />
                <FpsLink
                    tabIndex={0}
                    className="status-target-url-link"
                    href={getLatestReleaseSummaryUrl(sortedStatuses)}
                    targetHubId={CodeHubContributionIds.releaseProgressHub}>
                    {props.definitionName}
                </FpsLink>
            </div>
            <div className={"status-tooltip-secondary"}>
                {releaseManagementStatusGenre + "/" + props.definitionName}
            </div>
            <div className={css("release-status-container", props.stateIconClassName)}>
                {sortedStatuses.map((status, index) =>
                    <div
                        key={"status-" + index + status.context.name}
                        className={"env-details"}>
                        <TooltipHost
                            content={status.description}
                            directionalHint={DirectionalHint.bottomLeftEdge}>
                            <FpsLink
                                aria-label={status.description}
                                className={"status-link"}
                                href={getReleaseEnvironmentStatusUrl(status)}
                                targetHubId={CodeHubContributionIds.releaseProgressHub}>
                                <div
                                    className={"env-status " + mapStateToStyle[status.state]}>
                                    <span className={getStatusBowtieIcon(status.state)} />
                                </div>
                            </FpsLink>
                        </TooltipHost>
                    </div>
                )
                }
            </div>
        </div>);
};

export function getReleaseGitStatusesSortedByRank(statuses: GitStatus[]): GitStatus[] {
    return statuses.sort((status1: GitStatus, status2: GitStatus) => {
        const status1Context = parseReleaseContextName(status1.context.name);
        const status2Context = parseReleaseContextName(status2.context.name);

        if (!!status1Context && !!status2Context && !isNaN(status1Context.rank) && !isNaN(status2Context.rank)) {
            return status1Context.rank - status2Context.rank;
        }

        // This shouldn't be the case, but we will ignore this and push all these instances to the end
        return 1;
    });
}

export function getLatestReleaseSummaryUrl(statuses: GitStatus[]): string {
    const releasePageUrl = statuses[0].targetUrl.split("?")[0];
    const maxReleaseId = Math.max(...statuses.map((s) => {
        return parseInt(s.targetUrl.match(/releaseId=([0-9]+)/)[1], 10)
    }));

    // Add special handling for anonymous access right now. 
    // This will be resolved in future, when the new release editor will be the main stay. A work around till then only meant for anon access
    // Having this check in the front end, because the status being published isn't aware of who will be seeing it
    if (!getUserClaimsService().hasClaim(UserClaims.Member)) {
        const hubUrl = getLocalService(HubsService).getHubById("ms.vss-releaseManagement-web.cd-release-progress").uri;

        return Utils_String.format("{0}?releaseId={1}&_a=release-pipeline-progress", hubUrl, maxReleaseId);
    }
    else {
        return releasePageUrl + "?_a=release-summary&releaseId=" + maxReleaseId;
    }
}

function getReleaseEnvironmentStatusUrl(status: GitStatus): string {
    // Add special handling for anonymous access right now. 
    // This will be resolved in future, when the new release editor will be the main stay. A work around till then only meant for anon access
    // Having this check in the front end, because the status being published isn't aware of who will be seeing it
    if (!getUserClaimsService().hasClaim(UserClaims.Member)) {
        const targetUrl = status.targetUrl;
        const releaseId: number = parseInt(targetUrl.match(/releaseId=([0-9]+)/)[1], 10);
        const releaseEnvironmentId: number = parseInt(targetUrl.match(/releaseEnvironmentId=([0-9]+)/)[1], 10);
        const hubUrl = getLocalService(HubsService).getHubById("ms.vss-releaseManagement-web.cd-release-progress").uri;

        return Utils_String.format("{0}?releaseId={1}&environmentId={2}&_a=release-environment-logs", hubUrl, releaseId, releaseEnvironmentId);
    }
    else {
        return status.targetUrl;
    }
}