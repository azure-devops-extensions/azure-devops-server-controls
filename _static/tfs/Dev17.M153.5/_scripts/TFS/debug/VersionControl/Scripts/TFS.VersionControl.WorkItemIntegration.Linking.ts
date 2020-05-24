///<amd-dependency path="jQueryUI/button"/>
/// <reference types="jquery" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dropdown, IDropdownProps, IDropdownOption } from "OfficeFabric/Dropdown";

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Notifications = require("VSS/Controls/Notifications");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Diag = require("VSS/Diag");

import { LinkDialog } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Dialogs";
import { ExternalLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { LinkForm } from "WorkItemTracking/Scripts/LinkForm";

import VCContracts = require("TFS/VersionControl/Contracts");
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitClientService } from "VersionControl/Scripts/GitClientService"
import VCHistoryDialogs = require("VersionControl/Scripts/Controls/HistoryDialogs");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCGitRepositorySelectorMenu = require("VersionControl/Scripts/Controls/GitRepositorySelectorMenu");
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import { GitRefArtifact } from "VersionControl/Scripts/GitRefArtifact";
import * as Events_Services from "VSS/Events/Services";

const domElem = Utils_UI.domElem;
const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const delegate = Utils_Core.delegate;

export class ChangesetLinkForm extends LinkForm {

    public _repositoryContext: TfvcRepositoryContext;
    protected _changesetId: any;
    public _item: any;
    private _$browseButton: JQuery;

    constructor(options?) {
        super(options);
        this._validator = new ExternalLinkValidator(options);
        this._repositoryContext = TfvcRepositoryContext.create(this._options.tfsContext);
    }

    public getLinkTypeName() {
        return RegisteredLinkTypeNames.Changeset;
    }

    public getItemPath() {
        return "$/";
    }

    public getChangeset() {
        return $.trim(this._changesetId.val());
    }

    public getDuplicateMessage() {
        return VCResources.LinksControlDuplicateChangeset;
    }

    public getItem(): any {
        /// <returns type="any" />
        let changesetId = this.getChangeset(),
            changesetIdInt;

        if (!changesetId) {
            alert(VCResources.LinkDialogSpecifyChangesetId);
            return null;
        }

        if (isNaN(+changesetId)) {
            // Not a valid changset number is entered
            alert(Utils_String.format(VCResources.LinkDialogInvalidChangesetId, changesetId));
            return null;
        }

        changesetIdInt = parseInt(changesetId, 10);
        if (changesetIdInt) {
            return changesetIdInt;
        }

        alert(VCResources.LinkDialogChangesetZeroNotExists);
    }

    public getLinkResult() {
        const item = this.getItem();

        if (item) {
            this._item = item;

            // Validating the item
            this._repositoryContext.getTfvcClient().beginGetChangeList(this._repositoryContext, new VCSpecs.ChangesetVersionSpec(item).toVersionString(), 0,
                delegate(this, this._onItemValid),
                function (error) {
                    alert(error.message);
                });
        }

        // Returning undefined will cause dialog not to close. "resultReady" event will be fired later on by onItemValid
        // handler if the item is not a duplicate.
    }

    public initialize() {
        let $containerTable: JQuery,
            $changesetIdCell: JQuery,
            $browseButtonCell: JQuery;
        super.initialize();

        $containerTable = $("<table class='vc-link-container' cellspacing=1 cellpadding=0><tr></tr></table>").appendTo(this._element);

        $changesetIdCell = $("<td class='changeset-container'></td>").appendTo($containerTable);
        $changesetIdCell.append(LinkForm.createTitleElement(VCResources.LinkDialogChangesetIdTitle, "cs-id"));

        this._changesetId = $("<input>").attr("type", "text")
            .addClass("textbox")
            .addClass("changeset-id-cell")
            .attr("id", "cs-id")
            .attr("placeholder", VCResources.ChangesetSearchWatermark)
            .attr("aria-required", "true")
            .attr("aria-invalid", "true")
            .appendTo($changesetIdCell)
            .bind("keyup change", delegate(this, this._onChange));

        $browseButtonCell = $("<td class='changeset-browse-container'></td>").appendTo($containerTable);
        
        // Creating button for changeset picker
        this._$browseButton = $("<button id='cs-find'>...</button>")
            .addClass("changeset-browse-button")
            .attr("aria-label", VCResources.SelectChangesetButtonLabel)
            .button()
            .appendTo($browseButtonCell);

        this._bind(this._$browseButton, "click", this._onBrowseClick);

        // Adding comment field
        this._createComment();

        this.fireLinkFormValidationEvent(false);
    }

    protected _onChange(e?) {
        const changesetId = this.getChangeset();
        this._changesetId.attr("aria-invalid", !!changesetId ? "false" : "true");
        this.fireLinkFormValidationEvent(!!changesetId);
    }

    public _onItemValid(item) {

        // No-op if this form has been disposed since the asynchronous calls were made.
        if (this.isDisposed()) {
            return;
        }

        // Constructing the external link uri
        const artifactUri = this._constructUri(item);

        // Checking to see whether the external link already exists or not
        if (!this._validator.isDuplicate(artifactUri)) {

            // Valid link. Firing this event will close the dialog
            this._fire("resultReady", [{
                linkType: this.getLinkTypeName(),
                comment: this.getComment(),
                links: [{ artifactUri: artifactUri }]
            }]);
        }
        else {
            alert(this.getDuplicateMessage());
        }
    }

    public _constructUri(item): string {
        /// <returns type="string" />

        // Constructing artifact uri for the selected changeset
        return Artifacts_Services.LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.VersionControl,
            type: Artifacts_Constants.ArtifactTypeNames.Changeset,
            id: "" + this._item
        });
    }

    private _onBrowseClick = (mouseEvent: JQueryMouseEventObject) => {
        this._launchChangesetPicker();
    }

    private _launchChangesetPicker() {
        VCHistoryDialogs.Dialogs.changesetPicker({
            tfsContext: this._options.tfsContext,
            linkTarget: '_blank',
            repositoryContext: this._repositoryContext,
            okCallback: (changeList) => {
                // Setting input value to the selected changeset id
                this._changesetId.val(changeList ? changeList.changesetId : "");
                this._changesetId.attr("aria-invalid", changeList ? "false" : "true");
                if (changeList) {
                    this.fireLinkFormValidationEvent(true);
                }
                else {
                    this.fireLinkFormValidationEvent(false);
                }
            },
            close: (e?: any) => {
                this._$browseButton && this._$browseButton.focus();        
            },
            noFocusOnClose: true,
        });
    }

    public unload(): void {
        super.unload();

        if (this._$browseButton) {
            this._unbind(this._$browseButton, "click");
        }
    }
}

export class VersionedItemLinkForm extends ChangesetLinkForm {

    private _itemPath: any;
    private _linkToSelectedItemKey: string | number;
    private _linkToContainer: JQuery;
    private readonly _latestKey = "latest";
    private readonly _csKey = "cs";

    public getLinkTypeName() {
        return RegisteredLinkTypeNames.VersionedItem;
    }

    public getItemPath() {
        return $.trim(this._itemPath.val());
    }

    public getDuplicateMessage() {
        return VCResources.LinksControlDuplicateVersionedItem;
    }

    public getItem(): any {
        /// <returns type="any" />

        let path, item,
            changesetNumber: number;

        path = this.getItemPath();

        if (!path) {
            alert(VCResources.LinkDialogSpecifyItemPath);
            return null;
        }

        if (this.linkToCs()) {
            changesetNumber = super.getItem();
            if (changesetNumber) {
                item = {
                    path: path,
                    version: super.getItem()
                };
            }
        }
        else {
            item = {
                path: path,
                version: "T"
            };
        }

        return item;
    }

    public getLinkResult() {
        const item = this.getItem();

        if (item) {
            this._item = item;

            // Validating the item
            this._repositoryContext.getClient().beginGetItem(this._repositoryContext, item.path, item.version, null,
                delegate(this, this._onItemValid),
                function (error) {
                    alert(error.message);
                });
        }

        // Returning undefined will cause dialog not to close. "resultReady" event will be fired later on by onItemValid
        // handler if the item is not a duplicate.
    }

    public linkToCs() {
        return this._linkToSelectedItemKey === this._csKey;
    }

    public initialize() {
        let element,
            tableElement,
            pathContainer,
            changesetContainer;

        super.initialize();

        element = this._element;

        // Finding the table container
        tableElement = element.find("table.vc-link-container");

        if (tableElement.length) {

            // Prepending the item path row to the table
            tableElement.prepend("<tr><td class='path-container' colspan='3'></td></tr>");

            // Finding the cell inside the newly created row
            pathContainer = tableElement.find("td.path-container");

            // Adding the title
            pathContainer.append(LinkForm.createTitleElement(VCResources.LinkDialogVersionedItemTitle, "item-path"));
            // Adding input for item path
            this._itemPath = $("<input />").attr("type", "text")
                .addClass("textbox")
                .attr("id", "item-path")
                .attr("placeholder", VCResources.ItemPathPlaceholder)
                .attr("aria-required", "true")
                .attr("aria-invalid", "true")
                .appendTo(pathContainer);

            this._bind(this._itemPath, "keyup change", delegate(this, this._onChange));

            // Finding the cell for changeset id
            changesetContainer = tableElement.find("td.changeset-container");

            // Adding link to container before changeset id cell
            this._linkToContainer = $("<td class='link-to-container'></td>").insertBefore(changesetContainer);
            
            const dropdownProps: IDropdownProps = {
                className: 'fabric-link-to-component',
                label: VCResources.VersionedItemLinkDialogTitle,
                defaultSelectedKey: this._latestKey,
                options:
                [
                    { key: this._latestKey, text: VCResources.LinkDialogLatestVersion },
                    { key: this._csKey, text: VCResources.LinkDialogChangeset },
                ],
                onChanged: delegate(this, this._onLinkToChange),
            } as IDropdownProps;
            this._linkToSelectedItemKey = this._latestKey;
            ReactDOM.render(React.createElement(Dropdown, dropdownProps), this._linkToContainer[0]);

            // Hiding changeset id input as the default is latest version
            this._updateLinkTo(this._latestKey);
        }
    }

    protected _onChange(e?) {
        const path = this.getItemPath();

        this._itemPath.attr("aria-invalid", path ? "false" : "true");
        let changesetId: string;
        if (this.linkToCs()) {
            changesetId = this.getChangeset();
            this._changesetId.attr("aria-invalid", changesetId ? "false" : "true");
        }

        if (!path) {
            this.fireLinkFormValidationEvent(false);
            return;
        }

        if (this.linkToCs() && !changesetId) {
            this.fireLinkFormValidationEvent(false);
            return;
        }
        this.fireLinkFormValidationEvent(true);
    }

    public _constructUri(item): string {
        /// <returns type="string" />

        let id, artifactUri;
        const path = this._sanitizeTfvcPath(this._item.path);

        id = Utils_String.format("{0}&changesetVersion={1}&deletionId=0", encodeURIComponent(path), this._item.version);
        // Constructing artifact uri for the versioned item
        artifactUri = Artifacts_Services.LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.VersionControl,
            type: Artifacts_Constants.ArtifactTypeNames.VersionedItem,
            id: encodeURIComponent(id)
        });

        return artifactUri;
    }

    private _sanitizeTfvcPath(path: string): string {
        if (Boolean(path)) {
            // tfvc path must always start with a '$/'.
            if (path.indexOf("$/") === 0) {
                return path;
            } else if (path[0] === "/") {
                return "$" + path;
            } else {
                return "$/" + path;
            }
        }
        return path;
    }

    private _onLinkToChange(selectedItem: IDropdownOption): void {
        this._linkToSelectedItemKey = selectedItem.key;
        this._updateLinkTo(this._linkToSelectedItemKey);
        this._onChange();
    }

    private _updateLinkTo(linkTo) {
        if (this.linkToCs()) {
            this._element.find("td.changeset-container").show();
            this._element.find("td.changeset-browse-container").show();
        }
        else {
            this._element.find("td.changeset-container").hide();
            this._element.find("td.changeset-browse-container").hide();
        }
    }

    public unload() {
        super.unload();
        ReactDOM.unmountComponentAtNode(this._linkToContainer[0]);
    }
}

export class CommitLinkForm extends LinkForm {
    private _item: any;
    private _repositorySelector: VCGitRepositorySelectorMenu.GitRepositorySelectorMenu;
    private _gitHttpClient: GitClientService;
    private _commitId: any;
    private _browseButton: JQuery;

    constructor(options?) {
        super(options);
        Diag.Debug.assert(this._options.tfsContext, "Tfscontext is not set in options.");
        this._validator = new ExternalLinkValidator(options);
        this._gitHttpClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
    }

    public getLinkTypeName() {
        return RegisteredLinkTypeNames.Commit;
    }

    public getItem(): any {
        /// <returns type="any" />
        const commitId = $.trim(this._commitId.val());

        if (!CommitIdHelper.isValidPartialId(commitId)) {
            alert(VCResources.InvalidCommitId);
            return null;
        }

        this._item = {
            repository: this._repositorySelector.getSelectedRepository(),
            commitId: commitId
        };

        return this._item;
    }

    public getLinkResult() {
        const item = this.getItem();

        if (item) {
            const repositoryContext = GitRepositoryContext.create(item.repository, this._options.tfsContext);

            if (item.commitId.length === CommitIdHelper.SHA1_HASH_LENGTH) {
                // A full commit Id was entered. Confirm this commit exists
                this._confirmCommit(repositoryContext, item.commitId);
            }
            else {
                // A partial commit Id was entered. Lookup commits that begin with that id.
                const searchCriteria = <VCContracts.ChangeListSearchCriteria>$.extend(CommitIdHelper.getStartsWithSearchCriteria(item.commitId), { top: 2 });

                repositoryContext.getClient().beginGetHistory(repositoryContext, searchCriteria, (queryResults: VCLegacyContracts.GitHistoryQueryResults) => {
                    if (queryResults.results.length === 0) {
                        // No commit found starting with the specified string
                        alert(Utils_String.format(VCResources.NoCommitsStartsWithError, item.commitId));
                    }
                    else if (queryResults.results.length > 1) {
                        // Too many commits found starting with the specified string
                        alert(Utils_String.format(VCResources.TooManyCommitsStartWithError, item.commitId));
                    }
                    else {
                        item.commitId = (<VCLegacyContracts.GitCommit>queryResults.results[0].changeList).commitId;
                        this._onItemValid(item);
                    }
                });
            }
        }

        // Returning undefined will cause dialog not to close. "resultReady" event will be fired later on by onItemValid
        // handler if the item is not a duplicate.
    }

    public initialize() {

        super.initialize();

        const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        gitClient.beginGetAllRepositories((repositories: VCContracts.GitRepository[]) => {

            // If the dialog was disposed during the ajax call bail out
            if (this.isDisposed()) {
                return;
            }

            if (repositories.length === 0) {
                Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._element, {
                    cssClass: "vc-link-no-repositories-message",
                    closeable: false,
                    message: {
                        type: Notifications.MessageAreaType.Warning,
                        header: VCResources.VersionSelectorNoGitRepositoriesInCollection
                    }
                });
            }
            else {
                this.populateForm(repositories);
            }
        });
    }

    private populateForm(repositories: VCContracts.GitRepository[]) {

        let table, tr, td, browseButton;

        // Repository id field
        LinkForm.createTitleElement(VCResources.LinkDialogCommitRepoTitle).appendTo(this._element);
        this._repositorySelector = <VCGitRepositorySelectorMenu.GitRepositorySelectorMenu>Controls.BaseControl.createIn(VCGitRepositorySelectorMenu.GitRepositorySelectorMenu, this._element, {
            tfsContext: tfsContext,
            cssClass: "vc-link-repository-selector vc-link-git-selector-menu",
            setPopupWidthToMatchMenu: true,
            initialRepositories: repositories
        });

        table = $(domElem('table', 'vc-link-container')).appendTo(this._element);
        tr = $(domElem('tr')).attr('valign', 'bottom').appendTo(table);
        td = $(domElem('td')).appendTo(tr);

        // Commit id field
        LinkForm.createTitleElement(VCResources.LinkDialogCommitIdTitle, "commit").appendTo(td);
        this._commitId = $(domElem("input", "textbox")).attr({
            type: "text",
            id: "commit",
            placeholder: VCResources.CommitSearchWatermark
        })
            .attr("aria-required", "true")
            .attr("aria-invalid", "true")
            .css("width", "100%")
            .appendTo(td);
        this._bind(this._commitId, "keyup change", delegate(this, this._onCommitIdChange));

        // Creating button for commit picker
        td = $(domElem('td', 'changeset-browse-container')).appendTo(tr);

        this._browseButton = $("<button>...</button>").val("..")
            .addClass("changeset-browse-button")
            .attr("aria-label", VCResources.SelectCommitButtonLabel)
            .button()
            .appendTo(td);

        this._bind(this._browseButton, "click", this._onBrowseClick);

        // Adding comment field
        this._createComment();

        Events_Services.getService().attachEvent(LinkDialog.LINKDIALOG_OK_VALIDATION, this._onValidationHandler);

        this.fireLinkFormValidationEvent(false);
    }

    public unload() {
        super.unload();
        Events_Services.getService().detachEvent(LinkDialog.LINKDIALOG_OK_VALIDATION, this._onValidationHandler);

        if (this._browseButton) {
            this._unbind(this._browseButton, "click");
        }
    }

    private _onValidationHandler = (sender: any, status: any) => {
        if (status && true === status.linkForm) {
            this._commitId.attr("aria-invalid", "false");
        }

        if (status && false === status.linkForm) {
            this._commitId.attr("aria-invalid", "true");
        }
    };

    private _onCommitIdChange(e?) {
        const commitId = $.trim(this._commitId.val());

        if (!CommitIdHelper.isValidPartialId(commitId)) {
            this.fireLinkFormValidationEvent(false);
        } else {
            this.fireLinkFormValidationEvent(true);
        }
    }

    public getDuplicateMessage() {
        return VCResources.LinksControlDuplicateCommit;
    }

    public _onItemValid(item) {

        // No-op if this form has been disposed since the asynchronous calls were made.
        if (this.isDisposed()) {
            return;
        }

        // Constructing the external link uri
        const artifactUri = this._constructUri(item);

        // Checking to see whether the external link already exists or not
        if (!this._validator.isDuplicate(artifactUri)) {

            // Valid link. Firing this event will close the dialog
            this._fire("resultReady", [{
                linkType: this.getLinkTypeName(),
                comment: this.getComment(),
                links: [{ artifactUri: artifactUri }]
            }]);
        }
        else {
            alert(this.getDuplicateMessage());
        }
    }

    public _constructUri(item): string {
        /// <returns type="string" />

        let id, artifactUri;

        id = Utils_String.format("{0}/{1}/{2}", this._item.repository.project.id, this._item.repository.id, item.commitId.full);
        artifactUri = Artifacts_Services.LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.Git,
            type: Artifacts_Constants.ArtifactTypeNames.Commit,
            id: id
        });

        return artifactUri;
    }

    private _onBrowseClick = (e?) => {
        let selectedRepository = this._repositorySelector.getSelectedRepository(),
            repositoryContext: GitRepositoryContext;

        if (selectedRepository) {
            const tfsContext = <TFS_Host_TfsContext.TfsContext>$.extend(true, {}, this._options.tfsContext);
            tfsContext.navigation.project = selectedRepository.project.name;
            repositoryContext = GitRepositoryContext.create(selectedRepository, tfsContext);
            VCHistoryDialogs.Dialogs.commitPicker({
                tfsContext: tfsContext,
                path: repositoryContext.getRootPath(),
                linkTarget: '_blank',
                repositoryContext: repositoryContext,
                okCallback: (changeList) => {
                    // Setting input value to the selected commit id
                    this._commitId.val(changeList && changeList.commitId && changeList.commitId.full);
                    this._onCommitIdChange();
                },
                close: (e?: any): void => {
                        this._browseButton && this._browseButton.focus();
                },
                noFocusOnClose: true,
            });
        }
    }

    private _confirmCommit(repositoryContext, fullCommitId) {
        repositoryContext.getClient().beginGetChangeList(
            repositoryContext,
            new VCSpecs.GitCommitVersionSpec(fullCommitId).toVersionString(),
            0,
            delegate(this, this._onItemValid),
            (error) => {
                alert(error.message);
            });
    }
}

export enum GitRefLinkType {
    Branch,
    Tag
}

export class GitRefLinkForm extends LinkForm {
    ///Base class for GitRefLinks Form

    private _repositorySelector: VCGitRepositorySelectorMenu.GitRepositorySelectorMenu;
    private _gitVersionMenu: VCGitVersionSelectorMenu.GitVersionSelectorMenu;
    private _repository: VCContracts.GitRepository;
    private _linkResult: { linkType: string, comment: string, links: [{ artifactUri: string }] };
    private _refLinkType: GitRefLinkType;
    private $_gitRefLinkError: JQuery;

    constructor(refLinkType: GitRefLinkType, options?) {
        super(options);
        this._refLinkType = refLinkType;
        this._validator = new ExternalLinkValidator(options);
    }

    public getLinkTypeName(): string {
        Diag.Debug.assert(false, "Derived classes must override it");
        return null;
    }

    protected getAlreadyLinkedErrorMessage(): string {
        Diag.Debug.assert(false, "Derived classes must override it");
        return null;
    }

    private _getLinkDialogTitle(): string {
        if (this._refLinkType === GitRefLinkType.Branch) {
            return VCResources.LinkDialogBranchTitle;
        }

        return VCResources.LinkDialogTagTitle;
    }

    public getLinkResult() {
        this._validateSelectedItemAndCalculateUri();

        const errText = this.$_gitRefLinkError.text();
        if (!this._linkResult && errText) {
            alert(errText);
        }

        // Returning undefined will cause dialog not to close. "resultReady" event will be fired later on by onItemValid
        // handler if the item is not a duplicate.
        return this._linkResult;
    }

    public initialize() {

        super.initialize();

        //Gets the list of repositories and populates the form
        const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        gitClient.beginGetAllRepositories((repositories: VCContracts.GitRepository[]) => {
            if (repositories.length === 0) {
                Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._element, {
                    cssClass: "vc-link-no-repositories-message",
                    closeable: false,
                    message: {
                        type: Notifications.MessageAreaType.Warning,
                        header: VCResources.VersionSelectorNoGitRepositoriesInCollection
                    }
                });
            }
            else {
                this.populateForm(repositories);
            }
        });
    }

    private populateForm(repositories: VCContracts.GitRepository[]) {
        const tfsContext = <TFS_Host_TfsContext.TfsContext>$.extend(true, {}, this._options.tfsContext);

        //Create the control for selecting the repository
        LinkForm.createTitleElement(VCResources.LinkDialogBranchRepoTitle).appendTo(this._element);
        this._repositorySelector = <VCGitRepositorySelectorMenu.GitRepositorySelectorMenu>Controls.BaseControl.createIn(VCGitRepositorySelectorMenu.GitRepositorySelectorMenu, this._element, {
            tfsContext: tfsContext,
            cssClass: "vc-link-repository-selector vc-link-git-selector-menu",
            setPopupWidthToMatchMenu: true,
            initialRepositories: repositories,
            onItemChanged: (repository: VCContracts.GitRepository) => {
                this._setRepository(repository);
            },
            onDefaultRepositorySelected: (repository: VCContracts.GitRepository) => {
                this._setRepository(repository);
            }
        });

        //Create the control for selecting the branch
        LinkForm.createTitleElement(this._getLinkDialogTitle()).appendTo(this._element);
        this._gitVersionMenu = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.BaseControl.createIn(VCGitVersionSelectorMenu.GitVersionSelectorMenu, this._element, {
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
                overflow: "hidden-hidden",
                allowUnmatchedSelection: false //block selecting branches that don't exist
            },
            cssClass: "vc-link-git-selector-menu",
            setPopupWidthToMatchMenu: true,
            disableTags: this._refLinkType === GitRefLinkType.Tag ? false : true,
            disableBranches: this._refLinkType === GitRefLinkType.Branch ? false : true,
            disableMyBranches: this._refLinkType === GitRefLinkType.Branch ? false : true,
            onItemChanged: (selectedItem: VCSpecs.GitBranchVersionSpec | VCSpecs.GitTagVersionSpec) => {
                this._validateSelectedItemAndCalculateUri();
            }
        });

        // Adding error field which will be populated with any ref linking errors
        this.$_gitRefLinkError =
            $("<div>")
                .attr("id", "error")
                .addClass("duplicate")
                .css("margin-top", "5px")
                .appendTo(this._element);

        // Adding comment field
        this._createComment();

        this._triggerButtonState(false);

        //Sets the selected value for the Repository control
        const selectedRepository = this._repositorySelector.getSelectedRepository();
        if (selectedRepository) {
            this._setRepository(selectedRepository);
        }
    }

    /**
    * 1) Changes the selectedValue of repositorySelectorControl to the given value
    * 2) Updates the repositoryContext for the gitVersionMenu control
    * 3) Calls the function to get the defaultBranch for the repository and update the gitVersionMenu
    * @param - repository - The Git Repository
    */
    private _setRepository(repository: VCContracts.GitRepository): void {
        const repositoryContext = GitRepositoryContext.create(repository, this._options.tfsContext);
        this._linkResult = null;
        this._repository = repository;
        this._repositorySelector.setSelectedRepository(repository);
        this._gitVersionMenu.setRepository(repositoryContext);
        this._gitVersionMenu.setSelectedVersion(null);
        this._setUserDefaultBranch(repository);
    }

    /*
    * 1) Gets the user's last branch for the given repository using REST API
    * 2) Sets the value for the selectedItem in the gitVersionMenu
    * @param - repository - The Git Repository
    */
    private _setUserDefaultBranch(repository: VCContracts.GitRepository): void {
        Diag.Debug.assert(!!repository, "Repository should not be undefined");
        if (!repository) {
            return;
        }
        if (this._refLinkType !== GitRefLinkType.Branch) {
            return;
        }
        const repositoryContext = GitRepositoryContext.create(repository, this._options.tfsContext);
        const gitContext = <GitRepositoryContext>repositoryContext;
        gitContext.getGitClient().beginGetUserLastBranch(repository, (branchName: string) => {
            if (branchName) {
                const currentSelectedRepository = this._repositorySelector.getSelectedRepository();
                let shouldSetBranchAndRepo = !currentSelectedRepository || currentSelectedRepository.remoteUrl === repository.remoteUrl;
                shouldSetBranchAndRepo = shouldSetBranchAndRepo && !this._gitVersionMenu.getSelectedVersion();
                if (shouldSetBranchAndRepo) {
                    this._gitVersionMenu.setSelectedVersion(new VCSpecs.GitBranchVersionSpec(branchName));
                    this._validateSelectedItemAndCalculateUri();
                }
            }
        });
    }

    private _validateSelectedItemAndCalculateUri(): void {
        this.$_gitRefLinkError.empty();
        this._linkResult = null;
        const selectedItem = this._gitVersionMenu.getSelectedVersion();
        if (selectedItem) {
            const uri = this._constructUri(selectedItem as any);
            if (this._validator && !this._validator.isDuplicate(uri)) {
                // Valid link. Firing this event will close the dialog
                this._linkResult = {
                    linkType: this.getLinkTypeName(),
                    comment: this.getComment(),
                    links: [{ artifactUri: uri }]
                };
                this._triggerButtonState(true);
            }
            else {
                this.$_gitRefLinkError.text(this.getAlreadyLinkedErrorMessage());
                this._triggerButtonState(false);
            }
        }
    }

    private _triggerButtonState(enabled: boolean) {
        this.fireLinkFormValidationEvent(enabled);
    }

    public _constructUri(item: VCSpecs.VersionSpec): string {
        /// <returns type="string" />

        let id, artifactUri;

        id = Utils_String.format(GitRefArtifact.ToolSpecificRefIdFormat, this._repository.project.id, this._repository.id, item.toVersionString());
        artifactUri = Artifacts_Services.LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.Git,
            type: Artifacts_Constants.ArtifactTypeNames.Ref,
            id: id
        });

        return artifactUri;
    }
}

export class GitBranchLinkForm extends GitRefLinkForm {
    constructor(options?) {
        super(GitRefLinkType.Branch, options);
    }

    public getLinkTypeName(): string {
        return RegisteredLinkTypeNames.Branch;
    }

    protected getAlreadyLinkedErrorMessage(): string {
        return VCResources.LinksControlDuplicateGitRefBranch;
    }
}

export class GitTagLinkForm extends GitRefLinkForm {
    constructor(options?) {
        super(GitRefLinkType.Tag, options);
    }

    public getLinkTypeName(): string {
        return RegisteredLinkTypeNames.Tag;
    }

    protected getAlreadyLinkedErrorMessage(): string {
        return VCResources.LinksControlDuplicateGitRefTag;
    }
}

export class PullRequestLinkForm extends LinkForm {
    private static _pullRequestIdRegExp = new RegExp("^[0-9]+$");

    private _item: any;
    private _repositorySelector: VCGitRepositorySelectorMenu.GitRepositorySelectorMenu;
    private _gitHttpClient: GitClientService;
    private $_pullRequestId: JQuery;
    private $_pullRequestDescription: JQuery;
    private _cachedPullRequest: VCContracts.GitPullRequest; // Cache last fetched pull request

    constructor(options?) {
        super(options);
        Diag.Debug.assert(this._options.tfsContext, "Tfscontext is not set in options.");
        this._validator = new ExternalLinkValidator(options);
        this._gitHttpClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        this._cachedPullRequest = null;
    }

    public getLinkTypeName() {
        return RegisteredLinkTypeNames.PullRequest;
    }

    public getItem(): any {
        /// <returns type="any" />
        let pullRequestId = this.$_pullRequestId.val();
        pullRequestId = pullRequestId.trim();

        if (!PullRequestLinkForm._pullRequestIdRegExp.test(pullRequestId)) {
            this._item = null;

            // if anything was entered for PR id, show an error since it's not in the expected format
            if (!!pullRequestId) {
                this.$_pullRequestDescription.addClass("notfound").text(VCResources.InvalidPullRequestId);
            }

            return null;
        }

        this._item = {
            repository: this._repositorySelector.getSelectedRepository(),
            pullRequestId: pullRequestId
        };

        return this._item;
    }

    public getLinkResult() {
        // Validating the item
        this._beginGetPullRequest(
            delegate(this, this._onItemValid),
            (error) => {
                alert(error.message);
            });

        // Returning undefined will cause dialog not to close. "resultReady" event will be fired later on by onItemValid
        // handler if the item is not a duplicate.
    }

    public initialize() {

        super.initialize();

        const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        gitClient.beginGetAllRepositories((repositories: VCContracts.GitRepository[]) => {

            // If the dialog was disposed during the ajax call bail out
            if (this.isDisposed()) {
                return;
            }

            if (repositories.length === 0) {
                Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._element, {
                    cssClass: "vc-link-no-repositories-message",
                    closeable: false,
                    message: {
                        type: Notifications.MessageAreaType.Warning,
                        header: VCResources.VersionSelectorNoGitRepositoriesInCollection
                    }
                });
            }
            else {
                this.populateForm(repositories);
            }
        });
    }

    private populateForm(repositories: VCContracts.GitRepository[]) {

        let table, tr, td, browseButton;

        // Repository id field
        LinkForm.createTitleElement(VCResources.LinkDialogPullRequestRepoTitle).appendTo(this._element);
        this._repositorySelector = <VCGitRepositorySelectorMenu.GitRepositorySelectorMenu>Controls.BaseControl.createIn(VCGitRepositorySelectorMenu.GitRepositorySelectorMenu, this._element, {
            tfsContext: tfsContext,
            cssClass: "vc-link-repository-selector vc-link-git-selector-menu",
            setPopupWidthToMatchMenu: true,
            initialRepositories: repositories,
            onItemChanged: (repository: VCContracts.GitRepository) => {
                this._cachedPullRequest = null;
                this._updateDescriptionArea();
            },
        });

        table = $(domElem('table', 'vc-link-container')).appendTo(this._element);
        tr = $(domElem('tr')).attr('valign', 'bottom').appendTo(table);
        td = $(domElem('td')).appendTo(tr);

        // Pull Request id field
        LinkForm.createTitleElement(VCResources.LinkDialogPullRequestIdTitle, "pullrequest").appendTo(td);
        this.$_pullRequestId = $(domElem("input", "textbox"))
            .attr({
                type: "text",
                id: "pullrequest",
                placeholder: VCResources.PullRequestSearchWaterMark,
            })
            .attr("aria-describedby", "description")
            .attr("aria-required", "true")
            .attr("aria-invalid", "true")
            .css("width", "100%")
            .appendTo(td)
            .bind("keyup change", delegate(this, this._onPullRequestIdChange));

        // Adding description field which will be populated with the pull request details
        const $descriptionContainer = $("<div>")
            .attr("id", "description")
            .attr("aria-live", "assertive")
            .addClass("pull-request-description-container")
            .appendTo(this._element);
        this.$_pullRequestDescription = $("<div>").addClass("pull-request-description").appendTo($descriptionContainer);

        // Creating button for pull request picker
        //td = $(domElem('td', 'changeset-browse-container')).appendTo(tr);
        //browseButton = $("<button>...</button>").val("..").button().appendTo(td);
        //this._bind(browseButton, "click", delegate(this, this._onBrowseClick));

        // Adding comment field
        this._createComment();

        Events_Services.getService().attachEvent(LinkDialog.LINKDIALOG_OK_VALIDATION, this._onValidationHandler);

        this.fireLinkFormValidationEvent(false);
    }

    public unload() {
        super.unload();
        Events_Services.getService().detachEvent(LinkDialog.LINKDIALOG_OK_VALIDATION, this._onValidationHandler);
    }

    private _onValidationHandler = (sender: any, status: any) => {
        if (status && true === status.linkForm) {
            this.$_pullRequestId.attr("aria-invalid", "false");
        }

        if (status && false === status.linkForm) {
            this.$_pullRequestId.attr("aria-invalid", "true");
        }
    };

    /**
     * Gets pull request
     */
    private _beginGetPullRequest(successCallback: (pullRequest: VCContracts.GitPullRequest) => void, errorCallback?: IErrorCallback) {
        const item = this.getItem();
        if (item) {
            this._gitHttpClient.beginGetPullRequest(
                GitRepositoryContext.create(item.repository, this._options.tfsContext),
                Number(item.pullRequestId),
                (pullRequest: VCContracts.GitPullRequest) => {
                    this._cachedPullRequest = pullRequest;
                    successCallback(pullRequest);
                },
                errorCallback);
        }
    }

    /**
     * Updates pull request description area
     */
    private _updateDescriptionArea() {
        // No-op if this form has been disposed since the asynchronous calls were made.
        if (this.isDisposed()) {
            return;
        }

        // Clearing description area which will show pull request details
        this._clearDescriptionArea();

        const item = this.getItem();
        if (!item) {
            this.fireLinkFormValidationEvent(false);
            return;
        }

        if (this._cachedPullRequest && this._cachedPullRequest.pullRequestId === Number(item.pullRequestId)) {
            this.$_pullRequestDescription.text(this._cachedPullRequest.title);
            this.fireLinkFormValidationEvent(true);
            return;
        }

        this._beginGetPullRequest(
            (pullRequest: VCContracts.GitPullRequest) => {
                // Create description area with pull request title
                this.$_pullRequestDescription.text(pullRequest.title);

                if (this._element) {
                    this.fireLinkFormValidationEvent(true);
                }
            },
            (error) => {
                // Show error in description area
                const errorMessage: string = Utils_String.format(VCResources.PullRequest_WithIdNotFound, item.pullRequestId);
                this.$_pullRequestDescription.addClass("notfound").text(errorMessage);

                if (this._element) {
                    this.fireLinkFormValidationEvent(false);
                }
            });
    }

    /**
     * Reacts to pullRequestIdChange
     */
    private _onPullRequestIdChange(e?) {
        const $id = this.$_pullRequestId,
            id = $.trim($id.val());

        this.cancelDelayedFunction("onIdChange");

        if (id.length) {
            this.delayExecute("onIdChange", 500, true, () => {
                this._updateDescriptionArea();
            });
        }
        else {
            // Clearing description area which will show pull request details
            this._clearDescriptionArea();
            this._cachedPullRequest = null;

            this._element.trigger("buttonStatusChange", [{ enabled: false }]);
        }
    }

    public getDuplicateMessage() {
        return VCResources.LinksControlDuplicatePullRequest;
    }

    /**
     * Clears pull request description area
     */
    private _clearDescriptionArea() {
        this.$_pullRequestDescription.removeClass("notfound");
        this.$_pullRequestDescription.empty();
    }

    public _onItemValid(item) {

        // No-op if this form has been disposed since the asynchronous calls were made.
        if (this.isDisposed()) {
            return;
        }

        // Constructing the external link uri
        const artifactUri = this._constructUri(item);

        // If comment on PR link form is empty, add PR title as comment
        let comment = this.getComment();
        if (!comment) {
            comment = item.title || "";
        }

        // Checking to see whether the external link already exists or not
        if (!this._validator.isDuplicate(artifactUri)) {

            // Valid link. Firing this event will close the dialog
            this._fire("resultReady", [{
                linkType: this.getLinkTypeName(),
                comment: comment,
                links: [{ artifactUri: artifactUri }]
            }]);
        }
        else {
            alert(this.getDuplicateMessage());
        }
    }

    public _constructUri(item): string {
        /// <returns type="string" />

        let id, artifactUri;
        //vstfs:///Git/PullRequestId/{teamProjectId}/{repositoryId}/{pullRequestId}
        id = Utils_String.format("{0}/{1}/{2}", this._item.repository.project.id, this._item.repository.id, item.pullRequestId);
        artifactUri = Artifacts_Services.LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.Git,
            type: Artifacts_Constants.ArtifactTypeNames.PullRequestId,
            id: id
        });

        return artifactUri;
    }

    //private _onBrowseClick(e?) {
    //    var selectedRepository = this._repositorySelector.getSelectedRepository(),
    //        repositoryContext: GitRepositoryContext;

    //    if (selectedRepository) {
    //        var tfsContext = <TFS_Host_TfsContext.TfsContext>$.extend(true, {}, this._options.tfsContext);
    //        tfsContext.navigation.project = selectedRepository.project.name;
    //        repositoryContext = GitRepositoryContext.create(selectedRepository, tfsContext);
    //        VCHistoryDialogs.Dialogs.commitPicker({
    //            tfsContext: tfsContext,
    //            path: repositoryContext.getRootPath(),
    //            linkTarget: '_blank',
    //            repositoryContext: repositoryContext,
    //            okCallback: (changeList) => {
    //                // Setting input value to the selected commit id
    //                this.$_pullRequestId.val(changeList && changeList.commitId && changeList.commitId.full);
    //            }
    //        });
    //    }
    //}
}
// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.VersionControl.WorkItemIntegration.Linking", exports);
