import * as Dialogs from "VSS/Controls/Dialogs";
import * as Utils_String from "VSS/Utils/String";

import { GitRepository } from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitRepositoryNameDialog } from "VersionControl/Scripts/Controls/GitRepositoryNameDialog";

export function renameGitRepository(repository: GitRepository, options?: any) {
    return Dialogs.show(GitRepositoryNameDialog, $.extend({
        repository: repository,
        title: Utils_String.format(VCResources.GitRepositoryRenameDialogTitle, repository.name),
        okText: VCResources.GitRepositoryRenameDialogOktext,
        width: 560
    }, options));
}

export function deleteGitRepository(repository: GitRepository): Q.Promise<IMessageDialogResult> {
    const buttons: IMessageDialogButton[] = [{
        id: 'confirm-delete',
        text: VCResources.GitRepositoryDeleteDialogOkText,
        style: "warning"
    }, {
        id: 'id-cancel-delete',
        text: "Cancel",
        reject: true
    }];

    return Dialogs.showMessageDialog(Utils_String.format(VCResources.GitRepositoryDeleteDialogPrompt, repository.name),
        {
            title: Utils_String.format(VCResources.GitRepositoryDeleteDialogTitle, repository.name),
            requiredTypedConfirmation: repository.name,
            buttons,
            // Dialogs.ts is currently using the deprecated "bowtie-style" class; this messes up paragraph spacing. Use the newer "bowtie" class.
            useBowtieStyle: false,
            // HACK IShowMessageDialogOptions doesn't extend IMessageDialogOptions, but next props will be used via $.extend()
            bowtieVersion: 0,
            dialogClass: "bowtie",
        } as Dialogs.IShowMessageDialogOptions);
}
