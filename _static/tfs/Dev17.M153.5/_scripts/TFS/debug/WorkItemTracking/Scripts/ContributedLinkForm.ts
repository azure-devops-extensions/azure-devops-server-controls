import {LinkForm} from "WorkItemTracking/Scripts/LinkForm";
import Artifacts_Services = require("VSS/Artifacts/Services");
import { IContributedArtifactLinkProvider, ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import {IContributedLinkTypeData} from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import { ExternalLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";
import { makeCopy } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import Diag = require("VSS/Diag");

export class ContributedLinkForm extends LinkForm {

    private _artifactLinkProvider: IContributedArtifactLinkProvider;
    private _linkTypeData: IContributedLinkTypeData;
    private _$artifactId: JQuery;

    constructor(artifactLinkProvider: IContributedArtifactLinkProvider, linkTypeData:IContributedLinkTypeData, options?) {
        super(options);
        this._validator = new ExternalLinkValidator(options);
        this._artifactLinkProvider = artifactLinkProvider;
        this._linkTypeData = linkTypeData;
    }

    public initialize() {
        if (this.isDisposed()) {
            return;
        }

        super.initialize();     

        // Reusing the css classes
        const $artifactIdRow = $("<tr></tr>").appendTo($("<table class='contributed-link-form-container' cellspacing=1 cellpadding=0></table>").appendTo(this._element));

        const $artifactIdCell = $("<td class='artifact-id-cell'></td>").appendTo($artifactIdRow);
        const textboxElemId = "artifact-id";
        let placeholderText = this._linkTypeData.artifactName + " Id";
        $artifactIdCell.append(LinkForm.createTitleElement(this._linkTypeData.artifactName, textboxElemId));
        this._$artifactId = $("<input>").attr("type", "text").attr("placeholder", placeholderText).addClass("textbox").attr("id", textboxElemId).addClass("link-dialog-width-100").
            bind("keyup", this._onArtifactIdChange.bind(this)).appendTo($artifactIdCell);

        // Creating button for artifact picker if required
        if(this._browseEnabled()){
            const $browseButtonCell = $("<td class='artifact-browse-container'></td>").appendTo($artifactIdRow);
            const $browseButton = $("<button id='cs-find'>...</button>").addClass("artifact-browse-button").button().appendTo($browseButtonCell);
            this._bind($browseButton, "click", Utils_Core.delegate(this, this._onBrowse));
        }
        
        // Adding comment field
        this._createComment();

        this._onArtifactIdChange();
    }

    public getLinkResult() {

        var artifactUri = this._constructUri(this._linkTypeData.tool, this._linkTypeData.artifactName, this._getArtifactId());

        // Check for duplicate
        if (!this._validator.isDuplicate(artifactUri)){
            return {
                linkType: this._linkTypeData.linkType,
                comment: this.getComment(),
                links: [{ artifactUri: artifactUri }]
            };
        }else{
            //todo: move the string to resource near <data name="LinksControlDuplicateBuild" xml:space="preserve">
            alert("There is already a link from this work item to this release. This link can not be created until the existing link is removed.");
        }
    }

    private _onArtifactIdChange(e?) {
        this.validate().then(
            this.fireLinkFormValidationEvent, 
            (err)=>{
                Diag.Debug.fail(err);
            });
    }

    private validate(): IPromise<boolean> {

        if($.isFunction(this._artifactLinkProvider.validate)){
            var linkedArtifact: ILinkedArtifact = {
                tool: this._linkTypeData.tool,
                type: this._linkTypeData.artifactName,
                id: this._getArtifactId(),
                linkType: this._linkTypeData.linkType,
                linkTypeDisplayName: this._linkTypeData.linkTypeName
            };
            return this._artifactLinkProvider.validate(makeCopy(linkedArtifact));
        }
        return Q(true);
    }

    // Extension has to implement the browseLink to enable browse artifact functionality
    private _browseEnabled(): boolean{
        return (!!this._artifactLinkProvider.browseLink) && ($.isFunction(this._artifactLinkProvider.browseLink));
    }

    private _onBrowse(){
        if($.isFunction(this._artifactLinkProvider.browseLink)){
            this._artifactLinkProvider.browseLink().then((id: string)=>{
                let trimmedId: string = $.trim(id);
                if(trimmedId){
                    this._setArtifactId(trimmedId);
                }
            }, (err)=>{
                Diag.Debug.fail(err);
            });
        }
    }

    private _getArtifactId(): string{
        return $.trim(this._$artifactId.val());
    }

    private _setArtifactId(id: string){
        if(this._getArtifactId() != id){
            this._$artifactId.val(id);
            this._onArtifactIdChange();
        }
    }

    private _constructUri(tool: string, type: string, artifactId: string): string {
        return Artifacts_Services.LinkingUtilities.encodeUri({
            tool: tool,
            type: type,
            id: artifactId
        });
    }
};