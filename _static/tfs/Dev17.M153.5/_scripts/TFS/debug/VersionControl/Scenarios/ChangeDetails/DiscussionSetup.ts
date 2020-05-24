import { Action } from "VSS/Flux/Action";
import * as UserClaimsService from "VSS/User/Services";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { GitCommitPermissionsStore } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitCommitPermissionsStore";
import { DiscussionSource } from "VersionControl/Scenarios/ChangeDetails/Sources/DiscussionSource";
import { IDiscussionPermissionsStore, DiscussionPermissions } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";
import { IDiscussionSource } from "VersionControl/Scripts/Sources/IDiscussionSource";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { DiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionsStore";
import { IDiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { DiscussionRepaintStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionRepaintStore";
import { IDiscussionRepaintStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionRepaintStore";
import { DiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/DiscussionActionCreator";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { ActionsHub as DiscussionActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { DiscussionFluxWiring } from "VersionControl/Scenarios/PullRequestDetail/View/DiscussionFluxWiring";
import { DiscussionAdapter, DiscussionManagerStore as PRDiscussionManagerStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionManagerStore";
import { IDiscussionManagerStore as IPRDiscussionManagerStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionManagerStore";

export class DiscussionSetup {
    public static initialize(
        tfsContext: TfsContext,
        artifactUri: string,
        actionsHub: ActionsHub,
        discussionActionsHub: DiscussionActionsHub,
        discussionsStore: DiscussionsStore,
        permissionStore: IDiscussionPermissionsStore<DiscussionPermissions, any>): DiscussionAdapter {
        const discussionSource = new DiscussionSource(tfsContext, artifactUri);
        const prdiscussionManagerStore = new PRDiscussionManagerStore(null);
        const discussionActionCreator = new DiscussionActionCreator(tfsContext, discussionActionsHub);
        const discussionRepaintStore = new DiscussionRepaintStore();

        ServiceRegistry.initialize();
        ServiceRegistry.registerService(discussionSource as any, IDiscussionSource);
        ServiceRegistry.registerService(discussionActionCreator, IDiscussionActionCreator);
        ServiceRegistry.registerService(prdiscussionManagerStore, IPRDiscussionManagerStore);
        ServiceRegistry.registerService(discussionsStore, IDiscussionsStore);
        ServiceRegistry.registerService(discussionRepaintStore, IDiscussionRepaintStore);
        ServiceRegistry.registerService(permissionStore, IDiscussionPermissionsStore);

        DiscussionFluxWiring.initialize(discussionActionsHub);
        actionsHub.changeListItemDetailsLoaded.addListener(discussionRepaintStore.onPaint, discussionRepaintStore);
        actionsHub.changeListItemDetailsSelected.addListener(discussionRepaintStore.onPaint, discussionRepaintStore);

        return new DiscussionAdapter(
            discussionsStore,
            discussionActionCreator,
            discussionActionsHub);
    }

    public static populateDiscussions(tfsContext: TfsContext, repositoryContext: RepositoryContext, discussionActionsHub: DiscussionActionsHub): void {
        if(UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member)) {
            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);

            // set context
            discussionActionsHub.contextUpdated.invoke({
                tfsContext: tfsContext,
                repositoryContext: repositoryContext
            });

            // load discussion threads and send them to the discussion manager
            discussionActionCreator.queryDiscussionThreads(0, 0, true);
        }
    }

    public static dispose(): void {
        ServiceRegistry.dispose();
    }
}