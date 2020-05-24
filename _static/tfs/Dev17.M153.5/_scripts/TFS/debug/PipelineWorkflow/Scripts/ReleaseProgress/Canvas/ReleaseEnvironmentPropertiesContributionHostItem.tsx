import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ContributionComponent } from "DistributedTaskControls/Components/ContributionComponent";

import { EnvironmentStatus } from "ReleaseManagement/Core/Contracts";
import { IReleaseEnvironmentNodeExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import { autobind } from "OfficeFabric/Utilities";

export interface IReleaseEnvironmentPropertiesContributionHostItemProps extends Base.IProps {
    releaseId: number;
    
    releaseEnvironmentId: number;

    environmentStatus: EnvironmentStatus;

    contribution: Contribution;

    setVisibleState: (contributionId: string, isVisible: boolean) => void;

    hideLoading?: boolean;
}

export class ReleaseEnvironmentPropertiesContributionHostItem extends Base.Component<IReleaseEnvironmentPropertiesContributionHostItemProps, Base.IStateless> {

    public constructor(props: IReleaseEnvironmentPropertiesContributionHostItemProps) {
        super(props);
        this._initialOptions = {
            releaseEnvironmentId: this.props.releaseEnvironmentId,
            releaseId: this.props.releaseId,
            initialStatus: this.props.environmentStatus,
            hostEventUpdateId: this.props.instanceId,
            setVisibilityState: this._setVisibleState
        } as IReleaseEnvironmentNodeExtensionContext;
    }

    public render() {

        return(
                <ContributionComponent
                    contribution={this.props.contribution}
                    initialOptions={this._initialOptions}
                    key={this.props.contribution.id}
                    hideLoading={this.props.hideLoading}
                    maxHeight={ReleaseEnvironmentPropertiesContributionHostItem.c_maxHeight} />
        );
    }

    private _setVisibleState = (isVisible: boolean): void => {
        this.props.setVisibleState(this.props.contribution.id, isVisible);
    }

    private _initialOptions: IReleaseEnvironmentNodeExtensionContext;
    private static readonly c_maxHeight: number = 30;    
}