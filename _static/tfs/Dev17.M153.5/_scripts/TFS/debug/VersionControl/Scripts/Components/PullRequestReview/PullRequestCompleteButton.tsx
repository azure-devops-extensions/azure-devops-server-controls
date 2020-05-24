import { DefaultButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "OfficeFabric/Tooltip";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { BaseComponent, IBaseProps, KeyCodes } from "OfficeFabric/Utilities";
import * as React from "react";
import { getMenuIcon } from "VersionControl/Scenarios/Shared/DropdownButton";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestCompleteButton";

export interface IPullRequestActions {
    completePullRequest(): void;
    setAutoComplete(): void;
    cancelAutoComplete(): void;
    publish(): void;
    unpublish(): void;
    abandonPullRequest(): void;
}

export interface IPullRequestCompleteButtonProps extends IBaseProps {
    completionDisabledReason?: string;      // if set, the button will be disabled
    canAutoComplete: boolean;               // is autocomplete an option?
    isAutoCompleteSet: boolean;             // is autocomplete set?
    isDraft: boolean;                       // is PR draft flag set?
    hasRejectedPolicies: boolean;           // were there any rejected policies?
    isCTA: boolean;                         // is this the call to action?
    pullRequestActions: IPullRequestActions; // set of actions we can take on a PR
    hasPermissionToAbandonReactivate: boolean;
    hasPermissionToCancelAutoComplete: boolean;
    hasPermissionToComplete: boolean;
    hasPermissionToPublishUnpublish: boolean;
    draftFeatureIsEnabled: boolean;
}

const abandonItemKey = "abandon-item";

export class PullRequestCompleteButton extends BaseComponent<IPullRequestCompleteButtonProps, {}> {
    public render() {
        const primaryAction: IContextualMenuItem = this._primaryAction();
        if (!primaryAction) {
            return null;
        }

        const menuItems = this._getMenuItems();
        const controlDisabled = menuItems.every(item => item.disabled) && primaryAction.disabled;

        const isSplit = menuItems.length > 1;
        const menuProps = isSplit && {
            items: menuItems,
            directionalHint: DirectionalHint.bottomRightEdge,
        };

        const isPrimary = this.props.isCTA
            && !primaryAction.disabled
            && primaryAction.key !== abandonItemKey;

        const button = 
            <DefaultButton
                id={"pull-request-complete-button"}
                className={"pull-request-complete-split-button"}
                primary={isPrimary}
                split={isSplit}
                menuTriggerKeyCode={KeyCodes.down}
                menuProps={menuProps}
                splitButtonAriaLabel={VCResources.PullRequest_PullRequestCompletionActions}
                onClick={primaryAction.onClick as () => void}
                iconProps={primaryAction.iconProps}
                primaryDisabled={primaryAction.disabled}
                disabled={controlDisabled} >
                {primaryAction.name}
            </DefaultButton>

        return (
            this.props.completionDisabledReason
                ? <TooltipHost
                    content={this.props.completionDisabledReason}>
                    {button}
                </TooltipHost>
                :  button
        );
    }

    private _getMenuItems(): IContextualMenuItem[] {
        const items = [];

        if (!this.props.isDraft) {
            if (this.props.hasPermissionToComplete) {
                items.push(this._completeAction());
            }

            // only add autocomplete if it is available
            if (this.props.canAutoComplete) {
                if (this.props.isAutoCompleteSet) {
                    if (this.props.hasPermissionToCancelAutoComplete) {
                        items.push(this._cancelAutocompleteAction());
                    }
                } else if (this.props.hasPermissionToComplete) {
                    items.push(this._autocompleteAction());
                }
            }
        }

        if (this.props.hasPermissionToPublishUnpublish) {
            if (this.props.isDraft) {
                // We always show "publish" action, even if Draft FF is turned off. This way if there are existing
                // draft PR's and the FF gets disabled, the PR's won't have to be abandoned.
                items.push(this._publishAction());
            }
            else if (this.props.draftFeatureIsEnabled) {
                // Only show "Mark as draft" if Draft FF is turned on
                items.push(this._unpublishAction());
            }
        }

        if (this.props.hasPermissionToAbandonReactivate) {
            items.push(this._abandonAction());
        }

        return items;
    }

    private _primaryAction(): IContextualMenuItem {
        if (this.props.isDraft) {
            // If PR is draft, primary action should be to publish
            return this._publishAction();
        }

        // if autocomplete is enabled primary action should be to cancel it
        if (this.props.isAutoCompleteSet) {
            // when no permissions to cancel autocomplete user cannot abandon the PR
            // autocomplete needs to be canceled before abandoning
            return this.props.hasPermissionToCancelAutoComplete
                ? this._cancelAutocompleteAction()
                : null;
        }

        // if we haven't set autocomplete and we can't actually complete the PR
        // primary action should be to set autocomplete
        if (this.props.hasRejectedPolicies && this.props.canAutoComplete) {
            return this.props.hasPermissionToComplete
                ? this._autocompleteAction()
                : (this.props.hasPermissionToAbandonReactivate && this._abandonAction());
        }

        // default to complete if you have permissions
        return this.props.hasPermissionToComplete
            ? this._completeAction()
            : (this.props.hasPermissionToAbandonReactivate && this._abandonAction());
    }

    private _completeAction(): IContextualMenuItem {
        return {
            key: "complete-now-item",
            name: VCResources.PullRequest_Complete,
            iconProps: getMenuIcon("bowtie-tfvc-merge"),
            onClick: this.props.pullRequestActions.completePullRequest,
            disabled: !!this.props.completionDisabledReason,
        } as IContextualMenuItem;
    }

    private _autocompleteAction(): IContextualMenuItem {
        return {
            key: "set-autocomplete-item",
            name: VCResources.AutoComplete,
            iconProps: getMenuIcon("bowtie-trigger-auto"),
            onClick: this.props.pullRequestActions.setAutoComplete,
            disabled: !!this.props.completionDisabledReason,
        } as IContextualMenuItem;
    }

    private _cancelAutocompleteAction(): IContextualMenuItem {
        return {
            key: "cancel-autocomplete-item",
            name: VCResources.CancelAutoComplete,
            iconProps: getMenuIcon("bowtie-trigger-user"),
            onClick: this.props.pullRequestActions.cancelAutoComplete,
        } as IContextualMenuItem;
    }

    private _publishAction(): IContextualMenuItem {
        return {
            key: "publish-item",
            name: VCResources.PullRequest_ClearIsDraft,
            iconProps: { iconName: "Send" },
            onClick: this.props.pullRequestActions.publish,
            disabled: !this.props.hasPermissionToPublishUnpublish,
        } as IContextualMenuItem;
    }

    private _unpublishAction(): IContextualMenuItem {
        return {
            key: "unpublish-item",
            name: VCResources.PullRequest_SetIsDraft,
            iconProps: { iconName: "EditNote" },
            onClick: this.props.pullRequestActions.unpublish,
            disabled: !this.props.hasPermissionToPublishUnpublish,
        } as IContextualMenuItem;
    }

    private _abandonAction(): IContextualMenuItem {
        return {
            key: abandonItemKey,
            name: VCResources.PullRequest_AbandonPullRequest,
            iconProps: getMenuIcon("bowtie-trash"),
            onClick: this.props.pullRequestActions.abandonPullRequest,
        } as IContextualMenuItem;
    }
}
