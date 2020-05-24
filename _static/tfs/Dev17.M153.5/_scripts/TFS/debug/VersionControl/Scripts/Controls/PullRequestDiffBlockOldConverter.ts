import Utils_String = require("VSS/Utils/String");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCDiffBuiltInDiffViewer = require("VersionControl/Scripts/Controls/DiffBuiltInDiffViewer");

import domElem = Utils_UI.domElem;

export class DiffForCommentConverter {
    private static LINES_TO_SHOW: number = 3;

    public convertDiffModel(diffModel: VCLegacyContracts.FileDiff, discussionThread: DiscussionCommon.DiscussionThread) {
        let firstBlockIndex = -1, lastBlockIndex = -1, newDiffModel = diffModel;

        if (discussionThread.position) {
            newDiffModel = <VCLegacyContracts.FileDiff>$.extend(true, {}, diffModel);

            if (discussionThread.position.positionContext === DiscussionCommon.PositionContext.RightBuffer) {
                if (newDiffModel && newDiffModel.blocks) {
                    $.each(newDiffModel.blocks, (i, block) => {
                        let firstBlock, lastBlock;
                        if (block.mLine <= discussionThread.position.startLine && block.mLine + block.mLinesCount > discussionThread.position.startLine) {
                            if (block.mLine + DiffForCommentConverter.LINES_TO_SHOW >= discussionThread.position.startLine) {
                                // Comment start is close to beginning of its block.  Include the last few lines of the previous block.
                                firstBlockIndex = Math.max(i - 1, 0);

                                firstBlock = newDiffModel.blocks[firstBlockIndex];

                                if ((i > 0) && (firstBlock.changeType === VCOM.FileDiffBlockChangeType.None || firstBlock.mLinesCount === 0 || firstBlock.oLinesCount === 0)) {
                                    // Truncate unchanged, add, or delete blocks by a few lines
                                    if (firstBlock.mLinesCount > DiffForCommentConverter.LINES_TO_SHOW) {
                                        firstBlock.mLine += firstBlock.mLinesCount - DiffForCommentConverter.LINES_TO_SHOW;
                                        firstBlock.mLines = firstBlock.mLines.slice(-DiffForCommentConverter.LINES_TO_SHOW);
                                        firstBlock.mLinesCount = firstBlock.mLines.length;
                                    }
                                    if (firstBlock.oLinesCount > DiffForCommentConverter.LINES_TO_SHOW) {
                                        firstBlock.oLine += firstBlock.oLinesCount - DiffForCommentConverter.LINES_TO_SHOW;
                                        firstBlock.oLines = firstBlock.oLines.slice(-DiffForCommentConverter.LINES_TO_SHOW);
                                        firstBlock.oLinesCount = firstBlock.oLines.length;
                                    }
                                }
                                else {
                                    // Only include the block if the change is less than a few lines
                                    if ((firstBlock.mLines && firstBlock.mLines.length > DiffForCommentConverter.LINES_TO_SHOW) || (firstBlock.oLines && firstBlock.oLines.length > DiffForCommentConverter.LINES_TO_SHOW)) {
                                        firstBlockIndex = i;
                                    }
                                }
                            }
                            else {
                                // Comment start is not close to the beginning of its block.  Include the previous few lines before the beginning of the comment.
                                firstBlockIndex = i;

                                firstBlock = newDiffModel.blocks[firstBlockIndex];
                                if (firstBlock.changeType === VCOM.FileDiffBlockChangeType.None || firstBlock.mLinesCount === 0 || firstBlock.oLinesCount === 0) {
                                    // Truncate and keep a few lines before the comment
                                    let mLineSliceOffset = Math.max(discussionThread.position.startLine - DiffForCommentConverter.LINES_TO_SHOW - firstBlock.mLine, 0);
                                    let oLineSliceOffset = Math.max(discussionThread.position.startLine - DiffForCommentConverter.LINES_TO_SHOW - firstBlock.oLine, 0);
                                    firstBlock.mLine += mLineSliceOffset;
                                    firstBlock.oLine += oLineSliceOffset;
                                    firstBlock.mLines = firstBlock.mLines ? firstBlock.mLines.slice(mLineSliceOffset) : null;
                                    firstBlock.oLines = firstBlock.oLines ? firstBlock.oLines.slice(oLineSliceOffset) : null;
                                    firstBlock.mLinesCount = firstBlock.mLines ? firstBlock.mLines.length : 0;
                                    firstBlock.oLinesCount = firstBlock.oLines ? firstBlock.oLines.length : 0;
                                }
                                else {
                                    // TODO: attempt to truncate?
                                }
                            }
                        }

                        if (block.mLine <= discussionThread.position.endLine && block.mLine + block.mLinesCount > discussionThread.position.endLine) {
                            if (block.mLine + block.mLinesCount - DiffForCommentConverter.LINES_TO_SHOW <= discussionThread.position.endLine) {
                                // Comment end is close to end of its block.  Include the first few lines of the next block.
                                lastBlockIndex = Math.min(i + 1, newDiffModel.blocks.length - 1);

                                lastBlock = newDiffModel.blocks[lastBlockIndex];

                                if ((i < newDiffModel.blocks.length - 1) && (lastBlock.changeType === VCOM.FileDiffBlockChangeType.None || lastBlock.mLinesCount === 0 || lastBlock.oLinesCount === 0)) {
                                    // Truncate unchanged, add, or delete blocks by a few lines
                                    lastBlock.mLines = lastBlock.mLines ? lastBlock.mLines.slice(0, DiffForCommentConverter.LINES_TO_SHOW) : null;
                                    lastBlock.oLines = lastBlock.oLines ? lastBlock.oLines.slice(0, DiffForCommentConverter.LINES_TO_SHOW) : null;
                                    lastBlock.mLinesCount = lastBlock.mLines ? lastBlock.mLines.length : 0;
                                    lastBlock.oLinesCount = lastBlock.oLines ? lastBlock.oLines.length : 0;
                                }
                                else {
                                    // Only include the block if the change is less than a few lines
                                    if ((lastBlock.mLines && lastBlock.mLines.length > DiffForCommentConverter.LINES_TO_SHOW) || (lastBlock.oLines && lastBlock.oLines.length > DiffForCommentConverter.LINES_TO_SHOW)) {
                                        lastBlockIndex = i;
                                    }
                                }
                            }
                            else {
                                // Comment end is not close the end of its block.  Include the next few lines after the end of the comment.
                                lastBlockIndex = i;

                                lastBlock = newDiffModel.blocks[lastBlockIndex];
                                if (lastBlock.changeType === VCOM.FileDiffBlockChangeType.None || lastBlock.mLinesCount === 0 || lastBlock.oLinesCount === 0) {
                                    // Truncate and keep a few lines after the comment
                                    let mLineSliceOffset = Math.max(0, discussionThread.position.endLine + DiffForCommentConverter.LINES_TO_SHOW - lastBlock.mLine)
                                    let oLineSliceOffset = Math.max(0, discussionThread.position.endLine + DiffForCommentConverter.LINES_TO_SHOW - lastBlock.oLine);
                                    lastBlock.mLines = lastBlock.mLines ? lastBlock.mLines.slice(0, mLineSliceOffset + 1) : null;
                                    lastBlock.oLines = lastBlock.oLines ? lastBlock.oLines.slice(0, oLineSliceOffset + 1) : null;
                                    lastBlock.mLinesCount = lastBlock.mLines ? lastBlock.mLines.length : 0;
                                    lastBlock.oLinesCount = lastBlock.oLines ? lastBlock.oLines.length : 0;
                                }
                                else {
                                    // TODO: attempt to truncate?
                                }
                            }
                            return false;
                        }
                    });
                }
            }
            else if (discussionThread.position.positionContext === DiscussionCommon.PositionContext.LeftBuffer) {
                if (newDiffModel && newDiffModel.blocks) {
                    $.each(newDiffModel.blocks, (i, block) => {
                        let firstBlock, lastBlock;
                        if (block.oLine <= discussionThread.position.startLine && block.oLine + block.oLinesCount >= discussionThread.position.startLine) {
                            if (block.oLine + DiffForCommentConverter.LINES_TO_SHOW >= discussionThread.position.startLine) {
                                // Comment start is close to beginning of its block.  Include the last few lines of the previous block.
                                firstBlockIndex = Math.max(i - 1, 0);

                                firstBlock = newDiffModel.blocks[firstBlockIndex];
                                if ((i > 0) && (firstBlock.changeType === VCOM.FileDiffBlockChangeType.None || firstBlock.oLinesCount === 0 || firstBlock.mLinesCount === 0)) {
                                    // Truncate unchanged, add, or delete blocks by a few lines
                                    if (firstBlock.oLinesCount > DiffForCommentConverter.LINES_TO_SHOW) {
                                        firstBlock.oLine += firstBlock.oLinesCount - DiffForCommentConverter.LINES_TO_SHOW;
                                        firstBlock.oLines = firstBlock.oLines.slice(-DiffForCommentConverter.LINES_TO_SHOW);
                                        firstBlock.oLinesCount = firstBlock.oLines.length;
                                    }
                                    if (firstBlock.mLinesCount > DiffForCommentConverter.LINES_TO_SHOW) {
                                        firstBlock.mLine += firstBlock.mLinesCount - DiffForCommentConverter.LINES_TO_SHOW;
                                        firstBlock.mLines = firstBlock.mLines.slice(-DiffForCommentConverter.LINES_TO_SHOW);
                                        firstBlock.mLinesCount = firstBlock.mLines.length;
                                    }
                                }
                                else {
                                    // Only include the block if the change is less than a few lines
                                    if ((firstBlock.oLines && firstBlock.oLines.length > DiffForCommentConverter.LINES_TO_SHOW) || (firstBlock.mLines && firstBlock.mLines.length > DiffForCommentConverter.LINES_TO_SHOW)) {
                                        firstBlockIndex = i;
                                    }
                                }
                            }
                            else {
                                // Comment start is not close to the beginning of its block.  Include the previous few lines before the beginning of the comment.
                                firstBlockIndex = i;

                                firstBlock = newDiffModel.blocks[firstBlockIndex];
                                if (firstBlock.changeType === VCOM.FileDiffBlockChangeType.None || firstBlock.oLinesCount === 0 || firstBlock.mLinesCount === 0) {
                                    // Truncate and keep a few lines before the comment
                                    let oLineSliceOffset = Math.max(discussionThread.position.startLine - DiffForCommentConverter.LINES_TO_SHOW - firstBlock.oLine, 0);
                                    let mLineSliceOffset = Math.max(discussionThread.position.startLine - DiffForCommentConverter.LINES_TO_SHOW - firstBlock.mLine, 0);
                                    firstBlock.oLine += oLineSliceOffset;
                                    firstBlock.mLine += mLineSliceOffset;
                                    firstBlock.oLines = firstBlock.oLines ? firstBlock.oLines.slice(oLineSliceOffset) : null;
                                    firstBlock.mLines = firstBlock.mLines ? firstBlock.mLines.slice(mLineSliceOffset) : null;
                                    firstBlock.oLinesCount = firstBlock.oLines ? firstBlock.oLines.length : 0;
                                    firstBlock.mLinesCount = firstBlock.mLines ? firstBlock.mLines.length : 0;
                                }
                                else {
                                    // TODO: attempt to truncate?
                                }
                            }
                        }

                        if (block.oLine <= discussionThread.position.endLine && block.oLine + block.oLinesCount >= discussionThread.position.endLine) {
                            if (block.oLine + block.oLinesCount - DiffForCommentConverter.LINES_TO_SHOW <= discussionThread.position.endLine) {
                                // Comment end is close to end of its block.  Include the first few lines of the next block.
                                lastBlockIndex = Math.min(i + 1, newDiffModel.blocks.length - 1);

                                lastBlock = newDiffModel.blocks[lastBlockIndex];
                                if ((i < newDiffModel.blocks.length - 1) && (lastBlock.changeType === VCOM.FileDiffBlockChangeType.None || lastBlock.oLinesCount === 0 || lastBlock.mLinesCount === 0)) {
                                    // Truncate unchanged, add, or delete blocks by a few lines
                                    lastBlock.oLines = lastBlock.oLines ? lastBlock.oLines.slice(0, DiffForCommentConverter.LINES_TO_SHOW) : null;
                                    lastBlock.mLines = lastBlock.mLines ? lastBlock.mLines.slice(0, DiffForCommentConverter.LINES_TO_SHOW) : null;
                                    lastBlock.oLinesCount = lastBlock.oLines ? lastBlock.oLines.length : 0;
                                    lastBlock.mLinesCount = lastBlock.mLines ? lastBlock.mLines.length : 0;
                                }
                                else {
                                    // Only include the block if the change is less than a few lines
                                    if ((lastBlock.mLines && lastBlock.mLines.length > DiffForCommentConverter.LINES_TO_SHOW) || (lastBlock.oLines && lastBlock.oLines.length > DiffForCommentConverter.LINES_TO_SHOW)) {
                                        lastBlockIndex = Math.min(i + 1, newDiffModel.blocks.length - 1);
                                    }
                                }
                            }
                            else {
                                // Comment end is not close the end of its block.  Include the next few lines after the end of the comment.
                                lastBlockIndex = Math.min(i + 1, newDiffModel.blocks.length - 1);

                                lastBlock = newDiffModel.blocks[lastBlockIndex];
                                if (lastBlock.changeType === VCOM.FileDiffBlockChangeType.None || lastBlock.mLinesCount === 0 || lastBlock.oLinesCount === 0) {
                                    // Truncate and keep a few lines after the comment
                                    let oLineSliceOffset = Math.max(0, discussionThread.position.endLine + DiffForCommentConverter.LINES_TO_SHOW - lastBlock.oLine);
                                    let mLineSliceOffset = Math.max(0, discussionThread.position.endLine + DiffForCommentConverter.LINES_TO_SHOW - lastBlock.mLine)
                                    lastBlock.oLines = lastBlock.oLines ? lastBlock.oLines.slice(0, oLineSliceOffset + 1) : null;
                                    lastBlock.mLines = lastBlock.mLines ? lastBlock.mLines.slice(0, mLineSliceOffset + 1) : null;
                                    lastBlock.oLinesCount = lastBlock.oLines ? lastBlock.oLines.length : 0;
                                    lastBlock.mLinesCount = lastBlock.mLines ? lastBlock.mLines.length : 0;
                                }
                                else {
                                    // TODO: attempt to truncate?
                                }
                            }

                            return false;
                        }
                    });
                }
            }
            else {
                // TODO: handle InLineBuffer?
            }

            if (newDiffModel && newDiffModel.blocks) {
                newDiffModel.blocks = newDiffModel.blocks.slice(firstBlockIndex, lastBlockIndex + 1);
            }
        }

        return newDiffModel;
    }
}