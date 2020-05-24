import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import {TfvcClientService} from "VersionControl/Scripts/TfvcClientService"
import VCAnnotateAnnotationEngine = require("VersionControl/Scripts/Controls/AnnotateAnnotationEngine");

export class TfsAnnotationEngine extends VCAnnotateAnnotationEngine.AnnotationEngine {
    
    private _lineMap: number[];

    constructor(repositoryContext: TfvcRepositoryContext, path: string, version: string) {
        super(repositoryContext, path, version);
    }

    public start() {
        this._lineMap = null;
        super.start();
    }

    // protected
    public _getHistorySearchCriteria(maxResults: number, skip: number): VCContracts.ChangeListSearchCriteria {
        return <VCContracts.ChangeListSearchCriteria>$.extend(super._getHistorySearchCriteria(maxResults, skip), {
            toVersion: this.getItemVersion()
        });
    }
    
    public _annotateBatch(startHistoryEntryIndex: number, endHistoryEntryIndex: number, callback: () => void) {

        let versionIndex: number,
            diffParametersArray: VCLegacyContracts.TfsAnnotateDiffParameters[] = [],
            singleDiffParameters: VCLegacyContracts.TfsAnnotateDiffParameters,
            historyEntries = this.getHistoryEntries(),
            oHistoryEntry: VCLegacyContracts.TfsHistoryEntry,
            mHistoryEntry: VCLegacyContracts.TfsHistoryEntry;

        if (historyEntries.length > 1 && endHistoryEntryIndex === historyEntries.length - 1 && !this.hasMoreHistoryAvailable()) {
            // We can skip fetching the very last (original/add) version's diff. Instead, at that point we will just fill in
            // all remaining gaps with the original version
            endHistoryEntryIndex--;
        }

        for (versionIndex = startHistoryEntryIndex; versionIndex <= endHistoryEntryIndex; versionIndex++) {

            mHistoryEntry = <VCLegacyContracts.TfsHistoryEntry>historyEntries[versionIndex];
            singleDiffParameters = <VCLegacyContracts.TfsAnnotateDiffParameters>{
                mFileId: mHistoryEntry.fileId,
                mEncoding: mHistoryEntry.encoding,
                mServerItem: mHistoryEntry.serverItem
            };
            
            oHistoryEntry = <VCLegacyContracts.TfsHistoryEntry>historyEntries[versionIndex + 1];
            if (oHistoryEntry) {
                singleDiffParameters.oFileId = oHistoryEntry.fileId;
                singleDiffParameters.oEncoding = oHistoryEntry.encoding;
                singleDiffParameters.oServerItem = oHistoryEntry.serverItem;
            }

            diffParametersArray.push(singleDiffParameters);
        }

        (<TfvcClientService>this.getRepositoryContext().getClient()).beginGetAnnotateTfsDiffs(diffParametersArray, (diffModels: VCLegacyContracts.FileDiff[]) => {
            if (!this.isCancelled()) {
                
                // Process each diff result
                $.each(diffModels, (i: number, diffModel: VCLegacyContracts.FileDiff) => {
                    let versionIndex = startHistoryEntryIndex + i;

                    if (versionIndex === 0) {
                        this._calculateTotalLinesCount(diffModel.blocks);
                    }

                    // Look for lines added/changed in this version
                    this._updateVersionsByLine(diffModel.blocks, historyEntries[versionIndex].changeList.version, this._lineMap);

                    // Update the line map which maps lines in the older version to uncalculated lines in the latest version
                    this._lineMap = this._updateLineMap(diffModel.blocks, this._lineMap);

                    if (this.isComplete()) {
                        return false;
                    }
                });

                if (!this.isComplete() && endHistoryEntryIndex >= historyEntries.length - 2 && !this.hasMoreHistoryAvailable()) {
                    // We're on the original change. Fill in all remaining lines with the original version
                    this._setVersionForAllPendingLines(historyEntries[historyEntries.length - 1].changeList.version);
                }

                callback.call(this);
            }
        });
    }
}
