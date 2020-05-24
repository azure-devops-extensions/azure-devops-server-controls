import * as VSS from "VSS/VSS";
import { registerLinkFormAsync } from "WorkItemTracking/Scripts/LinkForm";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import * as WorkItemTrackingLinkingForms_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms";
import * as WorkItemLinkForm_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms.WorkItem";
import * as RemoteWorkItemLinkForm_Async from "WorkItemTracking/Scripts/Controls/Links/RemoteLinkForm";
import * as GitHubLinkForms_Async from "WorkItemTracking/Scripts/Controls/Links/GitHubLinkForms";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export function registerLinkForms() {
    //Ideally the following form registrations should be in their own area e.g. VC and build
    //We can not do that as on Work Item Load, beginGetLinkTypes expects these forms to be registered before the call is made
    //Which is not true for many scenarios e.g. Boards Hub where the VC and build modules are not loaded
    //There is no single place where we can add the VC/Build modules as dependency so they are loaded on all scenarios
    //This is the best we can do at this point given the cost/risk of moving beginGetLinkTypes out of TTI for WIT
    registerVCLinkForms();
    registerBuildLinkForms();
    registerTestLinkForms();
    registerWITLinkForms();
    registerWikiLinkForms();

    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.GitHubIntegration)) {
        registerExternalConnectionLinkForms();
    }
}

function registerVCLinkForms() {
    registerLinkFormAsync(RegisteredLinkTypeNames.Changeset, (callback: any) => {
        VSS.using(["VersionControl/Scripts/TFS.VersionControl.WorkItemIntegration.Linking"], (_VersionControlWIT) => {
            callback(_VersionControlWIT.ChangesetLinkForm);
        });
    });
    registerLinkFormAsync(RegisteredLinkTypeNames.VersionedItem, (callback: any) => {
        VSS.using(["VersionControl/Scripts/TFS.VersionControl.WorkItemIntegration.Linking"], (_VersionControlWIT) => {
            callback(_VersionControlWIT.VersionedItemLinkForm);
        });
    });
    registerLinkFormAsync(RegisteredLinkTypeNames.Commit, (callback: any) => {
        VSS.using(["VersionControl/Scripts/TFS.VersionControl.WorkItemIntegration.Linking"], (_VersionControlWIT) => {
            callback(_VersionControlWIT.CommitLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.Branch, (callback: any) => {
        VSS.using(["VersionControl/Scripts/TFS.VersionControl.WorkItemIntegration.Linking"], (_VersionControlWIT) => {
            callback(_VersionControlWIT.GitBranchLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.Tag, (callback: any) => {
        VSS.using(["VersionControl/Scripts/TFS.VersionControl.WorkItemIntegration.Linking"], (_VersionControlWIT) => {
            callback(_VersionControlWIT.GitTagLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.PullRequest, (callback: any) => {
        VSS.using(["VersionControl/Scripts/TFS.VersionControl.WorkItemIntegration.Linking"], (_VersionControlWIT) => {
            callback(_VersionControlWIT.PullRequestLinkForm);
        });
    });
}

function registerBuildLinkForms() {
    registerLinkFormAsync(RegisteredLinkTypeNames.Build, (callback: any) => {
        VSS.using(["Build/Scripts/WorkItemIntegration.Linking"], (_BuildWIT) => {
            callback(_BuildWIT.BuildLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.FoundInBuild, (callback: any) => {
        VSS.using(["Build/Scripts/WorkItemIntegration.Linking"], (_BuildWIT) => {
            callback(_BuildWIT.FoundInBuildLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.IntegratedInBuild, (callback: any) => {
        VSS.using(["Build/Scripts/WorkItemIntegration.Linking"], (_BuildWIT) => {
            callback(_BuildWIT.IntegratedInBuildLinkForm);
        });
    });
}

function registerTestLinkForms() {
    registerLinkFormAsync(RegisteredLinkTypeNames.TestResult, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms"], (_WIT: typeof WorkItemTrackingLinkingForms_Async) => {
            callback(_WIT.TestResultForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.ResultAttachment, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms"], (_WIT: typeof WorkItemTrackingLinkingForms_Async) => {
            callback(_WIT.TestResultAttachmentForm);
        });
    });
}

function registerWITLinkForms() {
    registerLinkFormAsync(RegisteredLinkTypeNames.Hyperlink, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms"], (_WIT: typeof WorkItemTrackingLinkingForms_Async) => {
            callback(_WIT.HyperlinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.Storyboard, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms"], (_WIT: typeof WorkItemTrackingLinkingForms_Async) => {
            callback(_WIT.StoryboardLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.WorkItemLink, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Forms.WorkItem"], (_WIT: typeof WorkItemLinkForm_Async) => {
            callback(_WIT.WorkItemLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.RemoteWorkItemLink, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/Controls/Links/RemoteLinkForm"], (_WIT: typeof RemoteWorkItemLinkForm_Async) => {
            callback(_WIT.RemoteLinkForm);
        });
    });
}

function registerWikiLinkForms() {
    registerLinkFormAsync(RegisteredLinkTypeNames.WikiPage, (callback: any) => {
        VSS.using(["Wiki/Scripts/WikiPageForm"], (_WikiWIT) => {
            callback(_WikiWIT.WikiPageForm);
        });
    });
}

function registerExternalConnectionLinkForms() {
    registerLinkFormAsync(RegisteredLinkTypeNames.GitHubPullRequestLinkType, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/Controls/Links/GitHubLinkForms"], (linkForm: typeof GitHubLinkForms_Async) => {
            callback(linkForm.GitHubPullRequestLinkForm);
        });
    });

    registerLinkFormAsync(RegisteredLinkTypeNames.GitHubCommitLinkType, (callback: any) => {
        VSS.using(["WorkItemTracking/Scripts/Controls/Links/GitHubLinkForms"], (linkForm: typeof GitHubLinkForms_Async) => {
            callback(linkForm.GitHubCommitLinkForm);
        });
    });
}
