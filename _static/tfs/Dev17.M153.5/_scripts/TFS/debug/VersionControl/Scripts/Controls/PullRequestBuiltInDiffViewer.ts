import Utils_String = require("VSS/Utils/String");
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import { domElem } from "VSS/Utils/UI";

import { VersionControlChangeType } from "TFS/VersionControl/Contracts";
import { FileDiff, FileDiffParameters } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { PullRequestDetailsViews } from "VersionControl/Scripts/Controls/PullRequest";
import { BuiltInDiffViewer as DiffBuiltInDiffViewer, DiffRowLineInfoLookup } from "VersionControl/Scripts/Controls/DiffBuiltInDiffViewer";
import VCPullRequestDiffConverter = require("VersionControl/Scripts/Controls/PullRequestDiffBlockForCommentConverter");
import VCPullRequestOldDiffConverter = require("VersionControl/Scripts/Controls/PullRequestDiffBlockOldConverter");
import { BuiltInDiffViewerDiscussionThreadControlReact } from "VersionControl/Scripts/Controls/DiffBuiltInDiffViewerDiscussionThreadControlReact";

export class BuiltInDiffViewer extends DiffBuiltInDiffViewer {
    private _oversion: string;
    private _mversion: string;
    private _itemDescription: string;

    private static LINES_TO_SHOW: number = 3;

    constructor(options?) {
        super($.extend({
            preventDiscussionCreate: true,
            contentTruncatedMessage: VCResources.PullRequestFileContentIsTrimmed
        }, options));
        if (this._options.discussionThread && this._options.discussionThread.comments) {
            let discussionThread = <DiscussionThread>this._options.discussionThread;
        }
    }

    public _beginGetFileDiff(itemsDescription, callback: (diffModel: FileDiff) => void, errorCallback?: IErrorCallback) {
        this._oversion = itemsDescription.oversion;
        this._mversion = itemsDescription.mversion;
        this._itemDescription = JSON.stringify(itemsDescription);

        VSS.queueRequest(this, this._options.cache, this._itemDescription, callback, errorCallback, (succeeded, failed) => {

            let repositoryContext = <RepositoryContext>this._options.repositoryContext;
            let fileDiffParams = <FileDiffParameters>{
                originalPath: itemsDescription.opath,
                originalVersion: itemsDescription.oversion,
                modifiedPath: itemsDescription.mpath,
                modifiedVersion: itemsDescription.mversion,
                includeCharDiffs: true
            }

            repositoryContext.getClient().beginGetFileDiff(repositoryContext, fileDiffParams, (diffModel: FileDiff) => {
                this._options.diffCallback && this._options.diffCallback(this._itemDescription, diffModel);
                succeeded(diffModel);
            }, failed);
        });
    }

    public setDiffModel(diffModel: FileDiff, linesAbove: number = BuiltInDiffViewer.LINES_TO_SHOW, linesBelow: number = BuiltInDiffViewer.LINES_TO_SHOW) {
        if (!this._element) {
            // control has been disposed
            return;
        }
        if (this._options.expandable) {
            let converter: VCPullRequestDiffConverter.DiffBlockForCommentConverter = new VCPullRequestDiffConverter.DiffBlockForCommentConverter();
            let newDiffModel: FileDiff = converter.convertDiffModel(diffModel, this._options.discussionThread ? this._options.discussionThread.position : null, linesAbove, linesBelow);
            let linesShownAbove = converter.linesAboveThread(newDiffModel.blocks, this._options.discussionThread.position);
            let linesShownBelow = converter.linesBelowThread(newDiffModel.blocks, this._options.discussionThread.position);
            super.setDiffModel(newDiffModel, linesShownAbove, linesShownBelow);
        } else {
            let oldConverter: VCPullRequestOldDiffConverter.DiffForCommentConverter = new VCPullRequestOldDiffConverter.DiffForCommentConverter();
            let newDiffModel: FileDiff = oldConverter.convertDiffModel(diffModel, this._options.discussionThread);
            super.setDiffModel(newDiffModel);
        }
    }

    public _drawDiff(diffModel: FileDiff) {
        if (this._options.discussionThread && this._options.discussionThread.itemPath) {
            if (this._options.discussionThread.position) {
                if (diffModel && diffModel.blocks && diffModel.blocks.length > 0) {
                    super._drawDiff(diffModel);
                }
                else if (this._options.showFileChangedMessage !== false) {
                    this._drawFileChangedMessage();
                }
            }
        }
    }

    private _drawFileChangedMessage() {
        let $divElem = $(domElem("div", "vc-pullrequest-discussion-thread-file-special-message"))
            .appendTo(this._element);

        $(domElem("span"))
            .text(VCResources.PullRequest_DiffViewer_FileModified)
            .appendTo($divElem);
    }

    public _insertLineLevelThread(thread: DiscussionThread,
        discussionPlacement: HTMLElement,
        fillerPlacements: HTMLElement[],
        rowsLookup: DiffRowLineInfoLookup,
        textSelectionOnly?: boolean): BuiltInDiffViewerDiscussionThreadControlReact {
        if (this._options.discussionThread && this._options.discussionThread.id === thread.id) {
            super._insertLineLevelThread(thread, discussionPlacement, fillerPlacements, rowsLookup, textSelectionOnly);
        }
        else {
            return null;
        }
    }

    public _addFileLevelThread(thread: DiscussionThread, focus?: boolean) {
        if (this._options.discussionThread && this._options.discussionThread.id === thread.id) {
            super._addFileLevelThread(thread, focus);
        }
    }
}
