import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

export class DiffBlockForCommentConverter {
    private static LINES_TO_SHOW: number = 3;
    
    public convertDiffModel(diffModel: VCLegacyContracts.FileDiff, threadPosition: DiscussionCommon.DiscussionPosition, linesAbove: number, linesBelow: number) {
        linesAbove = Math.max(linesAbove, DiffBlockForCommentConverter.LINES_TO_SHOW);
        linesBelow = Math.max(linesBelow, DiffBlockForCommentConverter.LINES_TO_SHOW);
        let firstBlockIndex = -1, lastBlockIndex = -1, newDiffModel = diffModel;

        if (threadPosition) {
            newDiffModel = <VCLegacyContracts.FileDiff>$.extend(true, {}, diffModel);
            let fromRightBuffer: boolean = threadPosition.positionContext === DiscussionCommon.PositionContext.RightBuffer; // if discussion is in original lines
            let fromLeftBuffer: boolean = threadPosition.positionContext === DiscussionCommon.PositionContext.LeftBuffer; // if discussion is in modified lines
            let firstLineNumber: number = 1, threadBlockIndex: number = 0;

            if (newDiffModel && newDiffModel.blocks && (fromRightBuffer || fromLeftBuffer)) {
                let threadDisplayPosition = this.convertThreadDisplayPosition(newDiffModel.blocks[newDiffModel.blocks.length - 1], threadPosition);
               
                $.each(newDiffModel.blocks, (i, block) => {
                    let firstBlock: VCLegacyContracts.FileDiffBlock, lastBlock: VCLegacyContracts.FileDiffBlock;
                    let firstCharBlock: VCLegacyContracts.FileCharDiffBlock, lastCharBlock: VCLegacyContracts.FileCharDiffBlock;

                    if (this.blockContainsLine(block, threadDisplayPosition.startLine, threadDisplayPosition.positionContext)) {
                        // If comment start is close to beginning of its block's lines (in first linesAbove of block).  
                        if ((fromRightBuffer && block.mLine + linesAbove > threadDisplayPosition.startLine) || (fromLeftBuffer && block.oLine + linesAbove > threadDisplayPosition.startLine)) {
                            let previousBlockLines: number = 0; // Check how many lines are needed from previous block
                            if (fromRightBuffer) {
                                previousBlockLines = linesAbove - (threadDisplayPosition.startLine - block.mLine)
                            } else if (fromLeftBuffer) {
                                previousBlockLines = linesAbove - (threadDisplayPosition.startLine - block.oLine);
                            }
                            // If a substitution change and we are in modified lines, see if there are enough original lines to supply the remainder of linesAbove
                            if (fromRightBuffer && block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit && previousBlockLines <= block.oLinesCount) {
                                firstBlockIndex = i; //Include the last couple lines of original Lines from the block
                                firstBlock = newDiffModel.blocks[firstBlockIndex];
                                firstCharBlock = newDiffModel.lineCharBlocks[firstBlockIndex];
                                this.sliceOLines(firstBlock, firstCharBlock, - previousBlockLines);
                            }
                            else if (i > 0) {// We need to pull lines from the previous block to show enough lines before the thread
                                if (fromRightBuffer && block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) { // If in substitution block and we're in modified lines
                                    previousBlockLines -= block.oLinesCount; // We can subtract the original lines from our remaining lines to show
                                }

                                firstBlockIndex = i; 
                                while (previousBlockLines > 0 && firstBlockIndex > 0) {// Keep working back through blocks until enough lines
                                    firstBlockIndex = firstBlockIndex - 1;
                                    firstBlock = newDiffModel.blocks[firstBlockIndex];
                                    firstCharBlock = newDiffModel.lineCharBlocks[firstBlockIndex];
                                    
                                    if (firstBlock.mLinesCount > previousBlockLines) {// If there are more than enough modified lines, trim them down
                                        this.sliceMLines(firstBlock, firstCharBlock, -previousBlockLines);
                                    }
                                    if (firstBlock.changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {// Don't decrease remaining lines if None change, or will double-count
                                        previousBlockLines -= firstBlock.mLinesCount;
                                    }
                                    if (previousBlockLines <= 0) { // If we are already done, remove all original lines
                                        this.sliceOLines(firstBlock, firstCharBlock, firstBlock.oLinesCount);
                                    } else if (firstBlock.oLinesCount > previousBlockLines) { // If there are more than enough original lines to finish, trim them down
                                        this.sliceOLines(firstBlock, firstCharBlock, -previousBlockLines);
                                    }
                                    previousBlockLines -= firstBlock.oLinesCount;
                                }
                            } else { // If already on first block available, nothing to do
                                firstBlockIndex = i;
                                firstBlock = newDiffModel.blocks[firstBlockIndex];
                                firstCharBlock = newDiffModel.lineCharBlocks[firstBlockIndex];
                            }
                        }
                        else {// Comment start is not close to the beginning of its block's lines. Include the previous few lines before the beginning of the comment.
                            firstBlockIndex = i;
                            firstBlock = newDiffModel.blocks[firstBlockIndex];
                            firstCharBlock = newDiffModel.lineCharBlocks[firstBlockIndex];

                            if (firstBlock.changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
                                let offset: number = 0; // Determine how many lines of both o and m to preserve
                                if (fromRightBuffer) { 
                                    offset = Math.max(threadDisplayPosition.startLine - linesAbove - firstBlock.mLine, 0);
                                } else if (fromLeftBuffer) {
                                    offset = Math.max(threadDisplayPosition.startLine - linesAbove - firstBlock.oLine, 0);
                                }
                                this.sliceMLines(firstBlock, firstCharBlock, offset);
                                this.sliceOLines(firstBlock, firstCharBlock, offset);
                            } else if (firstBlock.mLinesCount === 0 || (fromLeftBuffer && firstBlock.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit)) { 
                                // If deletion or substitution and we're in original lines, truncate original lines only
                                let oLineSliceOffset = Math.max(threadDisplayPosition.startLine - linesAbove - firstBlock.oLine, 0);
                                this.sliceOLines(firstBlock, firstCharBlock, oLineSliceOffset);
                            } else if (firstBlock.oLinesCount === 0) { // If no original lines (insertion), truncate modified lines
                                let mLineSliceOffset = Math.max(threadDisplayPosition.startLine - linesAbove - firstBlock.mLine, 0);
                                this.sliceMLines(firstBlock, firstCharBlock, mLineSliceOffset);
                            }
                            else if (fromRightBuffer) { // In case of substitution and we're in modified lines, truncate modified lines and clear all original lines preceding
                                let mLineSliceOffset = Math.max(threadDisplayPosition.startLine - linesAbove - firstBlock.mLine, 0);
                                let oLineSliceOffset = Math.max(firstBlock.oLinesCount, 0);
                                this.sliceMLines(firstBlock, firstCharBlock, mLineSliceOffset);
                                this.sliceOLines(firstBlock, firstCharBlock, oLineSliceOffset);
                            }
                        } // If the first line of the diff is not the first line of the document, mark as truncated to display expander up
                        firstLineNumber = this.getFirstLine(firstBlock);
                        if (firstLineNumber > 1) {
                            firstBlock.truncatedBefore = true;
                            firstCharBlock.lineChange.truncatedBefore = true;
                        }

                        if (firstCharBlock.charChange) {
                            firstCharBlock.charChange = firstCharBlock.charChange.filter(
                                charDiff => charDiff.mLine + charDiff.mLinesCount > 0 || charDiff.oLine + charDiff.oLinesCount > 0);
                        }
                    }
                    if (this.blockContainsLine(block, threadDisplayPosition.endLine, threadDisplayPosition.positionContext)) {// If block contains comment's end line
                        let endBlock = newDiffModel.blocks[newDiffModel.blocks.length - 1];

                        let initialLastMLine: number = endBlock.mLine + endBlock.mLinesCount - 1;
                        let initialLastOLine: number = endBlock.oLine + endBlock.oLinesCount - 1;
                        // If comment end is close to end of its block
                        if ((fromRightBuffer && block.mLine + block.mLinesCount - linesBelow <= threadDisplayPosition.endLine) || (fromLeftBuffer && block.oLine + block.oLinesCount - linesBelow <= threadPosition.endLine)) {
                            let nextBlockLines: number = 0;
                            if (fromLeftBuffer) { // Determine how many lines are needed from next block
                                nextBlockLines = linesBelow - (block.oLine + block.oLinesCount - 1 - threadDisplayPosition.endLine);
                            } else if (fromRightBuffer) {
                                nextBlockLines = linesBelow - ((block.mLine + block.mLinesCount - 1) - threadDisplayPosition.endLine);
                            }
                            // If a substitution block and we're in original lines, see if there are enough modified lines to supply the remainder of linesBelow
                            if (fromLeftBuffer && block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit && nextBlockLines <= block.mLinesCount) {
                                lastBlockIndex = i;
                                lastBlock = newDiffModel.blocks[lastBlockIndex];
                                lastCharBlock = newDiffModel.lineCharBlocks[lastBlockIndex];
                                this.sliceMLines(lastBlock, lastCharBlock, 0, nextBlockLines);
                            }
                            else if (i < newDiffModel.blocks.length - 1) { // If not already on last block
                                // If substitution block and we're in original lines, subtract modified lines from remaining lines to show
                                if (fromLeftBuffer && block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
                                    nextBlockLines -= block.mLinesCount;
                                }
                                lastBlockIndex = i;
                                while (nextBlockLines > 0 && lastBlockIndex < newDiffModel.blocks.length - 1) {// keep working forward through blocks until enough lines.
                                    lastBlockIndex = lastBlockIndex + 1;
                                    lastBlock = newDiffModel.blocks[lastBlockIndex];
                                    lastCharBlock = newDiffModel.lineCharBlocks[lastBlockIndex];
                                        
                                    if (lastBlock.oLinesCount > nextBlockLines) {// If there are more than enough original lines, trim them down
                                        this.sliceOLines(lastBlock, lastCharBlock, 0, nextBlockLines);
                                    }
                                    if (lastBlock.changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {// Don't decrease remaining lines if None change, or will double-count
                                        nextBlockLines -= lastBlock.oLinesCount;
                                    }
                                    if (nextBlockLines <= 0) { // If we are already done, remove all modified lines
                                        this.sliceMLines(lastBlock, lastCharBlock, lastBlock.mLinesCount);
                                    } else if (lastBlock.mLinesCount > nextBlockLines) { // If there are more than enough modified lines to finish, trim them down
                                        this.sliceMLines(lastBlock, lastCharBlock,  0, nextBlockLines);
                                    }
                                    nextBlockLines -= lastBlock.mLinesCount;
                                }
                            }
                            else { // If already on last block, nothing to do
                                lastBlockIndex = i;
                                lastBlock = newDiffModel.blocks[lastBlockIndex];
                                lastCharBlock = newDiffModel.lineCharBlocks[lastBlockIndex];
                            }
                        }
                        else { // Comment end is not close to end of its block.  Include the next few lines after the end of the comment.
                            lastBlockIndex = i;
                            lastBlock = newDiffModel.blocks[lastBlockIndex];
                            lastCharBlock = newDiffModel.lineCharBlocks[lastBlockIndex];

                            if (lastBlock.changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
                                let offset: number = 0; // Determine how many lines of both o and m to preserve
                                if (fromRightBuffer) {
                                    offset = Math.max(0, threadDisplayPosition.endLine + linesBelow - lastBlock.mLine);
                                } else if (fromLeftBuffer) {
                                    offset = Math.max(0, threadDisplayPosition.endLine + linesBelow - lastBlock.oLine);
                                }
                                this.sliceMLines(lastBlock, lastCharBlock,  0, offset + 1);
                                this.sliceOLines(lastBlock, lastCharBlock, 0, offset + 1);
                            } else if (lastBlock.mLinesCount === 0) { // If no modified Lines (deletion), truncate original lines only
                                let oLineSliceOffset = Math.max(0, threadDisplayPosition.endLine + linesBelow - lastBlock.oLine);
                                this.sliceOLines(lastBlock, lastCharBlock, 0, oLineSliceOffset + 1);
                            } else if (lastBlock.oLinesCount === 0 || (fromRightBuffer && lastBlock.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit)) { 
                                // If no original lines (insertion), truncate modified lines. If substitution and we're in modified, truncate modified lines but leave original lines alone
                                let mLineSliceOffset = Math.max(0, threadDisplayPosition.endLine + linesBelow - lastBlock.mLine);
                                this.sliceMLines(lastBlock, lastCharBlock, 0, mLineSliceOffset + 1);
                            } else if (fromLeftBuffer) {// if substitution block and we're in original lines, truncate original lines and clear all following modified lines
                                let oLineSliceOffset = Math.max(0, threadDisplayPosition.endLine + linesBelow - lastBlock.oLine);
                                let mLineSliceOffset = Math.max(0, lastBlock.mLinesCount);
                                this.sliceOLines(lastBlock, lastCharBlock, 0, oLineSliceOffset + 1);
                                this.sliceMLines(lastBlock, lastCharBlock, mLineSliceOffset);
                            }
                        } // If the last line of the diff is not the last line of the document, mark as truncated to display expander down
                        let lastMLine: number = lastBlock.mLine + lastBlock.mLinesCount - 1;
                        let lastOLine: number = lastBlock.oLine + lastBlock.oLinesCount - 1;
                        if (lastMLine < initialLastMLine || lastOLine < initialLastOLine) {
                            lastBlock.truncatedAfter = true;
                            lastCharBlock.lineChange.truncatedAfter = true;
                        }

                        if (lastCharBlock.charChange) {
                            lastCharBlock.charChange = lastCharBlock.charChange.filter(
                                charDiff => charDiff.mLine + charDiff.mLinesCount > 0 || charDiff.oLine + charDiff.oLinesCount > 0);
                        }

                        return false;
                    }
                });
            }
            if (newDiffModel && newDiffModel.blocks) {
                newDiffModel.blocks = newDiffModel.blocks.slice(firstBlockIndex, lastBlockIndex + 1);
                newDiffModel.lineCharBlocks = newDiffModel.lineCharBlocks.slice(firstBlockIndex, lastBlockIndex + 1);

            }
        }

        return newDiffModel;
    }

    /*
    * Show how many lines will be drawn above the given thread.
    * @param {FileDiffBlock[]} blocks : blocks to count lines from.
    * @param {DiscussionThread} thread : thread whose position we will check
    * @return {number} how many lines are above the discussion thread.
    */
    public linesAboveThread(blocks: VCLegacyContracts.FileDiffBlock[], threadPosition: DiscussionCommon.DiscussionPosition): number {
        if (!blocks || blocks.length == 0 || !threadPosition) {
            return 0;
        }
        let threadDisplayPosition: DiscussionCommon.DiscussionPosition = this.convertThreadDisplayPosition(blocks[blocks.length - 1], threadPosition);
        let linesAbove: number = 0, threadBlockIndex: number = blocks.length;
        for (let i = 0; i < blocks.length; i++) {
            if (this.blockContainsLine(blocks[i], threadDisplayPosition.startLine, threadDisplayPosition.positionContext)) {
                threadBlockIndex = i;
                break;
            }
        }
        if (threadBlockIndex < blocks.length) {
            for (let i = 0; i < threadBlockIndex; i++) {
                if (blocks[i].changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {
                    linesAbove += blocks[i].oLinesCount;
                }
                linesAbove += blocks[i].mLinesCount;
            }
            let threadBlock: VCLegacyContracts.FileDiffBlock = blocks[threadBlockIndex];
            if (threadDisplayPosition.positionContext === DiscussionCommon.PositionContext.LeftBuffer) {
                linesAbove += threadDisplayPosition.startLine - threadBlock.oLine;
            } else if (threadDisplayPosition.positionContext === DiscussionCommon.PositionContext.RightBuffer) {
                if (threadBlock.changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {
                    linesAbove += threadBlock.oLinesCount;
                }
                linesAbove += threadDisplayPosition.startLine - threadBlock.mLine;
            }
        }
        return linesAbove;
    }

    /*
    * Show how many lines will be drawn below the given thread.
    * @param {FileDiffBlock[]} blocks : blocks to count lines from.
    * @param {DiscussionThread} thread : thread whose position we will check
    * @return {number} how many lines are below the discussion thread.
    */
    public linesBelowThread(blocks: VCLegacyContracts.FileDiffBlock[], threadPosition: DiscussionCommon.DiscussionPosition): number {
        if (!blocks || blocks.length == 0 || !threadPosition) {
            return 0;
        }
        let threadDisplayPosition: DiscussionCommon.DiscussionPosition = this.convertThreadDisplayPosition(blocks[blocks.length - 1], threadPosition);

        let linesBelow: number = 0, threadBlockIndex: number = blocks.length;
        for (let i = 0; i < blocks.length; i++) {
            if (this.blockContainsLine(blocks[i], threadDisplayPosition.endLine, threadDisplayPosition.positionContext)) {
                threadBlockIndex = i;
                break;
            }
        }
        if (threadBlockIndex < blocks.length) {
            let threadBlock: VCLegacyContracts.FileDiffBlock = blocks[threadBlockIndex];
            if (threadDisplayPosition.positionContext === DiscussionCommon.PositionContext.LeftBuffer) {
                linesBelow += threadBlock.oLine + threadBlock.oLinesCount - 1 - threadDisplayPosition.endLine;
                if (threadBlock.changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {
                    linesBelow += threadBlock.mLinesCount;
                }
            } else if (threadDisplayPosition.positionContext === DiscussionCommon.PositionContext.RightBuffer) {
                linesBelow += threadBlock.mLine + threadBlock.mLinesCount - 1 - threadDisplayPosition.endLine;
            }

            for (let i = threadBlockIndex + 1; i < blocks.length; i++) {
                if (blocks[i].changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {
                    linesBelow += blocks[i].oLinesCount;
                }
                linesBelow += blocks[i].mLinesCount;
            }
        }
        return linesBelow;
    }

    /*
    * @param {FileDiffBlock} block : Block to check
    * @param {number} line : the line number
    * @param {string} positionContext: if we are looking for this line in the RightBuffer or the LeftBuffer
    * @return {boolean} if the line number is contained in the block with the correct positionContext
    */
    private blockContainsLine(block: VCLegacyContracts.FileDiffBlock, line: number, positionContext: string): boolean {
        if ((positionContext === DiscussionCommon.PositionContext.RightBuffer && block.mLine <= line && (block.mLine + block.mLinesCount > line) ) ||
            (positionContext === DiscussionCommon.PositionContext.LeftBuffer && block.oLine <= line && (block.oLine + block.oLinesCount > line) )) {
            return true;
        }
        return false;
    }

    /*
    * @param {FileDiffBlock} endBlock: Last block in the set of blocks we want to display the thread in
    * @param {DiscussionPosition} position: The position of the thread we want to display
    * @return {DiscussionPosition} This method gives the position that a thread should be displayed in case the actual position comes after the last block
    */
    private convertThreadDisplayPosition(endBlock: VCLegacyContracts.FileDiffBlock, position: DiscussionCommon.DiscussionPosition): DiscussionCommon.DiscussionPosition{
        let lastLine, lastColumn;
        if (position.positionContext === DiscussionCommon.PositionContext.RightBuffer) {
            lastLine = endBlock.mLine + endBlock.mLinesCount - 1;
            lastColumn = endBlock.mLinesCount > 0 ? endBlock.mLines[endBlock.mLinesCount - 1].length : 0;
        }
        else {
            lastLine = endBlock.oLine + endBlock.oLinesCount - 1;
            lastColumn = endBlock.oLinesCount > 0 ? endBlock.oLines[endBlock.oLinesCount - 1].length : 0;
        }

        let displayPosition: DiscussionCommon.DiscussionPosition = {
            endColumn : position.endLine > lastLine ? lastColumn : position.endColumn,
            endLine : Math.min(position.endLine, lastLine),
            positionContext: position.positionContext,
            startColumn: position.startLine > lastLine ? lastColumn : position.startColumn,
            startLine: Math.min(position.startLine, lastLine)
        };

        if (displayPosition.startLine === displayPosition.endLine &&
            displayPosition.startColumn > displayPosition.endColumn) {
            displayPosition.startColumn = displayPosition.endColumn;
        }
        return displayPosition;
    }

    /*
    * Performs Array.slice on the block's oLines with the given parameters, and updates oLine and oLinesCount accordingly.
    * @param {number} begin: Passed to Array.slice. If negative, slices to back {begin} lines.
    * @param {number} end: Passed to Array.slice. If negative, extraction stops {end} items before the end.
    */
    private sliceOLines(block: VCLegacyContracts.FileDiffBlock, charBlock: VCLegacyContracts.FileCharDiffBlock, begin: number, end?: number) {
        return this.sliceLines(block, charBlock, begin, end, "oLine", "oLines", "oLinesCount");
    }

    /*
    * Performs Array.slice on the block's mLines with the given parameters, and updates mLine and mLinesCount accordingly.
    * @param {number} begin: Passed to Array.slice. If negative, slices to back {begin} lines.
    * @param {number} end: Passed to Array.slice. If negative, extraction stops {end} items before the end.
    */
    private sliceMLines(block: VCLegacyContracts.FileDiffBlock, charBlock: VCLegacyContracts.FileCharDiffBlock, begin: number, end?: number) {
        return this.sliceLines(block, charBlock, begin, end, "mLine", "mLines", "mLinesCount");
    }

    private sliceLines(
        block: VCLegacyContracts.FileDiffBlock,
        charBlock: VCLegacyContracts.FileCharDiffBlock,
        begin: number,
        end: number,
        linePropertyName: "mLine" | "oLine",
        linesPropertyName: "mLines" | "oLines",
        lineCountPropertyName: "mLinesCount" | "oLinesCount",
    ) {
        if (begin < 0) {
            block[linePropertyName] += block[lineCountPropertyName] + begin;
        } else {
            block[linePropertyName] += begin;
        }

        const removedCharCount = block[linesPropertyName].reduce(
            (count, line, index) =>
                index < begin
                ? count + line.length
                : count,
            0);

        if (block[linesPropertyName]) {
            const shrinkLines = block[linesPropertyName].slice(begin, end);
            block[linesPropertyName] = shrinkLines;
            block[lineCountPropertyName] = shrinkLines.length;
        }

        charBlock.lineChange[linePropertyName] = block[linePropertyName];
        charBlock.lineChange[linesPropertyName] = charBlock.lineChange[linesPropertyName] ? charBlock.lineChange[linesPropertyName].slice(begin, end) : null;
        charBlock.lineChange[lineCountPropertyName] = block[lineCountPropertyName];

        if (charBlock.charChange) {
            charBlock.charChange = charBlock.charChange
                .map(charChange => ({
                    ...charChange,
                    [linePropertyName]: (charChange[linePropertyName] !== undefined) && (charChange[linePropertyName] - removedCharCount),
                }));
        }
    }

    /*
    * Returns line number of first line in block to be drawn in the diff.
    * @return {number} the row number of the first line to be shown (in modified or original lines)
    */
    private getFirstLine(block: VCLegacyContracts.FileDiffBlock): number {
        if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Add || block.changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
            return block.mLine;
        }
        if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Delete || block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
            return block.oLine;
        }
    }
}

