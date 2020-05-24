import * as React from "react";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as _VCVersionDropdown from "VC/Common/Components/VersionDropdown";
import { EnsurePageContext } from "VersionControl/Scenarios/Shared/EnsurePageContext";
import { GitVersionSelector } from "VersionControl/Scenarios/Shared/GitVersionSelector";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface GitRefDropdownSwitchProps {
    /**
     * Class name for the root DOM element.
     */
    className?: string;

    /**
     * The ID of the DOM element that labels this dropdown.
     */
    ariaLabelledBy?: string;

    /**
     * Text to display in the component when no selection.
     */
    placeholderText?: string;

    /**
     * The repository with the refs to display.
     */
    repositoryContext: GitRepositoryContext;

    /**
     * True by default. Includes the "Mine" section with user branches (user created, favorites...)
     */
    viewMyBranches?: boolean;

    /**
     * True by default. Shows the "Tags" pivot so the user can view and select Git tags.
     */
    viewTagsPivot?: boolean;

    /**
     * Shows the "Commits" pivot to search and select commits by ID.
     */
    viewCommitsPivot?: boolean;

    /**
     * Sets the initial focus to this component on mount.
     */
    autoFocus?: boolean;

    /**
     * Selected ref (branch, tag, commit).
     */
    versionSpec: VersionSpec;

    /**
     * Notifies a change on the selected ref (branch, tag, commit).
     */
    onSelectionChanged(versionSpec: VersionSpec): void;

    /**
     * If provided, replaces the internal open/close state of the dropdown.
     * Replaces the controlled mode of the component, useful to forcibly open the dropdown.
     */
    isOpen?: boolean;

    /**
     * If true, dropdown width matches the component width.
     * False by default, so dropdown would use a fixed width.
     */
    isDrodownFullWidth?: boolean;

    /**
     * Notifies that the dropdown has been open/closed.
     */
    onToggleDropdown?(isOpen: boolean): void;

    /**
     * Notifies that the Create branch action has been clicked.
     */
    onCreateBranchClick?(): void;
}

/**
 * A wrapper that renders the new refs picker or the legacy GitVersionSelector depending
 * on a FF and on whether the page has initialized support for LWP (EnsurePageContext).
 */
export class GitRefDropdownSwitch extends React.PureComponent<GitRefDropdownSwitchProps> {
    public static defaultProps = {
        viewMyBranches: true,
        viewTagsPivot: true,
        viewCommitsPivot: false,
    } as GitRefDropdownSwitchProps;

    public render() {
        const useNewVersionDropdown = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlNewVersionDropdown, false);

        const {
            className,
            repositoryContext,
            viewMyBranches,
            viewTagsPivot,
            viewCommitsPivot,
            isOpen,
            ariaLabelledBy,
            autoFocus,
            placeholderText,
            isDrodownFullWidth,
            versionSpec,
            onCreateBranchClick,
            onSelectionChanged,
            onToggleDropdown,
        } = this.props;

        return <EnsurePageContext
            forceFallback={!useNewVersionDropdown}
            onFallback={() =>
                <GitVersionSelector
                    className={className}
                    repositoryContext={repositoryContext}
                    versionSpec={versionSpec}
                    allowEditing={Boolean(onCreateBranchClick)}
                    isOpened={isOpen}
                    fullPopupWidth={isDrodownFullWidth}
                    focusOnLoad={autoFocus}
                    disableMyBranches={!viewMyBranches}
                    disableTags={!viewTagsPivot}
                    showCommits={viewCommitsPivot}
                    onOpened={onToggleDropdown && (() => onToggleDropdown(true))}
                    onClosed={onToggleDropdown && (() => onToggleDropdown(false))}
                    onBranchChanged={onSelectionChanged}
                />}
        >
            <VersionDropdownAsync
                className={className}
                isOpen={isOpen}
                ariaLabelledBy={ariaLabelledBy}
                autoFocus={autoFocus}
                placeholderText={placeholderText}
                isDrodownFullWidth={isDrodownFullWidth}
                onToggleDropdown={onToggleDropdown}
                providerOptions={{
                    repository: repositoryContext.getRepository(),
                    currentIdentityId: repositoryContext.getTfsContext().currentIdentity.id,
                    selectedVersionString: versionSpec && versionSpec.toVersionString(),
                    viewMyBranches,
                    viewTagsPivot,
                    viewCommitsPivot,
                    onVersionSelected: this.onVersionSelected,
                    onCreateBranchClick,
                }}
            />
        </EnsurePageContext>;
    }

    private onVersionSelected = (versionString: string): void => {
        if (this.props.onSelectionChanged) {
            this.props.onSelectionChanged(VersionSpec.parse(versionString));
        }
    }
}

const VersionDropdownAsync = getAsyncLoadedComponent(
    ["VC/Common/Components/VersionDropdown"],
    (vcVersionDropdown: typeof _VCVersionDropdown) => vcVersionDropdown.VersionDropdown);
