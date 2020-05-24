/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { BRANCH_FILTER_PREFIX } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";
import { LoadableComponentActionsCreator } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsCreator";

import * as VCGitSelectorExt from "TFS/VersionControl/Controls";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!PivotView";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/BranchFilterComponent";

export interface IProps extends Base.IProps {
    repositoryId: string;
    onBranchFilterChange: (selectedBranch: string) => void;
    branchFilter: string;
    allowUnmatchedSelection: boolean;
    disableTags?: boolean;
    ariaLabelledBy?: string;
    onError?: (error: string) => void;
    isOpened?: boolean;
    onClose?: () => void;
    disabled?: boolean;
}

export class BranchFilterComponent extends Base.Component<IProps, Base.IState> {

    public constructor(props: IProps) {
        super(props);
        this._instanceId = props.instanceId || this._getUniqueInstanceId();
    }

    public render(): JSX.Element {
        if (!this.props.disabled) {
            return (
                <div className="git-branch-selector" ref={(element) => { this._onRef($(element)); }}>
                    <LoadableComponent
                        instanceId={this._instanceId}
                        ariaLabel={Resources.Loading} />
                </div>
            );
        }
        else {
            return (
                <StringInputComponent
                    value={this.props.branchFilter}
                    disabled={true}
                />
            );
        }
    }

    public componentWillReceiveProps(props: IProps): void {
        if (this._gitVersionMenu && props && props.repositoryId) {
            this._updateVersionSelector(props.repositoryId, props.branchFilter);
        }
    }

    public componentWillUnmount() {
        this._gitVersionMenu = undefined;
    }

    public setFocusOnLoad() {
        this._shouldSetFocus = true;
    }

    private _onRef(element: JQuery): void {
        if (element) {
            this._element = element;
            this._createGitRepositoryMenu(element);
        }
    }

    private _createGitRepositoryMenu(container: JQuery): void {
        let disableTags: boolean = this.props.disableTags;
        if (this.props.disableTags === undefined || this.props.disableTags === null) {
            disableTags = true;
        }

        if (!this._gitVersionMenu) {
            if (!this._isLoading) {
                this._isLoading = true;
                VCGitSelectorExt.GitVersionSelector.create($(container), {
                    onItemChanged: (selectedItem: VCGitSelectorExt.IGitVersionSelectorItem) => this._onItemChanged(selectedItem),
                    waitOnFetchedItems: true,
                    disableTags: disableTags,
                    ariaLabelledBy: this.props.ariaLabelledBy,
                    showVersionActions: false,
                    allowUnmatchedSelection: this.props.allowUnmatchedSelection
                })
                    .then((gitVersionSelector) => {
                        this._hideLoading();
                        this._gitVersionMenu = gitVersionSelector;
                        this._updateVersionSelector(this.props.repositoryId, this.props.branchFilter);

                        if (this.props.isOpened) {
                            this._gitVersionMenu._showPopup();
                        }

                        if (this.props.onClose) {
                            // in some cases, when the UI is not on standard resolution, we are having a popup-closed event as soon as the component is loaded.
                            // adding delay so that we do not end up calling this.props.onClose for such events.
                            let thisRef = this;
                            setTimeout(function () {
                                thisRef._element.bind("popup-closed", thisRef.props.onClose);
                            }, 500);
                        }
                    });
            }
        }
    }

    private _updateVersionSelector(repo: string, branch: string): void {
        if (this._gitVersionMenu) {
            if (this._shouldSetFocus && this._element) {
                this._element.find(":focusable").first().focus();
                this._shouldSetFocus = false;
            }
            this._gitVersionMenu.setRepositoryId(repo).then((gitRepo) => {
                //This is done to avoid the error we hit when we send an empty branch name
                if (this._gitVersionMenu) {
                    this._gitVersionMenu.setSelectedVersion(branch
                        ? { branchName: DtcUtils.getRefFriendlyName(branch) }
                        : null);
                }
            }, (reason) => {
                if (reason && reason.message && this.props.onError) {
                    this.props.onError(reason.message);
                }
            });
        }
    }

    private _onItemChanged = (selectedItem: VCGitSelectorExt.IGitVersionSelectorItem): void => {
        if (selectedItem) {
            let fullRefName = Utils_String.empty;
            if (selectedItem.branchName) {
                fullRefName = DtcUtils.getFullRefNameFromBranch(selectedItem.branchName);
            }
            else if (selectedItem.tagName) {
                fullRefName = DtcUtils.getFullRefNameFromTag(selectedItem.tagName);
            }

            this.props.onBranchFilterChange(fullRefName);
            this._updateVersionSelector(this.props.repositoryId, fullRefName);
        }
    }

    private _hideLoading(): void {
        let loadableComponentActionsCreator = ActionCreatorManager.GetActionCreator<LoadableComponentActionsCreator>(LoadableComponentActionsCreator, this._instanceId);
        loadableComponentActionsCreator.hideLoadingExperience();
    }

    private _getUniqueInstanceId(): string {
        return BRANCH_FILTER_PREFIX + DtcUtils.getUniqueInstanceId();
    }

    private _gitVersionMenu: VCGitSelectorExt.IGitVersionSelector;
    private _isLoading: boolean = false;
    private _element: JQuery = null;
    private _shouldSetFocus: boolean = false;
    private _instanceId: string;
}
