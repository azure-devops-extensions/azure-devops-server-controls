/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { BranchFilterComponent } from "DistributedTaskControls/Components/BranchFilterComponent";
import { TextField } from "OfficeFabric/TextField";
import { CommandButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Utils_String from "VSS/Utils/String";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/BuildBranchFilterComponent";

export interface IBuildBranchFilterComponentProps extends Base.IProps {
    repositoryId: string;
    onBranchFilterChange: (selectedBranch: string) => void;
    branchFilter: string;
    allowUnmatchedSelection: boolean;
    supportVariables: boolean;
    updateOnBlur: boolean;
    disableTags?: boolean;
    onError?: (error: string) => void;
    index?: string;
}

export interface IBuildBranchFilterComponentState extends Base.IState {
    isExpanded: boolean;
    branchFilter: string;
}

export class BuildBranchFilterComponent extends Base.Component<IBuildBranchFilterComponentProps, IBuildBranchFilterComponentState> {

    constructor(props: IBuildBranchFilterComponentProps) {
        super(props);
        this.state = { isExpanded: false, branchFilter: DtcUtils.getRefFriendlyName(this.props.branchFilter) };
    }

    public setFocusOnLoad() {
        if (this._branchFilterComponent) {
            this._branchFilterComponent.setFocusOnLoad();
        }
    }

    public render(): JSX.Element {
        if (this.props.supportVariables && !this.state.isExpanded) {
            let branchFilterCss = "build-artifact-branch-filter-textfield";
            let showBranchIcon: boolean = false;
            if (this.state.branchFilter !== Utils_String.empty) {
                showBranchIcon = true;
                branchFilterCss = css(branchFilterCss + " build-artifact-branch-filter-with-branch");
            }

            return (
                <div
                    className="build-artifact-branch-filter"
                    role="combobox"
                    aria-expanded={this.state.isExpanded}
                    aria-controls={this.state.isExpanded ? "build-artifact-branch-filter" : null}
                    aria-label={Resources.BranchFilterAriaLabel}>
                    <TextField
                        ref={this._resolveRef("_textFieldComponent")}
                        className={branchFilterCss}
                        placeholder={Resources.BranchFilterForBuildPlaceholder}
                        ariaLabel={Resources.BranchFilterAriaLabel}
                        value={this.state.branchFilter}
                        onChanged={(branch: string) => { this._updateBranchFilter(branch); }}
                        onBlur={() => { this._updateParentBranchFilter(this.state.branchFilter); }} />
                    <CommandButton
                        className={css("build-artifact-branch-filter-chevron")}
                        ariaLabel={Resources.ShowBranchesAriaLabel}
                        onClick={() => this._onChevronClick()}>
                        <i className="bowtie-icon bowtie-chevron-down-light" />
                    </CommandButton>
                    {showBranchIcon && <i className="build-artifact-branch-filter-icon bowtie-icon bowtie-tfvc-branch" />}
                </div>);
        }

        return (
            <BranchFilterComponent
                ref={this._resolveRef("_branchFilterComponent")}
                key={this.props.branchFilter + this.props.index}
                repositoryId={this.props.repositoryId}
                branchFilter={this.props.branchFilter ? DtcUtils.getFullRefNameFromBranch(this.props.branchFilter) : Utils_String.empty}
                onBranchFilterChange={(branch: string) => { this._updateParentBranchFilter(DtcUtils.getRefFriendlyName(branch)); }}
                allowUnmatchedSelection={this.props.allowUnmatchedSelection}
                onError={this.props.onError}
                disableTags={this.props.disableTags}
                onClose={this.props.supportVariables ? () => this._onClose() : null}
                isOpened={this.props.supportVariables ? true : false} />);
    }

    private _onClose(): void {
        this.setState({ isExpanded: false });

        if (this._textFieldComponent) {
            this._textFieldComponent.focus();
        }
    }

    private _onChevronClick(): void {
        this.setState({ isExpanded: true });
    }

    private _updateBranchFilter(value: string): void {
        if (!this.props.updateOnBlur) {
            this.props.onBranchFilterChange(value);
        }

        this.setState({ branchFilter: value });
    }

    private _updateParentBranchFilter(value: string): void {
        let refFriendlyBranchName = DtcUtils.getRefFriendlyName(value);
        this.props.onBranchFilterChange(refFriendlyBranchName);
        this.setState({ branchFilter: refFriendlyBranchName });
    }

    private _branchFilterComponent: BranchFilterComponent;
    private _textFieldComponent: HTMLElement;
}    