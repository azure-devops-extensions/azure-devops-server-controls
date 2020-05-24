import Dialogs = require("VSS/Controls/Dialogs");
import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface GitRepositoryDialogOptions extends Dialogs.IModalDialogOptions {
    repository?: VCContracts.GitRepository;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class VersionControlModalDialog<TOptions extends Dialogs.IModalDialogOptions> extends Dialogs.ModalDialogO<TOptions> {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-modal-dialog",
            okText: (options && options.okText) || VCResources.ModalDialogCreateButton,
            resizable: (options && options.resizable) || false,
            draggable: (options && options.draggable) || false,
            useBowtieStyle: true,
            bowtieVersion: 2
        }, options));
    }
}
VSS.classExtend(VersionControlModalDialog, TfsContext.ControlExtensions);