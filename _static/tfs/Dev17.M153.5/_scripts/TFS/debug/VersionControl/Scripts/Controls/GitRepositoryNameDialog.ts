import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import VCContracts = require("TFS/VersionControl/Contracts");
import {GitClientService} from "VersionControl/Scripts/GitClientService"
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCModalDialog = require("VersionControl/Scripts/Controls/VersionControlModalDialog");

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface GitRepositoryNameDialogOptions extends VCModalDialog.GitRepositoryDialogOptions {
    initialRepositoryName?: string;
    projectId?: string;
    projectName?: string;
}

export class GitRepositoryNameDialog extends VCModalDialog.VersionControlModalDialog<GitRepositoryNameDialogOptions> {

    private _$errorMessage: JQuery;
    private _$repositoryNameInput: JQuery;
    private _gitHttpClient: GitClientService;
    private _repository: VCContracts.GitRepository;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-repository-creation-dialog"
        }, options));
    }

    public initialize() {

        let inputId = "repositoryName" + Controls.getId(),
            warningMessage: string;

        let $repositoryNameDiv = $(domElem("div", "form-section"));

        super.initialize();

        this._gitHttpClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        this._repository = this._options.repository || null;

        $(domElem("label"))
            .attr("for", inputId)
            .text(VCResources.RepositoryName)
            .appendTo($repositoryNameDiv);

        this._$repositoryNameInput = $(domElem("input"))
            .attr("type", "text")
            .attr("id", inputId)
            .attr('placeholder', VCResources.GitRepositoryCreateDialogWatermark)
            .appendTo($repositoryNameDiv)
                .bind("input keyup", () => {
                    let newName = $.trim(this._$repositoryNameInput.val());
                    this.updateOkButton(newName.length > 0 && (!this._repository || newName !== this._repository.name));
                    this._setErrorMessage("");
                });

        // Show error-tip if focus is in the input and there's an error
        this._bind(this._$repositoryNameInput, "focusin", (e: JQueryMouseEventObject) => {
            if (this._$repositoryNameInput.hasClass("invalid") === true) {
                this._$errorMessage.show()
            }
        });
        // Hide the error-tip if focus leaves the input
        this._bind(this._$repositoryNameInput, "focusout", (e: JQueryMouseEventObject) => {
            this._$errorMessage.hide()
        });

        // Add error for invalid input
        this._$errorMessage = $(domElem("div", "input-error-tip"))
            .hide()
            .text("")
            .appendTo($repositoryNameDiv);

        $repositoryNameDiv.appendTo(this._element);

        if (this._repository) {
            this._$repositoryNameInput.val(this._repository.name);
            this._$repositoryNameInput.select();
            this.updateOkButton(false);
        }
        if (this._options.initialRepositoryName) {
            this._$repositoryNameInput.val(this._options.initialRepositoryName);
            this._$repositoryNameInput.select();
            this.updateOkButton(true);
        }
        else {
            this.updateOkButton(false);
        }

        this._$repositoryNameInput.focus();
    }

    public onOkClick(e?: JQueryEventObject): any {
        this._gitHttpClient.beginRenameRepository(this._repository, $.trim(this._$repositoryNameInput.val()), (repository: VCContracts.GitRepository) => {
            this.processResult(this._repository);
        }, (error) => {
                this._setErrorMessage(error);
                this.updateOkButton(true);
            });
    }

    public _setErrorMessage(error: string) {
        this._$errorMessage.text(error);
        this._$errorMessage.toggle(!!error);
        this._$repositoryNameInput.toggleClass("invalid", !!error);
    }
}
VSS.classExtend(GitRepositoryNameDialog, TfsContext.ControlExtensions);
