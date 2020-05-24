import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { RepositorySelector } from "VersionControl/Scripts/Controls/RepositorySelector";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Navigation_Services from "VSS/Navigation/Services";

export interface GitShortcutGroupProps {
    repoContext: GitRepositoryContext;
    tfsContext: TfsContext;
    newPullRequestUrl: string;
    navigateToUrl(url: string): void;
}

export class GitShortcutGroup extends ShortcutGroupDefinition {

    constructor(private props: GitShortcutGroupProps ) {
        super(VCResources.KeyboardShortcutGroup_Code);

        this.registerShortcut("r", {
            description: VCResources.KeyboardShortcutDescription_SelectRepository,
            action: () => RepositorySelector.getInstance().show()
        });
        this.registerPageNavigationShortcut("e", {
            description: VCResources.KeyboardShortcutDescription_Explorer,
            action: () => props.navigateToUrl(VersionControlUrls.getExplorerUrl(props.repoContext))
        });

        this.registerPageNavigationShortcut("h", {
            description: VCResources.KeyboardShortcutDescription_History,
            action: () => this._navigateToGitAction("commits")
        });
        this.registerPageNavigationShortcut("b", {
            description: VCResources.KeyboardShortcutDescription_Branches,
            action: () => this._navigateToGitAction("branches")
        });
        this.registerPageNavigationShortcut("q", {
            description: VCResources.KeyboardShortcutDescription_PullRequests,
            action: () => this._navigateToGitAction("pullrequests")
        });

        this.registerPageNavigationShortcut("c p", {
            description: VCResources.KeyboardShortcutDescription_CreatePullRequest,
            action: () => props.navigateToUrl(props.newPullRequestUrl)
        });
    }

    private _navigateToGitAction(action: string, fragment?: string): void {
        let url = VersionControlUrls.getGitActionUrl(this.props.tfsContext, this.props.repoContext.getRepository().name, action, null);
        if (fragment) {
            url = url + Navigation_Services.getHistoryService().getFragmentActionLink(fragment);
        }
        this.props.navigateToUrl(url);
    }
}