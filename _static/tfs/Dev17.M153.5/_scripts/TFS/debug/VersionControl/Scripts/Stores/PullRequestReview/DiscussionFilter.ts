import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import { PullRequestActivityOrder } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export enum DiscussionType {
    Unknown = 0x01,
    Comment = 0x02,
    FileComment = 0x04,
    InlineComment = 0x08,
    Merge = 0x10,
    Commit = 0x20,
    Vote = 0x40,
    PREvent = 0x80,  // created, abandoned, re-opened
    Policy = 0x100,
    CodeAnalysis = 0x200,
    Reviewer = 0x400,  // Reviewer added or removed from PR - currently not supported
    AutoComplete = 0x800,
    Iteration = 0x1000,
    ResetAllVotes = 0x2000,
    ResetMultipleVotes = 0x4000,
    IsDraft = 0x8000,

    // comments by status
    New = 0x10000,
    Active = 0x20000,
    Pending = 0x40000,
    WontFix = 0x80000,
    ByDesign = 0x100000,
    Fixed = 0x200000,
    Closed = 0x400000,
    Mine = 0x800000,
    AllActiveComments = Active | Pending,
    AllResolvedComments = WontFix | ByDesign | Fixed | Closed,

    // comments by property
    Unsaved = 0x10000000,
    Expanded = 0x20000000,

    None = 0x0,
    AllComments = Comment | FileComment | InlineComment,
    AllNonComments = Iteration | PREvent | Merge | Commit | Vote | ResetAllVotes | ResetMultipleVotes | Policy | CodeAnalysis | Reviewer | AutoComplete | IsDraft,
    Discussions = AllComments | Iteration | PREvent,
    All = ~0,
    AllExact = AllComments | AllNonComments
}

// This is a less than ideal location to keep these
// Must keep in sync with Tfs/Service/Git/Plugins/Server/CodeReviewConstants.cs -- #region CodeReviewTypes
// Must keep in sync with CodeReview/Client/WebApi/CodeReviewConstants.cs -- #region CodeReviewTypes
export module SystemDiscussionTypes {
    export let MERGEATTEMPT = "MergeAttempt";
    export let REFUPDATE = "RefUpdate";
    export let VOTEUPDATE = "VoteUpdate";
    export let RESETALLVOTES = "ResetAllVotes";
    export let RESETMULTIPLEVOTES = "ResetMultipleVotes";
    export let STATUSUPDATE = "StatusUpdate";
    export let POLICYSTATUSUPDATE = "PolicyStatusUpdate";
    export let CODEANALYSISISSUE = "CodeAnalysisIssue";
    export let REVIEWERSUPDATE = "ReviewersUpdate";
    export let AUTOCOMPLETEUPDATE = "AutoCompleteUpdate";
    export let ISDRAFTUPDATE = "IsDraftUpdate";
    export let PULLREQUESTSTATUSUPDATE = "AssociatedStatusUpdate";
}

export interface IDiscussionFilterOptions {
    /**
     * Filter types to include. Defaults to ALL.
     */
    types?: DiscussionType;
    /**
     * Filter types to exclude. Defaults to NONE.
     */
    excludeTypes?: DiscussionType;
    /**
     * Filter only those threads which are in the given paths. Defaults to NONE.
     */
    paths?: string[];
    /**
     * Whether or not to include deleted discussions. Defaults to FALSE.
     */
    includeDeleted?: boolean;
    /**
     * Whether or not to include pending discussions. Defaults to FALSE.
     */
    includePending?: boolean;
    /**
     * Whether or not to include collapsed discussions. Defaults to TRUE.
     */
    includeCollapsed?: boolean;
    /**
     * Sort order of the filtered discussions. Defaults to TRUE.
     */
    sort?: PullRequestActivityOrder;
    /**
     * The requested iteration context of the discussions
     */
    requestedContext?: DiscussionThreadIterationContext;
}

export const DiscussionFilterDefaultOptions: IDiscussionFilterOptions = {
    types: DiscussionType.All,
    excludeTypes: DiscussionType.None,
    paths: null,
    includeDeleted: false,
    includePending: false,
    includeCollapsed: true,
    sort: PullRequestActivityOrder.Time_NewFirst,
    requestedContext: DiscussionThreadIterationContext.Current,
}

export class DiscussionFilter {
    private _cachedOptionsCurrent: IDiscussionFilterOptions;
    private _cachedOptionsLatest: IDiscussionFilterOptions;

    private _cachedThreadsCurrent: DiscussionThread[];
    private _cachedThreadsLatest: DiscussionThread[];

    private _currentIdentityId: string;

    constructor(tfsContext?: TfsContext) {
        this._cachedOptionsCurrent = null;
        this._cachedOptionsLatest = null;
        this._cachedThreadsCurrent = null;
        this._cachedThreadsLatest = null;

        this._currentIdentityId = tfsContext && tfsContext.currentIdentity && tfsContext.currentIdentity.id;
    }

    public invalidateCache(): void {
        this._cachedOptionsCurrent = null;
        this._cachedOptionsLatest = null;
        this._cachedThreadsCurrent = null;
        this._cachedThreadsLatest = null;
    }

    public setCurrentIdentityId(tfsContext: TfsContext): void {
        this._currentIdentityId = tfsContext && tfsContext.currentIdentity && tfsContext.currentIdentity.id;
    }

    public threadMatchesFilter(thread: DiscussionThread, options: IDiscussionFilterOptions): boolean {
        if (!thread) {
            return false;
        }

        const filterOptions: IDiscussionFilterOptions = this.getDiscussionFilterOptionsWithDefaults(options);
        const allTypes: boolean = ((filterOptions.types & DiscussionType.AllExact) == DiscussionType.AllExact);

        const passesDeleteFilter: boolean = (!thread.isDeleted || filterOptions.includeDeleted);
        //also check for isComitting because threads in the process of being saved should always be shown separate from whether pending is shown or not
        const passesPendingFilter: boolean = (thread.id >= 0 || (thread.comments && thread.comments[0] && thread.comments[0].isComitting) || filterOptions.includePending);
        const passesCollapseFilter: boolean = (!thread.isCollapsed || filterOptions.includeCollapsed);

        const passesTypeFilter: boolean = (allTypes || (filterOptions.types & this.getDiscussionType(thread)) != 0);
        const passesExcludeTypeFilter: boolean = (!filterOptions.excludeTypes || (filterOptions.excludeTypes & this.getDiscussionType(thread)) == 0);
        const passesPathFilter: boolean = !filterOptions.paths || !thread.itemPath || (Utils_Array.contains(filterOptions.paths, thread.itemPath));

        return passesDeleteFilter && passesCollapseFilter && passesPendingFilter && passesTypeFilter && passesExcludeTypeFilter && passesPathFilter;
    }

    public getDiscussionType(thread: DiscussionThread): DiscussionType {
        let threadType: DiscussionType = DiscussionType.Unknown;

        if (!thread) {
            return threadType;
        }

        // label overall thread type
        if (thread.properties && thread.properties.CodeReviewThreadType) {
            if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.MERGEATTEMPT) === 0) {
                threadType = DiscussionType.Merge;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.REFUPDATE) === 0) {
                threadType = DiscussionType.Commit;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.VOTEUPDATE) === 0) {
                threadType = DiscussionType.Vote;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.RESETALLVOTES) === 0) {
                threadType = DiscussionType.ResetAllVotes;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.RESETMULTIPLEVOTES) === 0) {
                threadType = DiscussionType.ResetMultipleVotes;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.STATUSUPDATE) === 0) {
                threadType = DiscussionType.PREvent;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.POLICYSTATUSUPDATE) === 0) {
                threadType = DiscussionType.Policy;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.CODEANALYSISISSUE) === 0) {
                threadType = DiscussionType.CodeAnalysis;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.REVIEWERSUPDATE) === 0) {
                threadType = DiscussionType.Reviewer;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.AUTOCOMPLETEUPDATE) === 0) {
                threadType = DiscussionType.AutoComplete;
            }
            else if (Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, SystemDiscussionTypes.ISDRAFTUPDATE) === 0) {
                threadType = DiscussionType.IsDraft;
            }
        }
        else if (thread.itemPath) {
            if (thread.position && thread.position.startLine) {
                threadType = DiscussionType.InlineComment;
            }
            else {
                threadType = DiscussionType.FileComment;
            }
        }
        else if (thread.comments && thread.comments.length > 0) {
            threadType = DiscussionType.Comment;
        }

        // if type is a comment, label the comment status
        if ((threadType & DiscussionType.AllComments) !== 0) {
            switch (thread.status) {
                case DiscussionStatus.Active:
                    threadType |= DiscussionType.Active;
                    break;
                case DiscussionStatus.Pending:
                    threadType |= DiscussionType.Pending;
                    break;
                case DiscussionStatus.WontFix:
                    threadType |= DiscussionType.WontFix;
                    break;
                case DiscussionStatus.ByDesign:
                    threadType |= DiscussionType.ByDesign;
                    break;
                case DiscussionStatus.Fixed:
                    threadType |= DiscussionType.Fixed;
                    break;
                case DiscussionStatus.Closed:
                    threadType |= DiscussionType.Closed;
                    break;
            }
        }

        // if thread is new, label the type
        if (thread.hasUnseenContent) {
            threadType |= DiscussionType.New;
        }

        // if thread has comments and we have a current tfsContext, label authorship types
        if (this._currentIdentityId && thread.comments && thread.comments.length > 0) {
            for (const comment of thread.comments) {
                if (!comment.isDeleted && comment.author && comment.author.id === this._currentIdentityId) {
                    threadType |= DiscussionType.Mine;
                    break;
                }
            }
        }

        // label thread properties
        if (thread.id < 0) {
            threadType |= DiscussionType.Unsaved;
        }
        
        if (!thread.isDeleted && !thread.isCollapsed) {
            threadType |= DiscussionType.Expanded;
        }

        return threadType;
    }

    public filterAndSortDiscussionThreads(threads: DiscussionThread[], options?: IDiscussionFilterOptions): DiscussionThread[] {
        if (!threads) {
            return null;
        }

        const filterOptions: IDiscussionFilterOptions = this.getDiscussionFilterOptionsWithDefaults(options);
        if (this.hasCachedThreads(filterOptions)) {
            return this.getCachedThreads(filterOptions);
        }

        const filteredThreads: DiscussionThread[]  = this.filterDiscussionThreads(threads, filterOptions);

        if (Boolean(options.sort)) {
            this._sortDiscussionThreads(filteredThreads, filterOptions);
        }

        if (Boolean(options.requestedContext)) {
            this._cacheThreads(filteredThreads, filterOptions);
        }

        return filteredThreads;
    }

    public filterDiscussionThreads(threads: DiscussionThread[], options?: IDiscussionFilterOptions): DiscussionThread[] {
        if (!threads) {
            return [];
        }
        return threads.filter(thread => this.threadMatchesFilter(thread, options));
    }

    public getDiscussionFilterOptionsWithDefaults(options?: IDiscussionFilterOptions): IDiscussionFilterOptions {
        return { ...DiscussionFilterDefaultOptions, ...options };
    }

    public hasCachedThreads(options: IDiscussionFilterOptions): boolean {
        const cachedThreads: DiscussionThread[] = options.requestedContext === DiscussionThreadIterationContext.Latest
            ? this._cachedThreadsLatest
            : this._cachedThreadsCurrent;

        const cachedOptions: IDiscussionFilterOptions = options.requestedContext === DiscussionThreadIterationContext.Latest
            ? this._cachedOptionsLatest
            : this._cachedOptionsCurrent;

        return Boolean(cachedThreads)
            && Boolean(cachedOptions)
            && (cachedOptions.types === options.types)
            && (cachedOptions.excludeTypes === options.excludeTypes)
            && Utils_Array.shallowEquals(cachedOptions.paths || [], options.paths || [])
            && (cachedOptions.includeDeleted === options.includeDeleted)
            && (cachedOptions.includePending === options.includePending)
            && (cachedOptions.includeCollapsed === options.includeCollapsed)
            && (cachedOptions.sort === options.sort);
    }

    public getCachedThreads(options: IDiscussionFilterOptions): DiscussionThread[] {
        return options.requestedContext === DiscussionThreadIterationContext.Latest
            ? this._cachedThreadsLatest
            : this._cachedThreadsCurrent;
    }

    private _cacheThreads(threads: DiscussionThread[], options: IDiscussionFilterOptions): void {
        if (options.requestedContext === DiscussionThreadIterationContext.Latest) {
            this._cachedThreadsLatest = threads;
            this._cachedOptionsLatest = options;
        }
        else {
            this._cachedThreadsCurrent = threads;
            this._cachedOptionsCurrent = options;
        }
    }

    private _getTime(thread: DiscussionThread): number {
        if (thread) {
            if (thread.publishedDate) {
                return thread.publishedDate.getTime();
            }
            if (thread.createdDate) {
                return thread.createdDate.getTime();
            }
        }
        return Date.now();
    }

    private _sortDiscussionThreads(threads: DiscussionThread[], options: IDiscussionFilterOptions): void {
        if (options.sort == PullRequestActivityOrder.Time_OldFirst) {
            threads.sort((thread1, thread2) => {
                return this._getTime(thread1) - this._getTime(thread2);
            });
        }
        else { // default option
            threads.sort((thread1, thread2) => {
                return this._getTime(thread2) - this._getTime(thread1);
            });
        }
    }
}
