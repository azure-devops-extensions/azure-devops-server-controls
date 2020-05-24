import * as React from "react";
import { ActionButton, IButton } from "OfficeFabric/Button";
import { autobind } from "OfficeFabric/Utilities";

import * as VSS from "VSS/VSS";

import * as ClonePopup_NO_REQUIRE from "VersionControl/Scripts/Controls/ClonePopup";
import * as VCForkRepositoryDialog_NO_REQUIRE from "VersionControl/Scenarios/ForkRepository/ForkRepositoryDialog";
import * as VCCodeHubCloneRepositoryAction_NO_REQUIRE from "VersionControl/Scripts/CodeHubCloneRepositoryAction";

import * as RepositoryOverviewContracts from "RepositoryOverview/Scripts/Generated/Contracts";
import * as RepositoryOverviewResources from "RepositoryOverview/Scripts/Resources/TFS.Resources.RepositoryOverview";
import { RepositoryLikes, RepositoryLikesProps } from "RepositoryOverview/Scripts/Components/RepositoryLikes";
import { TelemetrySpy } from "RepositoryOverview/Scripts/TelemetrySpy";
import { IsTfvcRepository } from "RepositoryOverview/Scripts/Utils";

import "VSS/LoaderPlugins/Css!RepositoryOverview/Scripts/Components/RepositoryActionMenu";

export interface RepositoryActionMenuProps {
    repositoryData: RepositoryOverviewContracts.RepositoryOverviewData;
}

export const RepositoryActionMenu: React.StatelessComponent<RepositoryActionMenuProps> = (props: RepositoryActionMenuProps): JSX.Element => {
    const isTfvcRepo: boolean = IsTfvcRepository(props.repositoryData);

    return (
        <div>
            <RepositoryLikes
                repositoryId={props.repositoryData.id}
                projectId={props.repositoryData.projectInfo.id}
                isOrganizationActivated={props.repositoryData.projectInfo.isOrganizationActivated}
                isTfvcRepo={isTfvcRepo}
                className="ro-action-item ro-ai"/>
            {!isTfvcRepo && props.repositoryData.isForkAllowed && <ForkButton repositoryId={props.repositoryData.id}/>}
            {!isTfvcRepo && <CloneButton />}
        </div>
    );
}

class ForkButton extends React.Component<{repositoryId: string}, {}> {
    private _forkDialogOpening: boolean = false;

    public render(): JSX.Element {
        return (
            <ActionButton
                className="ro-action-item ro-ai"
                iconProps={{ iconName: "BranchFork2" }}
                onClick={this._openForkRepositoryDialog}>
                {RepositoryOverviewResources.ForkButtonText}
            </ActionButton>
        );
    }

    @autobind
    private _openForkRepositoryDialog(): void {
        if (!this._forkDialogOpening) {
            this._forkDialogOpening = true;
            VSS.using(["VersionControl/Scenarios/ForkRepository/ForkRepositoryDialog"], (ForkRepositoryDialog: typeof VCForkRepositoryDialog_NO_REQUIRE) => {
                ForkRepositoryDialog.ForkRepositoryDialog.show();
                this._forkDialogOpening = false;
            });
            TelemetrySpy.publishForkClicked(this.props.repositoryId);
        }
    }
}

class CloneButton extends React.Component<{}, {}> {
    private _buttonRef: IButton;
    private _clonePopup: ClonePopup_NO_REQUIRE.ClonePopup;

    public componentWillUnmount(): void {
        if (this._clonePopup && !this._clonePopup.isDisposed()) {
            this._clonePopup._dispose();
        }

        if (this._buttonRef != null) {
            this._buttonRef = null;
        }
    }

    public render(): JSX.Element {
        return (
            <ActionButton
                componentRef={(ref) => this._buttonRef = ref}
                className="ro-clone-action ro-action-item ro-ai"
                iconProps={{ iconName: "CloneToDesktop" }}
                onClick={this._openCloneRepositoryDialog}>
                {RepositoryOverviewResources.CloneButtonText}
            </ActionButton>
        );
    }

    @autobind
    private _openCloneRepositoryDialog(): void {
        VSS.using(
            ["VersionControl/Scripts/CodeHubCloneRepositoryAction"],
            (CodeHubCloneRepositoryAction: typeof VCCodeHubCloneRepositoryAction_NO_REQUIRE) => {
                const menuItemSelector = ".ro-clone-action";
                if (!this._clonePopup || this._clonePopup.isDisposed()) {
                    this._clonePopup = CodeHubCloneRepositoryAction.createCloneRepositoryPopup(
                        $(menuItemSelector),
                        {
                            baseAlign: "left-bottom",
                            elementAlign: "left-top",
                            openedFromL2Header: false,
                        },
                        this._onPopupClose,
                        true);
                }
            }
        );
    }

    @autobind
    private _onPopupClose(): void {
        if (this._buttonRef != null) {
            this._buttonRef.focus();
        }
    }
}