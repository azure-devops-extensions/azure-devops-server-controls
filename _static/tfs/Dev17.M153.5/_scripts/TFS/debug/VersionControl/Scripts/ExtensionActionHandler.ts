import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");

export function versionControlExtensionActionHandler(repositoryContext: RepositoryContext, extensionHost: Extensions.ExtensionHost, discussionManager: DiscussionOM.DiscussionManager, currentDiscussionItemPath: string, message: any) {
    /// <summary>Handles version-control related extension actions</summary>

    let actionId = message.actionId,
        actionData = message.actionData || [],
        requestId = message.requestId;

    switch (actionId) {
        case VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT:
            repositoryContext.getClient().beginGetItemContentJson(
                repositoryContext,
                actionData.path,
                actionData.version,
                (result) => {
                    if (extensionHost && !extensionHost.isDisposed()) {
                        extensionHost.postMessage(actionId, $.extend(actionData, result), requestId);
                        extensionHost._fire(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT, actionData, result);
                    }
                },
                (error) => {
                    extensionHost.postMessage(actionId, $.extend(actionData, {
                        error: error.message
                    }), requestId);
                }
                );
            break;

        case VCControlsCommon.DiscussionExtensionActionIds.CREATE_THREAD:
            discussionManager.createNewDiscussionThread(currentDiscussionItemPath, actionData.position, (newThread: DiscussionCommon.DiscussionThread) => {
                extensionHost.postMessage(actionId, newThread, requestId);
            });
            break;
    }
}
