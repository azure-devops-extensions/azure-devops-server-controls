import { IGitRepositorySource } from "VersionControl/Scripts/Sources/GitRepositorySource";
import { IPullRequestDetailSource } from "VersionControl/Scripts/Sources/PullRequestDetailSource";
import { IPullRequestChangesSource } from "VersionControl/Scripts/Sources/PullRequestChangesSource";
import { IDiscussionSource } from "VersionControl/Scripts/Sources/IDiscussionSource";
import { IAttachmentSource } from "VersionControl/Scripts/Sources/IAttachmentSource";
import { NavigationSource } from "VersionControl/Scripts/Sources/NavigationSource";
import { IPolicyEvaluationSource } from "VersionControl/Scripts/Sources/PolicyEvaluationSource";
import { RefFavoriteSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/RefFavoriteSource";
import { IBuildSource } from "VersionControl/Scripts/Sources/BuildSource";
import { IReviewerSource } from "VersionControl/Scripts/Sources/ReviewerSource";
import { IUserPreferenceSource } from "VersionControl/Scripts/Sources/UserPreferenceSource";
import { IRelatedWorkItemSource } from "VersionControl/Scripts/Sources/RelatedWorkItemSource";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";
import { IConflictSource } from "VersionControl/Scripts/Sources/ConflictSource";
import { IDataProviderSource } from "VersionControl/Scripts/Sources/DataProviderSource";

import { ClientPolicyEvaluationSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/ClientPolicyEvaluationSource";
import { IPullRequestAutoCompleteSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestAutoCompleteSource";
import { IPullRequestLabelsSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestLabelsSource";
import { IPullRequestStatusSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestStatusSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { FavoritesPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/FavoritesPermissionsSource";

// Hub holds instances of all Sources used by PullRequestDetails view
export class SourcesHub {
    public gitRepositorySource: IGitRepositorySource;
    public pullRequestDetailSource: IPullRequestDetailSource;
    public pullRequestChangesSource: IPullRequestChangesSource;
    public discussionSource: IDiscussionSource;
    public attachmentSource: IAttachmentSource;
    public navigationSource: NavigationSource;
    public policyEvaluationSource: IPolicyEvaluationSource;
    public buildSource: IBuildSource;
    public reviewerSource: IReviewerSource;
    public userPreferenceSource: IUserPreferenceSource;
    public relatedWorkItemSource: IRelatedWorkItemSource;
    public featureAvailabilitySource: FeatureAvailabilitySource;
    public conflictSource: IConflictSource;
    public dataProviderSource: IDataProviderSource;
    public pullRequestStatusSource: IPullRequestStatusSource;
    public pullRequestLabelsSource: IPullRequestLabelsSource;
    public pullRequestAutoCompleteSource: IPullRequestAutoCompleteSource;
    public gitPermissionsSource: GitPermissionsSource;
    public settingsPermissionsSource: SettingsPermissionsSource;
    public favoritesPermissionsSource: FavoritesPermissionsSource;
    public refFavorite: RefFavoriteSource;
    public clientPolicyEvaluationSource: ClientPolicyEvaluationSource;
}
