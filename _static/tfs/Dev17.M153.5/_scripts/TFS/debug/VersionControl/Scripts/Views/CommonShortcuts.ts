import { getHistoryService } from "VSS/Navigation/Services";

import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import { RepositorySelector } from "VersionControl/Scripts/Controls/RepositorySelector";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

/**
 * Common VC area shortcuts for both TFVC and Git.
 */
export class VersionControlShortcutGroup extends ShortcutGroupDefinition {
    constructor(protected repositoryContext: RepositoryContext) {
        super(VCResources.KeyboardShortcutGroup_Code);

        this.registerShortcut("r", {
            description: VCResources.KeyboardShortcutDescription_SelectRepository,
            action: () => RepositorySelector.getInstance().show(),
        });
        this.registerPageNavigationShortcut("e", {
            description: VCResources.KeyboardShortcutDescription_Explorer,
            action: () => this.navigateToUrl(VersionControlUrls.getExplorerUrl(this.repositoryContext)),
        });
    }
}

/**
 * Common VC area shortcuts for Git repositories.
 */
export class GitShortcutGroup extends VersionControlShortcutGroup {
    constructor(repositoryContext: RepositoryContext) {
        super(repositoryContext);

        this.registerPageNavigationShortcut("h", {
            description: VCResources.KeyboardShortcutDescription_History,
            action: () => this.navigateToGitAction("history")
        });
        this.registerPageNavigationShortcut("b", {
            description: VCResources.KeyboardShortcutDescription_Branches,
            action: () => this.navigateToGitAction("branches")
        });
        this.registerPageNavigationShortcut("q", {
            description: VCResources.KeyboardShortcutDescription_PullRequests,
            action: () => this.navigateToGitAction("pullrequests")
        });

        this.registerPageNavigationShortcut("c p", {
            description: VCResources.KeyboardShortcutDescription_CreatePullRequest,
            action: () => this.navigateToNewPullRequest()
        });
    }

    private navigateToGitAction(action: string, fragment?: string) {
        let url = VersionControlUrls.getGitActionUrl(this.repositoryContext.getTfsContext(), this.repositoryContext.getRepository().name, action, null);
        if (fragment) {
            url = url + getHistoryService().getFragmentActionLink("createnew");
        }

        this.navigateToUrl(url);
    }

    private navigateToNewPullRequest() {
        const newPullRequestURL = VersionControlUrls.getCreatePullRequestUrl(this.repositoryContext as GitRepositoryContext);
        if (newPullRequestURL) {
            this.navigateToUrl(newPullRequestURL);
        }
    }
}

/**
 * Common VC area shortcuts for TFVC repositories.
 */
export class TfvcShortcutGroup extends VersionControlShortcutGroup {
    constructor(repositoryContext: RepositoryContext) {
        super(repositoryContext);

        this.registerPageNavigationShortcut("c", {
            description: VCResources.KeyboardShortcutDescription_Changesets,
            action: () => this.navigateToAction("changesets", "versionControl")
        });
        this.registerPageNavigationShortcut("v", {
            description: VCResources.KeyboardShortcutDescription_Shelvesets,
            action: () => this.navigateToAction("shelvesets", "versionControl")
        });
    }
}
