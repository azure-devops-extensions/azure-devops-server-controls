import { autobind } from "OfficeFabric/Utilities";
import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { LinkingUtilities } from "VSS/Artifacts/Services";
import * as Controls from "VSS/Controls";
import { MessageAreaControl, MessageAreaType } from "VSS/Controls/Notifications";
import * as VSSService from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { domElem } from "VSS/Utils/UI";

import { GitRepository } from "TFS/VersionControl/Contracts";
import { WikiV2, WikiPage, WikiPageResponse } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";
import { LinkForm } from "WorkItemTracking/Scripts/LinkForm";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { ExternalLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";

import { PagePicker, PagePickerProps } from "Wiki/Scenarios/Integration/PagePicker/PagePicker";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiPageArtifactHelpers from "Wiki/Scripts/WikiPageArtifactHelpers";

import "VSS/LoaderPlugins/Css!Wiki/Scripts/WikiPageForm";

export class WikiPageForm extends LinkForm {
    private _$wikiPagePath: JQuery;
    private _$browseButton: JQuery;
    private _$pagePickerDialogContainer: JQuery;
    private _wikiHttpClient: WikiHttpClient;
    private _projectId: string;
    private _wiki: WikiV2;

    public getLinkTypeName(): string {
        return RegisteredLinkTypeNames.WikiPage;
    }

    public initialize(): void {
        super.initialize();

        this._validator = new ExternalLinkValidator(this._options);
        this._projectId = this._options.workItem.project.guid;
                
        this._wikiClient.getAllWikis(this._projectId).then(
            (wikis: WikiV2[]) => {
                if (wikis && wikis.length > 0) {
                    // There is just one wiki repo as of now.
                    this._wiki = wikis[0];
                    this._populateForm();
                } else {
                    this._showError(WikiResources.WITFormNoWikiError);
                }
            },
            (error: Error) => {
                this._showError(error.message);
            },
        );
    }

    public getLinkResult(): void {
        const wikiPagePath = this.getWikiPagePath();

        if (!wikiPagePath.length) {
            // If no wiki page path specified, display warning message
            alert(WikiResources.WITFormWikiPagePathNotSpecified);
        } else {
            this._wikiClient.getPage(this._projectId, this._wiki.id, wikiPagePath).then(
                (result: WikiPageResponse) => {
                    if (result) {
                        this._onValidPagePath(result.page.path);
                    } else {
                        alert(Utils_String.format(WikiResources.WITFormWikiPageDoesNotExist, wikiPagePath));
                    }
                },
                (error: Error) => {
                    alert(Utils_String.format(WikiResources.WITFormWikiPageDoesNotExist, wikiPagePath));
                },
            );
        }
        // Returning undefined will cause dialog not to close. "resultReady" event will be 
        // fired later on by _onValidPagePath handler if the item is not a duplicate.
        return undefined;
    }

    public dispose(): void {
        if (this._$wikiPagePath) {
            this._$wikiPagePath.remove();
            this._$wikiPagePath = null;
        }

        if (this._$browseButton) {
            this._$browseButton.remove();
            this._$browseButton = null;
        }

        if (this._$pagePickerDialogContainer) {
            this._$pagePickerDialogContainer.remove();
            this._$pagePickerDialogContainer = null;
        }

        this._validator = null;
        this._wikiHttpClient = null;
        this._projectId = null;
        this._wiki = null;

        super.dispose();
    }

    private get _wikiClient(): WikiHttpClient {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = VSSService.getClient(WikiHttpClient);
        }

        return this._wikiHttpClient;
    }

    private _onValidPagePath(wikiPagePath: string): void {
        // No-op if this form has been disposed since the asynchronous calls were made.
        if (this.isDisposed()) {
            return;
        }

        // Constructing the external link uri
        const artifactUri = this._constructUri(wikiPagePath);

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
            alert(Utils_String.format(WikiResources.WITFormDuplicateWikiPage, wikiPagePath));
        }
    }

    private _populateForm(): void {
        const table = $(domElem('table', 'wiki-link-container')).appendTo(this._element);
        const tr = $(domElem('tr')).attr('valign', 'bottom').appendTo(table);
        let td = $(domElem('td')).appendTo(tr);
        const wikiPagePathInputId = "wiki-page-path";

        LinkForm.createTitleElement(WikiResources.WITFormWikiPageLabel, wikiPagePathInputId).appendTo(td);

        // wiki page path field
        this._$wikiPagePath = $(domElem("input", "textbox")).attr({
            type: "text",
            id: wikiPagePathInputId,
            placeholder: WikiResources.WITFormWikiPagePathPlaceholder
        }).attr("aria-required", "true")
            .attr("aria-invalid", "true")
            .css("width", "100%")
            .appendTo(td);
        this._bind(this._$wikiPagePath, "keyup change", this._onWikiPagePathChange);

        // Creating button for wiki page path picker
        td = $(domElem('td', 'wiki-page-browse-container')).appendTo(tr);

        this._$browseButton = $("<button>...</button>").val("..")
            .addClass("wiki-page-browse-button")
            .attr("aria-label", WikiResources.WITFormSelectWikiPageText)
            .button()
            .appendTo(td);

        this._bind(this._$browseButton, "click", this._onBrowseClick);

        // Adding comment field
        this._createComment();

        // Placeholder to render Page picker dilaog
        this._$pagePickerDialogContainer = $(domElem("div", "wiki-page-picker-container")).appendTo(this._element);

        this.fireLinkFormValidationEvent(false);
    }

    private _renderPagePicker(container: HTMLElement, isOpen: boolean): void {
        const pagePickerProps: PagePickerProps = {
            title: WikiResources.WITFormSelectWikiPageText,
            isOpen: isOpen,
            ctaText: WikiResources.OkText,
            wiki: this._wiki,
            onCTA: this._onPagePickerConfirmation,
            onCancel: this._closePagePicker,
            text: WikiResources.WITFormSelectWikiPageToLinkText,
            getPagePathIsSelectable: this._isPageSelectable,
        };

        ReactDOM.render(
            React.createElement(PagePicker, pagePickerProps),
            container,
        );
    }

    private _showError(errorMessage: string): void {
        Controls.BaseControl.createIn(MessageAreaControl, this._element, {
            cssClass: "wiki-page-link-error-message",
            closeable: false,
            message: {
                type: MessageAreaType.Warning,
                header: errorMessage,
            },
        });
    }

    private _constructUri(wikiPagePath: string): string {
        return LinkingUtilities.encodeUri({
            tool: WikiPageArtifactHelpers.Tool,
            type: WikiPageArtifactHelpers.Type,
            id: WikiPageArtifactHelpers.getWikiPageArtifactId(
                this._projectId,
                this._wiki.id,
                wikiPagePath,
            ),
        });
    }

    private getWikiPagePath(): string {
        return this._$wikiPagePath.val().trim();
    }

    private _onWikiPagePathChange = (): void => {
        const wikiPagePath = this.getWikiPagePath();

        if (!wikiPagePath) {
            this.fireLinkFormValidationEvent(false);
        }
        else {
            this.fireLinkFormValidationEvent(true);
        }
    }

    private _onBrowseClick = (): void => {
        this._renderPagePicker(this._$pagePickerDialogContainer[0], true);
    }

    @autobind
    private _onPagePickerConfirmation(selectedPage: WikiPage): IPromise<boolean> {
        const deferred = Q.defer<boolean>();
        if (selectedPage) {
            this._$wikiPagePath.val(selectedPage.path);
            this._onWikiPagePathChange();
        }

        deferred.resolve(false);
        return deferred.promise;
    }

    @autobind
    private _closePagePicker(): void {
        this._renderPagePicker(this._$pagePickerDialogContainer[0], false);
        this._$browseButton.focus();
    }

    @autobind
    private _isPageSelectable(pagePath: string): boolean {
        return pagePath !== RepoConstants.RootPath;
    }
}

