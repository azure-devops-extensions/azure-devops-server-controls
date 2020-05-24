import * as ReactDOM from "react-dom";
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import PopupContent = require("VSS/Controls/PopupContent");
import { HubsService } from "VSS/Navigation/HubsService";
import Service = require("VSS/Service");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { createGettingStartedViewIn } from "VersionControl/Scenarios/NewGettingStarted/GettingStartedView";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import GitRepositoryContext = require("VersionControl/Scripts/GitRepositoryContext");
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class ClonePopup extends PopupContent.PopupContentControl {
    private _contentDiv: HTMLElement;

    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            cssClass: "clone-popup-content-control",
            openCloseOnHover: false,
            supportScroll: true,
            baseAlign: "right-top",
            elementAlign: "right-bottom",
            content: delegate(this, this._getContent)
        }, options));
    }

    public initialize() {
        super.initialize();

        this._focusOnHttpPivot();
        this._bind("popup-opened", () => {
            // Overriding position: fixed (set by PopupContentControl) to position: absolute and correcting dialog position accordingly
            this._element.css({ position: "absolute", left: this._element.offset().left });
            this._getDropElement().addClass("popup-opened");

            this._element.find(".clone-url-copy-control").find(".multiple-toggle-text").select();
            this._focusOnHttpPivot();
        });

        this._bind("popup-closed", () => {
            this._getDropElement().removeClass("popup-opened");
        });
    }

    private _getContent() {
        const repositoryContext: GitRepositoryContext.GitRepositoryContext = this._options.repositoryContext;
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.GIT_REPO_CLONE_POPUP_VIEW, {
            "ClonePopupOpenedFromL2Header": this._options.openedFromL2Header || false,
            "CurrentHub": Service.getLocalService(HubsService).getSelectedHubId(),
            "RepoId": repositoryContext.getRepositoryId(),
            "ProjectId": repositoryContext.getRepository().project.id
        }));

        this._contentDiv = domElem("div", "clone-popup");

        createGettingStartedViewIn(this._contentDiv, {
            tfsContext: this._options.tfsContext,
            repositoryContext: this._options.repositoryContext,
            isCloneExperience: true,
            sshEnabled: this._options.sshEnabled,
            sshUrl: this._options.sshUrl,
            cloneUrl: this._options.cloneUrl,
            branchName: this._options.branchName,
            heading: VCResources.ClonePopup_Title,
            headingLevel: 1,
            onEscape: this._onEscape,
        });

        return $(this._contentDiv);
    }

    private _onEscape = (): void => {
        if (this._options.onEscape) {
            this._options.onEscape();
        }
        this.hide();
    }

    private _focusOnHttpPivot = (): void => {
        const pivots = this._element.find("#clone-section-in-popup .pivoted-textbox-with-copy-container .ms-Pivot > button");
        if (pivots.length > 0) {
            pivots[0].focus();
        }
    }

    public _dispose() {
        super._dispose();

        if (this._contentDiv) {
            ReactDOM.unmountComponentAtNode(this._contentDiv);
            delete this._contentDiv;
        }
    }
}

VSS.classExtend(ClonePopup, TfsContext.ControlExtensions);
