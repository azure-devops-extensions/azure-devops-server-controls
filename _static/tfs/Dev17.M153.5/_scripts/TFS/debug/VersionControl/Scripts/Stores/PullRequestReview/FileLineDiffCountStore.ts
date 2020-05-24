import { RemoteStore } from "VSS/Flux/Store";
import * as Diag from "VSS/Diag";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as DiffCountService from "VersionControl/Scripts/Services/DiffCountService";
import ChangeTransformer = require("VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer");

/**
 * A passthru store to get info from a static map in BuiltInDiffViewer
 */
export class FileLineDiffCountStore extends RemoteStore {

    public getLinesAdded(selectedPath: string, diffItem: ChangeTransformer.GitDiffItem, repositoryContext: RepositoryContext): number {
        return this._lookup(true, selectedPath, diffItem, repositoryContext);
    }

    public getLinesDeleted(selectedPath: string, diffItem: ChangeTransformer.GitDiffItem, repositoryContext: RepositoryContext): number {
        return this._lookup(false, selectedPath, diffItem, repositoryContext);
    }

    public ensureLoaded(selectedPath: string, diffItem: ChangeTransformer.GitDiffItem, repositoryContext: RepositoryContext): IPromise<void> {
        if (diffItem) {
            const diffLineCountService: DiffCountService.IDiffCountService = DiffCountService.getDiffCountService(repositoryContext);
            const result: DiffCountService.DiffFileLineCount = diffLineCountService.getLineCounts({
                opath: diffItem.opath,
                oversion: diffItem.oversion,
                mpath: diffItem.mpath,
                mversion: diffItem.mversion
            } as DiffCountService.IDiffLineCountOptions);
            if (result) {
                return Promise.resolve(null);
            } 
            else {
                return this._loadLines(selectedPath, diffItem, diffLineCountService);
            }
        }
    }

    /**
     * Look up item details on the static map DiffFileLineCounts
     * If the item doesn't exist (and complete details are given) issue an async request for the counts
     */
    private _lookup(isAdded: boolean, selectedPath: string, diffItem: ChangeTransformer.GitDiffItem, repositoryContext: RepositoryContext): number {
        if (!diffItem) {
            return null;
        }
        const diffLineCountService: DiffCountService.IDiffCountService = DiffCountService.getDiffCountService(repositoryContext);
        const result: DiffCountService.DiffFileLineCount = diffLineCountService.getLineCounts({
            opath: diffItem.opath,
            oversion: diffItem.oversion,
            mpath: diffItem.mpath,
            mversion: diffItem.mversion
        } as DiffCountService.IDiffLineCountOptions);
        if (result) {
            if (isAdded) {
                return result.linesAdded;
            }
            else {
                return result.linesDeleted
            }
        }
        this._loadLines(selectedPath, diffItem, diffLineCountService);
        return null;
    }

    /**
     * Perform an async request to get line counts
     * Emit on response
     */
    private _loadLines(selectedPath: string, diffItem: ChangeTransformer.GitDiffItem, diffLineCountService: DiffCountService.IDiffCountService): IPromise<void> {
        if (selectedPath && selectedPath !== "/" && diffItem) {
            return diffLineCountService.beginLoadLineCounts({
                opath: diffItem.opath,
                oversion: diffItem.oversion,
                mpath: diffItem.mpath,
                mversion: diffItem.mversion
            } as DiffCountService.IDiffLineCountOptions).then((neededToLoad: boolean) => {
                if (neededToLoad) {
                    this.emitChanged();
                }
            }).then(null, error => {
                Diag.logError(`Line counts not found for ${diffItem.opath}@${diffItem.oversion} or ${diffItem.mpath}@${diffItem.mversion}`);
            })
        }

        return Promise.resolve(null);
    }
}