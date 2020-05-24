import { IdentitiesSource } from "VersionControl/Scenarios/ChangeDetails/Sources/IdentitiesSource";
import { IArtifactStatsSource } from "VersionControl/Scenarios/PullRequestList/Sources/ArtifactStatsSource";
import { IContributionsSource } from "VersionControl/Scenarios/PullRequestList/Sources/ContributionsSource";
import { DataProviderSource } from "VersionControl/Scenarios/PullRequestList/Sources/DataProviderSource";
import { IPullRequestListSource } from "VersionControl/Scenarios/PullRequestList/Sources/PullRequestListSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";

export class SourcesHub {
    public contributionsSource: IContributionsSource;
    public pullRequestListSource: IPullRequestListSource;
    public artifactStatsSource: IArtifactStatsSource;
    public featureAvailabilitySource: FeatureAvailabilitySource;
    public permissionsSource: GitPermissionsSource;
    public settingsPermissionsSource: SettingsPermissionsSource;
    public dataProviderSource: DataProviderSource;
    public identitiesSource: IdentitiesSource;
}
