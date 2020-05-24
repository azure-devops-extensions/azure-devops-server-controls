import * as React from "react";
import { BaseControl } from "VSS/Controls";

import { autobind, css } from "OfficeFabric/Utilities";
import { GitVersionSelectorMenu, GitVersionSelectorMenuOptions } from "VersionControl/Scripts/Controls/GitVersionSelectorMenu";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface GitVersionSelectorProps {
    repositoryContext: GitRepositoryContext;
    customerIntelligenceData?: CustomerIntelligenceData;
    versionSpec: VersionSpec;
    allowEditing: boolean;
    isOpened?: boolean;
    onOpened?(): void;
    onClosed?(): void;
    onBranchChanged(versionSpec: VersionSpec): void;
    className?: string;
    disableMyBranches?: boolean;
    disableTags?: boolean;
    showCommits?: boolean;
    ariaLabel?: string;
    /** Element ID to prepend to the IDs of the current item icon and text to give a full, descriptive aria-labelledby for the selector button */
    ariaLabelledBy?: string
    fullPopupWidth?: boolean;
    focusOnLoad?: boolean;
    placeholder?: string;
    allowUnmatchedSelection?: boolean;
}

/**
 * Wrapper component for the Branch Selector.
 */
export class GitVersionSelector extends React.Component<GitVersionSelectorProps, {}> {
    private _innerControl: GitVersionSelectorMenu;
    private _divWrapper: HTMLElement = null;

    public componentDidMount(): void {
        this._innerControl = this.createControl();
        this.componentDidUpdate(this.props);
    }

    public componentWillUnmount(): void {
        if (this._innerControl) {
            this._innerControl.dispose();
            this._innerControl = null;
        }
    }

    public shouldComponentUpdate(newProps: GitVersionSelectorProps): boolean {
        // HACK Weird interaction with FilteredListDropdownMenu that first triggers Hide and then SelectedItem.
        // This causes a refresh cycle in React with half the payload (new isOpened but old branch).
        // So we don't update when closed, this always comes from the innerControl, so the state is correct inside
        // while the versionSpec coming from outside is wrong because has not been updated yet.
        return !this.props.isOpened || newProps.isOpened;
    }

    public componentDidUpdate(prevProps: GitVersionSelectorProps): void {
        if (prevProps.repositoryContext !== this.props.repositoryContext) {
            this._innerControl.setRepository(this.props.repositoryContext);
        }

        if (this._innerControl.getSelectedVersion() !== this.props.versionSpec) {
            this._innerControl.setSelectedVersion(this.props.versionSpec);
        }

        // if the state of the dropdown is being managed by props (isOpened), innerControl will be updated appropriately
        // otherwise, let innerControl manage its own display state
        if (this.props.isOpened !== undefined){
            if (this.props.isOpened) {
                if (!this.isControlDroppedDown()) {
                    this._innerControl._showPopup();
                }
            } else if (this._innerControl.getFilteredList()) {
                if (this.isControlDroppedDown()) {
                    this._innerControl._hidePopup();
                }
            }
        }
    }

    public render(): JSX.Element {
        return <div className={css(this.props.className, "vc-git-version-selector")} ref={this.getRef} />;
    }

    private getRef = (container) => this._divWrapper = container;

    private createControl(): GitVersionSelectorMenu {
        const gitVersionMenu = BaseControl.createIn(
            GitVersionSelectorMenu,
            this._divWrapper,
            {
                onItemChanged: this.onBranchChanged,
                showVersionActions: this.props.allowEditing,
                waitOnFetchedItems: true,
                customerIntelligenceData: this.props.customerIntelligenceData,
                disableTags: this.props.disableTags,
                disableMyBranches: this.props.disableMyBranches,
                showCommits: this.props.showCommits,
                ariaLabelledBy: this.props.ariaLabelledBy,
                placeholder: this.props.placeholder,
                allowUnmatchedSelection: this.props.allowUnmatchedSelection,
            } as GitVersionSelectorMenuOptions) as GitVersionSelectorMenu;

        gitVersionMenu.setRepository(this.props.repositoryContext);

        if (this.props.ariaLabel) {
            gitVersionMenu._element.attr("aria-label", this.props.ariaLabel);
        }

        gitVersionMenu._getPopupEnhancement()._element.bind("popup-opened", this.props.onOpened);
        gitVersionMenu._getPopupEnhancement()._element.bind("popup-closed", this.props.onClosed);

        if (this.props.fullPopupWidth) {
            gitVersionMenu._getPopupEnhancement()._bind("popup-opened", this._setVersionMenuPopupWidth);
        }

        if (this.props.focusOnLoad) {
            gitVersionMenu.focus();
        }

        return gitVersionMenu;
    }

    @autobind
    private onBranchChanged(selectedVersion: VersionSpec): void {
        if (selectedVersion && this.props.onBranchChanged) {
            this.props.onBranchChanged(selectedVersion);
        }
    }

    private isControlDroppedDown(): boolean {
        return this._innerControl._getPopupEnhancement()._element.is(":visible");
    }

    @autobind
    private _setVersionMenuPopupWidth() {
        const $popUp = this._innerControl._getPopupEnhancement();
        if ($popUp && $popUp.getElement()) {
            $popUp.getElement().width(this._innerControl.getElement().outerWidth() - 2);   // -2px to account for borders.
        }
    }
}
