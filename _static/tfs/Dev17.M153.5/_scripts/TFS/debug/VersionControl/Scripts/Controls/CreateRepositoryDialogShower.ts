import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { VersionControlProjectInfo } from "TFS/VersionControl/Contracts";
import { CreateRepositoryResult } from "VersionControl/Scenarios/CreateRepository/Types";
import { using } from "VersionControl/Scripts/UsingWithStatusIndicator";

import * as _CreateRepoDialog from "VersionControl/Scenarios/CreateRepository/CreateRepositoryDialog";

/**
 *  Show the repository creation dialog.
 *  @param projectInfo The project in which the repository will be created.
 *  @param tfsContext The TfsContext used to obtain the clients.
 */
export function show(
    projectInfo: VersionControlProjectInfo,
    tfsContext: TfsContext,
    elementToFocusOnDismiss: HTMLElement,
    okCallback: (createdRepository: CreateRepositoryResult) => void,
    cancelCallback?: () => void,
): void {

    using(
        ["VersionControl/Scenarios/CreateRepository/CreateRepositoryDialog"],
        (VCCreateRepoDialog: typeof _CreateRepoDialog) => {

            VCCreateRepoDialog.CreateRepoDialog.show({
                projectInfo,
                tfsContext,
                elementToFocusOnDismiss,
                onCreated: okCallback,
                onCancelled: cancelCallback,
            });
        });
}
