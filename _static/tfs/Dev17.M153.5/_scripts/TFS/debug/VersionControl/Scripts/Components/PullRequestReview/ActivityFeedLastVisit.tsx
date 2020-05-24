import React = require("react");
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { GitPullRequestIteration } from "TFS/VersionControl/Contracts";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import Navigation_Services = require("VSS/Navigation/Services");
import { INavigationState } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export interface IActivityFeedLastVisitProps extends React.Props<void> {
    threads: DiscussionThread[];
    iterations: GitPullRequestIteration[];
    lastVisit?: Date;
}

export class Component extends React.Component<IActivityFeedLastVisitProps, {}> {
    private _numNewChanges: number;
    private _numNewComments: number;
    private _numNewVotes: number;
    private _numNewUpdates: number;

    private _latestNewUpdate: number;
    private _latestOldUpdate: number;

    constructor(props) {
        super(props);

        this._computeLastVisit();
    }

    public render(): JSX.Element {

        this._computeLastVisit();

        let changesToGo: number = this._numNewComments + this._numNewVotes + this._numNewUpdates + this._numNewChanges;
        if (changesToGo === 0) {
            return null;
        }

        const numChangesStrings: string[] = [];
        
        // the following code constructs a string in the following pattern:
        // "A since your last visit" OR "A and B since your last visit" OR "A, B, and C since your last visit" etc.
        changesToGo = this._addChangeString(numChangesStrings, this._numNewComments, changesToGo, VCResources.PullRequest_Comment_Singular, VCResources.PullRequest_Comment_Plural);
        changesToGo = this._addChangeString(numChangesStrings, this._numNewVotes, changesToGo, VCResources.PullRequest_Vote_Singular, VCResources.PullRequest_Vote_Plural);
        changesToGo = this._addChangeString(numChangesStrings, this._numNewUpdates, changesToGo, VCResources.PullRequest_Push_Singular, VCResources.PullRequest_Push_Plural);

        const otherChangeSingular: string = (!this._numNewComments && !this._numNewVotes && !this._numNewUpdates) ? VCResources.PullRequest_Change_Singular : VCResources.PullRequest_OtherChange_Singular;
        const otherChangePlural: string = (!this._numNewComments && !this._numNewVotes && !this._numNewUpdates) ? VCResources.PullRequest_Change_Plural : VCResources.PullRequest_OtherChange_Plural;
        this._addChangeString(numChangesStrings, this._numNewChanges, changesToGo, otherChangeSingular, otherChangePlural);

        const nounSeparator: string = (numChangesStrings.length <= 2) ? " " : VCResources.PullRequest_NounSeparator;
        const lastVisitMessage: string = Utils_String.format(VCResources.PullRequest_ActivityFeed_SinceYourLast, numChangesStrings.join(nounSeparator), Utils_Date.ago(this.props.lastVisit))

        // if there were new pushes since the last visit, append a link to the files tab at the end of the banner
        // that will compare the current (new) update to the last update this user has seen
        let numUpdatesLinkElement: JSX.Element = null;
        if (this._numNewUpdates > 0) {
            const link: string = Navigation_Services.getHistoryService().getFragmentActionLink("files", {
                path: null,
                discussionId: null,
                iteration: this._latestNewUpdate,
                base: (this._latestOldUpdate)
            });
            numUpdatesLinkElement = <Link className={"new-updates-link"} href={link}>{VCResources.PullRequest_ActivityFeed_ViewUpdates}</Link>;
        }

        return (
            <MessageBar
                className={css("vc-pullrequest-activity-feed-last-visit", "vc-pullrequest-messagebar")}
                messageBarType={MessageBarType.info}
                dismissButtonAriaLabel={VCResources.PullRequest_ActivityFeed_DismissButtonLabel}
                onDismiss={() => this._dismissLastVisitBanner()}>
                {lastVisitMessage}
                {numUpdatesLinkElement}
            </MessageBar>
        );
    }

    public shouldComponentUpdate(nextProps: IActivityFeedLastVisitProps, nextState: {}): boolean {
        if (this.props.lastVisit.getTime() !== nextProps.lastVisit.getTime()) {
            return true;
        }
        return false;
    } 

    private _computeLastVisit(): void {
        this._numNewChanges = 0;
        this._numNewComments = 0;
        this._numNewVotes = 0;
        this._numNewUpdates = 0;

        this._latestNewUpdate = 0;
        this._latestOldUpdate = 0;

        this.props.threads.forEach(thread => {
            if (thread.hasUnseenContent && !thread.isDeleted) {
                if (thread.properties && thread.properties.CodeReviewThreadType && Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, "VoteUpdate") === 0) {
                    this._numNewVotes++;
                }
                else if (thread.properties && thread.properties.CodeReviewThreadType && Utils_String.localeIgnoreCaseComparer(thread.properties.CodeReviewThreadType.$value, "RefUpdate") === 0) {
                    this._numNewUpdates++;
                }
                else if (thread.itemPath || thread.status) {
                    this._numNewComments++;
                }
                else {
                    this._numNewChanges++;
                }
            }
        });

        if (this.props.iterations) {
            this.props.iterations.forEach(iteration => {
                const isNew: boolean = this._isUpdateNew(iteration, this.props.lastVisit);
                this._latestNewUpdate = isNew && this._latestNewUpdate < iteration.id ? iteration.id : this._latestNewUpdate;
                this._latestOldUpdate = !isNew && this._latestOldUpdate < iteration.id ? iteration.id : this._latestOldUpdate;
            });
        }
    }

    private _dismissLastVisitBanner() {
        Flux.instance().actionCreator.navigationActionCreator.dismissLastVisitBanner();
    }

    private _addChangeString(changeStrings: string[], numChanges: number, changesRemaining: number, singularString: string, pluralString: string): number {
        if (!numChanges) {
            return changesRemaining;
        }

        // if there were previous strings added and there are more changes to process, this current
        // string is in the middle of a list so we should use a separator (", ")
        const separator: string = (changesRemaining === numChanges && changeStrings.length > 0) ? VCResources.PullRequest_GrammaticalSeparator : "";
        const template: string = (numChanges > 1) ? pluralString : singularString;
        changeStrings.push(Utils_String.format(separator + template, numChanges));

        return (changesRemaining - numChanges);
    }

    private _isUpdateNew(iteration: GitPullRequestIteration, lastVisit: Date): boolean {
        const authorIsNotCurrentUser: boolean =
            !!iteration.author.id && (TfsContext.getDefault().currentIdentity.id !== iteration.author.id);

        // update is new if the author of the update is not the current user
        // (also the first update is not counted as new)
        return authorIsNotCurrentUser && iteration.id > 1 && !!lastVisit && (lastVisit < iteration.createdDate);
    }
}
