import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface AnnotationBlock {
    startLine: number;
    lineCount: number;
    version: string;
    /**
     * Start line of this block before this version.
     * Undefined for first version in history.
     */
    oLine?: number;
}

interface SingleLineAnnotation {
    version: string;
    oLine?: number;
}

export interface VersionMap {
    [version: string]: VCLegacyContracts.HistoryEntry;
}

export interface AnnotationProgressEventListener {
    (blocks: AnnotationBlock[], versionsMap: VersionMap, complete: boolean): void;
}

export class AnnotationEngine {

    private static MAX_HISTORY_DEPTH = 1000;
    private static DEFAULT_DIFF_BATCH_SIZE = 25;

    private _repositoryContext: RepositoryContext;
    private _path: string;
    private _version: string;

    private _stopped: boolean;
    private _completed: boolean;
    private _moreHistoryAvailable: boolean;
    private _progressEventListeners: AnnotationProgressEventListener[];
    private _errorCallback: (error: Error) => void;
    private _historyEntries: VCLegacyContracts.HistoryEntry[];
    private _currentHistoryEntryIndex: number;
    private _versionMap: VersionMap;
    private _diffBatchSize: number;

    private _singleLineAnnotations: SingleLineAnnotation[];
    private _totalLines: number;
    private _processedLinesCount: number;

    constructor(repositoryContext: RepositoryContext, path: string, version: string) {

        this._repositoryContext = repositoryContext;
        this._path = path;
        this._version = version;
        this._progressEventListeners = [];
        this._diffBatchSize = AnnotationEngine.DEFAULT_DIFF_BATCH_SIZE;
    }

    public addProgressListener(listener: AnnotationProgressEventListener) {
        this._progressEventListeners.push(listener);
    }

    public addErrorCallback(errorCallback: (error: Error) => void) {
        this._errorCallback = errorCallback;
    }

    public isComplete() {
        return this._completed;
    }

    public isCancelled() {
        return this._stopped;
    }

    public getVersionMap() {
        return this._versionMap;
    }

    public getRepositoryContext() {
        return this._repositoryContext;
    }

    public getItemPath() {
        return this._path;
    }

    public getItemVersion() {
        return this._version;
    }

    public getHistoryEntries() {
        return this._historyEntries;
    }

    public hasMoreHistoryAvailable() {
        return this._moreHistoryAvailable;
    }

    public hasUnprocessedHistory() {
        return false;
    }

    public getAnnotationBlocks(): AnnotationBlock[] {
        const blocks: AnnotationBlock[] = [];
        let lastBlock: AnnotationBlock = null;

        for (let lineNumber = 1; lineNumber <= this._totalLines; lineNumber++) {
            const annotation = this._singleLineAnnotations[lineNumber];
            if (annotation) {
                if (lastBlock && lastBlock.version === annotation.version) {
                    lastBlock.lineCount++;
                }
                else {
                    lastBlock = {
                        ...annotation,
                        startLine: lineNumber,
                        lineCount: 1,
                    };
                    blocks.push(lastBlock);
                }
            }
            else {
                lastBlock = null;
            }
        }

        return blocks;
    }

    public getVersionForLineNumber(lineNumber: number): string {
        const annotation = this._singleLineAnnotations[lineNumber];
        return annotation && annotation.version;
    }

    public start() {

        this._stopped = false;
        this._completed = false;
        this._moreHistoryAvailable = false;
        this._versionMap = {};
        this._historyEntries = [];
        this._currentHistoryEntryIndex = 0;
        this._singleLineAnnotations = [];
        this._totalLines = 0;
        this._processedLinesCount = 0;

        return this._beginFetchHistory(AnnotationEngine.MAX_HISTORY_DEPTH, 0, () => {
            if (this._historyEntries.length > 0) {
                return this._annotateNextBatch();
            }
            else {
                // History may not have been calculated yet. Fire progress event so that
                // annotate viewer and update the UI appropriately
                this._fireProgressEvent();
            }
        });
    }

    public cancel() {
        this._stopped = true;
    }

    private _beginFetchHistory(maxResults: number, skip: number, callback: () => void) {
        this._repositoryContext.getClient().beginGetHistory(
            this._repositoryContext,
            this._getHistorySearchCriteria(maxResults, skip),
            resultModel => {
                if (!this._stopped) {
                    this._processHistoryResults(resultModel);
                    callback.call(this);
                }
            },
            this._errorCallback,
        );
    }

    private _annotateNextBatch() {

        let stopAtHistoryEntryIndex: number;

        stopAtHistoryEntryIndex = Math.min(this._currentHistoryEntryIndex + this._diffBatchSize, this._historyEntries.length - 1);

        return this._annotateBatch(this._currentHistoryEntryIndex, stopAtHistoryEntryIndex, () => {

            this._currentHistoryEntryIndex = stopAtHistoryEntryIndex + 1;
            this._fireProgressEvent();

            if (!this._completed && this._historyEntries.length > this._currentHistoryEntryIndex) {
                return this._annotateNextBatch();
            }
        });
    }

    public _annotateBatch(startHistoryEntryIndex: number, endHistoryEntryIndex: number, callback: () => void) {
        throw new Error("_annotateBatch is abstract.");
    }

    private _fireProgressEvent() {
        $.each(this._progressEventListeners, (i: number, progressEventListener: AnnotationProgressEventListener) => {
            progressEventListener.call(this, this.getAnnotationBlocks(), this._versionMap, this._completed);
        });
    }

    /* Protected Methods */

    public _processHistoryResults(resultModel: VCLegacyContracts.HistoryQueryResults) {

        $.each(resultModel.results, (i: number, historyEntry: VCLegacyContracts.HistoryEntry) => {
            this._versionMap[historyEntry.changeList.version] = historyEntry;
        });

        this._historyEntries = (this._historyEntries).concat(resultModel.results);
        this._moreHistoryAvailable = resultModel.moreResultsAvailable;
    }

    public _updateVersionsByLine(diffBlocks: VCLegacyContracts.FileDiffBlock[], version: string, lineMap: number[]) {

        $.each(diffBlocks, (blockIndex: number, block: VCLegacyContracts.FileDiffBlock) => {
            let lineNumber: number,
                endLineNumber: number;

            if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Add || block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
                endLineNumber = block.mLine + block.mLinesCount - 1;
                let oLine = block.oLine;
                for (lineNumber = block.mLine; lineNumber <= endLineNumber; lineNumber++) {
                    this._updateVersionByLine(lineNumber, version, lineMap, oLine++);
                }
            }
        });

        this._completed = (this._processedLinesCount === this._totalLines);
    }

    public _updateVersionByLine(lineNumber: number, version: string, lineMap: number[], oLine: number) {
        let mappedLineNumber: number;
        if (lineMap) {
            mappedLineNumber = lineMap[lineNumber];
        }
        else {
            mappedLineNumber = lineNumber;
        }

        if (mappedLineNumber && !this._singleLineAnnotations[mappedLineNumber]) {
            this._singleLineAnnotations[mappedLineNumber] = { version, oLine };
            this._processedLinesCount++;
        }
    }

    public _updateLineMap(diffBlocks: VCLegacyContracts.FileDiffBlock[], lineMap: number[]): number[] {
        let newLineMap: number[] = [];
        $.each(diffBlocks, (blockIndex: number, block: VCLegacyContracts.FileDiffBlock) => {
            let blockLineIndex: number,
                latestLineNumber: number;

            if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
                for (blockLineIndex = 0; blockLineIndex < block.mLinesCount; blockLineIndex++) {
                    if (lineMap) {
                        latestLineNumber = lineMap[block.mLine + blockLineIndex];
                        if (latestLineNumber && !this._singleLineAnnotations[latestLineNumber]) {
                            newLineMap[block.oLine + blockLineIndex] = latestLineNumber;
                        }
                    }
                    else {
                        newLineMap[block.oLine + blockLineIndex] = block.mLine + blockLineIndex;
                    }
                }
            }
        });
        return newLineMap;
    }

    public _calculateTotalLinesCount(diffBlocks: VCLegacyContracts.FileDiffBlock[]) {
        let i: number;

        this._totalLines = 0;
        for (i = diffBlocks.length - 1; i >= 0; i--) {
            if (diffBlocks[i].mLinesCount > 0) {
                this._totalLines = diffBlocks[i].mLine + diffBlocks[i].mLinesCount - 1;
                break;
            }
        }
    }

    public _setVersionForAllPendingLines(version: string) {
        // We're on the original change. Fill in all remaining lines with the original version
        let lineNumber: number;
        for (lineNumber = 1; lineNumber <= this._totalLines; lineNumber++) {
            if (!this._singleLineAnnotations[lineNumber]) {
                this._singleLineAnnotations[lineNumber] = { version, oLine: undefined };
                this._processedLinesCount++;
            }
        }
        this._completed = true;
    }

    /* End Protected Methods */

    /* Virtual and Abstract Methods */

    public _getHistorySearchCriteria(top: number, skip: number): VCContracts.ChangeListSearchCriteria {
        return <VCContracts.ChangeListSearchCriteria>{
            itemPath: this._path,
            itemVersion: this._version,
            top: top,
            skip: skip,
            followRenames: true,
            excludeDeletes: true
        };
    }
    
    /* End Virtual and Abstract Methods */
}
