import React = require("react");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import FollowsUtils = require("WorkItemTracking/Scripts/Utils/FollowsUtils");
import { HeaderButtonComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/HeaderButtonComponent";

import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IFollowsButtonState {
    isFollowing: boolean;
    isDisabled: boolean;
}

export class FollowsButtonComponent extends HeaderButtonComponent<{}, IFollowsButtonState> {
    private _followsChangedDelegate: Function;
    private _followsChangingDelegate: Function;

    constructor(props: {}, context?: any) {
        super(props, context);
        this._followsChangedDelegate = (e, args) => this._handleFollowsChanged(e, args);
        this._followsChangingDelegate = (e, args) => this._handleFollowsChanging(e, args);
        this.state = this._getDisabledState(false);
    }

    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        this._updateFollowState();

        FollowsUtils.attachFollowsChanged(this._followsChangedDelegate);
        FollowsUtils.attachFollowsChanging(this._followsChangingDelegate);
    }

    protected _unbind() {
        FollowsUtils.detachFollowsChanged(this._followsChangedDelegate);
        FollowsUtils.detachFollowsChanging(this._followsChangingDelegate);
    }

    protected _onClick() {
        this._setFollowState(!this.state.isFollowing);
    }

    protected _getClasses(): string {
        let classes = "follows-button bowtie-icon ";
        classes += this.state && this.state.isFollowing
            ? "bowtie-watch-eye-fill"
            : "bowtie-watch-eye";
        return classes;
    }

    protected _getAriaLabel(): string {
        return this.state.isFollowing ? WorkItemTrackingResources.UnfollowWorkItem : WorkItemTrackingResources.FollowWorkItem
    }

    protected _isDisabled(): boolean {
        return this.state.isDisabled;
    }

    private _updateFollowState() {
        let workItem = this._formContext.workItem;

        FollowsUtils.getFollowsState(workItem).then(
            (subscription) => {
                if (workItem !== this._formContext.workItem) {
                    return;
                }

                this._enableFollowsButton(subscription != null);
            },
            () => {
                if (workItem !== this._formContext.workItem) {
                    return;
                }

                this._disableFollowsButton(this.state.isFollowing === true);
            });
    }

    private _handleFollowsChanged(e, args) {
        if (this._formContext.workItem.id === parseInt(args.artifact.artifactId) && this.state.isFollowing !== args.isFollowing) {
            this._enableFollowsButton(args.isFollowing);
        }
    }

    private _handleFollowsChanging(e, args) {
        if (this._formContext.workItem.id === parseInt(args.artifact.artifactId) && this.state.isFollowing !== args.isFollowing) {
            this._disableFollowsButton(this.state.isFollowing);
        }
    }

    private _setFollowState(follow: boolean) {
        const workItem = this._formContext.workItem;

        FollowsUtils.setFollowState(workItem, follow, "WorkItem.Form").then(
            (subscription) => {
                if (workItem !== this._formContext.workItem) {
                    return;
                }

                this._enableFollowsButton(follow);
            },
            () => {
                if (workItem !== this._formContext.workItem) {
                    return;
                }

                // Errors can occur because an item is already followed (state changed in another view of the work item)
                // In this case, clear out our cache and retrieve the follow state again.
                this._disableFollowsButton(this.state.isFollowing);
                this._updateFollowState();
            });
    }

    private _disableFollowsButton(isFollowing: boolean) {
        this.setState(this._getDisabledState(isFollowing));
    }

    private _enableFollowsButton(isFollowing: boolean) {
        this.setState(this._getEnabledState(isFollowing));
    }

    private _getDisabledState(isFollowing: boolean): IFollowsButtonState {
        return {
            isFollowing: isFollowing,
            isDisabled: true
        };
    }

    private _getEnabledState(isFollowing: boolean): IFollowsButtonState {
        return {
            isFollowing: isFollowing,
            isDisabled: false
        };
    }
}