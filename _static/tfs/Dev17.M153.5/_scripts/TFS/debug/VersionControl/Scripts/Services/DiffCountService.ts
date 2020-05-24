import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCService = require("VersionControl/Scripts/Services/Service");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

export interface IDiffLineCountOptions {
    opath: string;
    oversion: string;
    mpath: string;
    mversion: string;
}

export interface DiffFileLineCount {
    linesAdded: number;
    linesDeleted: number;
}

export interface IDiffCountService {
    beginLoadLineCounts(options: IDiffLineCountOptions): IPromise<boolean>;
    getLineCounts(options: IDiffLineCountOptions): DiffFileLineCount;
    setLineCounts(options: IDiffLineCountOptions, count: DiffFileLineCount): void;
}

export function getDiffCountService(repositoryContext: RepositoryContext): IDiffCountService {
    return VCService.getRepositoryService(Implementation.DiffCountService, repositoryContext);
}

module Implementation {

    export class DiffCountService implements IDiffCountService {
        private _DiffFileLineCounts: { [key: string]: DiffFileLineCount } = {};
        private _FileDiffRequests: { [key: string]: IPromise<boolean> } = {};

        constructor(private repositoryContext: RepositoryContext) {
        }

        /**
         * Generate Key for Diff Map
         */
        private _generateDiffKey(options: IDiffLineCountOptions) {
            const opath = options.opath;
            const oversion = options.oversion;
            const mpath = options.mpath;
            const mversion = options.mversion;
            return opath + "|" + oversion + "|" + mpath + "|" + mversion;
        }

        /**
         * Make a request for line counts for displaying +/- numbers on a file
         */
        public beginLoadLineCounts(options: IDiffLineCountOptions): IPromise<boolean> {
            //Ensure we have complete details
            if (!options.opath || !options.oversion || !options.mpath || !options.mversion) {
                return Promise.resolve(false);
            }

            //Ensure we make the request only once
            const lookupString = this._generateDiffKey(options);
            if (this._FileDiffRequests[lookupString]) {
                // Trying to preserve the original logic here. Which was only the first caller
                // of this stuff causes the caller to react, even though others might receive the same promise
                return this._FileDiffRequests[lookupString].then(() => { return false });
            }
            this._FileDiffRequests[lookupString] = new Promise((resolve, reject) => {
                this.repositoryContext.getClient().beginGetFileDiff(this.repositoryContext,
                    <VCLegacyContracts.FileDiffParameters>{
                        originalPath: options.opath,
                        originalVersion: options.oversion,
                        modifiedPath: options.mpath,
                        modifiedVersion: options.mversion,
                        partialDiff: false,
                        includeCharDiffs: false
                    }, (diffModel: VCLegacyContracts.FileDiff) => {
                        //Iterate and get counts
                        let linesAdded: number = 0;
                        let linesDeleted: number = 0;
                        if (!diffModel.binaryContent && !diffModel.emptyContent) {
                            $.each(diffModel.lineCharBlocks, (i, lineCharBlock) => {
                                const block: VCLegacyContracts.FileDiffBlock = lineCharBlock.lineChange;
                                if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Add) {
                                    linesAdded += block.mLinesCount;
                                }
                                else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Delete) {
                                    linesDeleted += block.oLinesCount;
                                }
                                else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
                                    linesAdded += block.mLinesCount;
                                    linesDeleted += block.oLinesCount;
                                }
                            });
    
                            const lookupString = this._generateDiffKey(options);
                            this._DiffFileLineCounts[lookupString] = {
                                linesAdded: linesAdded,
                                linesDeleted: linesDeleted
                            } as DiffFileLineCount;
    
                            resolve(true);
                        }
                    }, (error) => reject(error));
            });

            return this._FileDiffRequests[lookupString];
        }

        public getLineCounts(options: IDiffLineCountOptions): DiffFileLineCount {
            const key = this._generateDiffKey(options);
            return this._DiffFileLineCounts[key];
        }

        public setLineCounts(options: IDiffLineCountOptions, count: DiffFileLineCount) {
            const key = this._generateDiffKey(options);
            this._DiffFileLineCounts[key] = count;
        }
    }
}