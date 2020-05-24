import { AnnotationEngine } from "VersionControl/Scripts/Controls/AnnotateAnnotationEngine";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

interface BatchResultsByHistoryIndex {
    [historyIndex: number]: VCLegacyContracts.GitAnnotateBatchResult;
}

interface LineMapLookup {
    [objectId: string]: number[];
}

export class GitAnnotationEngine extends AnnotationEngine {
    private _hasUnprocessedHistory: boolean;
    private _lineMaps: LineMapLookup;
    private _unprocessedBatchResults: BatchResultsByHistoryIndex;

    constructor(repositoryContext: GitRepositoryContext, path: string, version: string) {
        super(repositoryContext, path, version);
    }

    public start() {
        this._hasUnprocessedHistory = false;
        this._lineMaps = {};
        this._unprocessedBatchResults = <BatchResultsByHistoryIndex>{};
        return super.start();
    }

    public hasUnprocessedHistory() {
        return this._hasUnprocessedHistory;
    }

    public getGitRepositoryContext() {
        return <GitRepositoryContext>this.getRepositoryContext();
    }

    public _processHistoryResults(resultModel: VCLegacyContracts.HistoryQueryResults) {

        let gitResultModel = <VCLegacyContracts.GitHistoryQueryResults>resultModel;
        this._hasUnprocessedHistory = gitResultModel.unprocessedCount > 0 || gitResultModel.unpopulatedCount > 0;

        super._processHistoryResults(resultModel);
    }

    public _annotateBatch(startHistoryEntryIndex: number, endHistoryEntryIndex: number, callback: () => void) {

        let versionIndex: number,
            versions: string[] = [],
            historyEntries = this.getHistoryEntries();

        for (versionIndex = startHistoryEntryIndex; versionIndex <= endHistoryEntryIndex; versionIndex++) {
            versions.push(historyEntries[versionIndex].changeList.version);
        }

        return this.getGitRepositoryContext().getGitClient().beginGetAnnotateGitDiffs(
            this.getGitRepositoryContext(),
            this.getItemPath(),
            versions,
            (results: VCLegacyContracts.GitAnnotateBatchResult[]) => {
                if (!this.isCancelled()) {
                    
                    // Process each diff result
                    $.each(results, (resultsIndex: number, result: VCLegacyContracts.GitAnnotateBatchResult) => {
                        let historyEntryIndex = startHistoryEntryIndex + resultsIndex;

                        if (!this._processBatchResults(historyEntryIndex, result, historyEntries)) {
                            // TODO: Remove this once fixed in QueryHistory.
                            // No line map was found for this entry. This may be because history
                            // results are returned out of order. Store this batch result in case
                            // we process its child commit at a later time
                            this._unprocessedBatchResults[historyEntryIndex] = result;
                        }

                        if (this.isComplete()) {
                            return false;
                        }
                    });

                    // Process previously unprocessed diff results for reason in TODO comment above.
                    $.each(this._unprocessedBatchResults, (historyEntryIndex: number, result: VCLegacyContracts.GitAnnotateBatchResult) => {
                        if (this._processBatchResults(historyEntryIndex, result, historyEntries)) {
                            delete this._unprocessedBatchResults[historyEntryIndex];
                        }
                    });

                    callback.call(this);
                }
        });
    }

    private _processBatchResults(historyEntriesIndex: number, result: VCLegacyContracts.GitAnnotateBatchResult, historyEntries: VCLegacyContracts.HistoryEntry[]) {

        let version = historyEntries[historyEntriesIndex].changeList.version,
            lineMap = this._lineMaps[result.mObjectId];

        if (historyEntriesIndex === 0) {
            this._calculateTotalLinesCount(result.diffs[0].diff.blocks);
        }
        else if (!lineMap) {

            // No line map for this line. This can happen in cases where 2
            // different branches separately ended up with the same contents.
            // The first instance of this content will "win" by us continuing
            // the annotate down that path.

            // TODO: This can also happen when history is returned out of order (see TODO comments above)
            return false;
        }

        if (result.diffs.length === 1) {
            // Simple/non-merge result - only one parent. Just update the lines added in this diff block
            this._updateVersionsByLine(result.diffs[0].diff.blocks, version, lineMap);
        }
        else {
            // Merge commit. Only attribute this merge commit to lines that are different from all parents
            this._updateMergeCommitLines(result.diffs, version, lineMap);
        }
        
        // Update the line map which maps lines in the older version to uncalculated lines in the latest version
        $.each(result.diffs, (diffIndex: number, annotateDiff: VCLegacyContracts.GitAnnotateResult) => {
            this._lineMaps[annotateDiff.oObjectId] = this._updateLineMap(annotateDiff.diff.blocks, lineMap);
        });

        if (lineMap) {
            // We are done with this line map. Free its memory. As indicated above,
            // we only process identical content once.
            delete this._lineMaps[result.mObjectId];
        }

        return true;
    }

    private _updateMergeCommitLines(annotateDiffs: VCLegacyContracts.GitAnnotateResult[], version: string, lineMap: number[]) {
        const lines: number[] = [];
        const oLines: number[] = [];

        // For each modified change/line, keep a count of how many diffs contain this line
        $.each(annotateDiffs, (diffIndex: number, annotateDiff: VCLegacyContracts.GitAnnotateResult) => {
            $.each(annotateDiff.diff.blocks, (blockIndex: number, block: VCLegacyContracts.FileDiffBlock) => {
                let lineNumber: number,
                    endLineNumber: number;

                if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Add || block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
                    endLineNumber = block.mLine + block.mLinesCount - 1;
                    let oLine = block.oLine;
                    for (lineNumber = block.mLine; lineNumber <= endLineNumber; lineNumber++) {
                        lines[lineNumber] = (lines[lineNumber] || 0) + 1;
                        oLines[lineNumber] = oLine++;
                    }
                }
            });
        });

        // Update lines that were changed from every parent commit (attribute to this merge)
        $.each(lines, (lineNumber: number, hitCount: number) => {
            if (hitCount === annotateDiffs.length) {
                this._updateVersionByLine(lineNumber, version, lineMap, oLines[lineNumber]);
            }
        });
    }
}
