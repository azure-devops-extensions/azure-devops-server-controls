/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import "VSS/LoaderPlugins/Css!VersionControl/VCAdmin";
import { CaseEnforcementContainer } from "VersionControl/Scenarios/VCAdmin/Components/CaseEnforcementContainer";
import { PathLengthPolicyContainer } from "VersionControl/Scenarios/VCAdmin/Components/PathLengthPolicyContainer";
import { ReservedNamesPolicyContainer } from "VersionControl/Scenarios/VCAdmin/Components/ReservedNamesPolicyContainer";
import { VCAdminStoresHub } from "VersionControl/Scenarios/VCAdmin/Stores/VCAdminStoresHub"
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator"
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Link } from "OfficeFabric/Link";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export interface OSCompatContainerProps {
    actionCreator: VCAdminActionCreator;
    storesHub: VCAdminStoresHub;
    repoContext: GitRepositoryContext;
    canEditPolicies: boolean;
}

export class OSCompatContainer extends React.Component<OSCompatContainerProps> {
    constructor(props: OSCompatContainerProps) {
        super(props);
    }

    public render(): JSX.Element {
        const isOSCompatEnabled: boolean =
            FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.GitOSCompat, false);

        if (isOSCompatEnabled) {
            return (
                <div className={VCTypes.Css.OptionGroup}>
                    <h3 className={VCTypes.Css.OptionHeader}>{VCResources.GitOSCompatTitle}</h3>
                    <div>
                        <span className={VCTypes.Css.Subheader}>{VCResources.GitOSCompatDescription}</span>&nbsp;
                        <Link className={VCTypes.Css.Link} href="https://aka.ms/git-platform-compat" target="_blank">{VCResources.LearnMore}.</Link>
                    </div>
                    <CaseEnforcementContainer
                        actionCreator={this.props.actionCreator}
                        store={this.props.storesHub.caseEnforcementStore}
                        repoContext={this.props.repoContext}
                        canEditPolicies={this.props.canEditPolicies}
                        showTitle={!isOSCompatEnabled}
                    />
                    <ReservedNamesPolicyContainer
                        actionCreator={this.props.actionCreator}
                        store={this.props.storesHub.reservedNamesStore}
                        repoContext={this.props.repoContext}
                        canEditPolicies={this.props.canEditPolicies}
                    />
                    <PathLengthPolicyContainer
                        actionCreator={this.props.actionCreator}
                        store={this.props.storesHub.pathLengthStore}
                        repoContext={this.props.repoContext}
                        canEditPolicies={this.props.canEditPolicies}
                    />
                </div>
            );
        }
        else {
            return (
                <div className={VCTypes.Css.OptionGroup}>
                    <CaseEnforcementContainer
                        actionCreator={this.props.actionCreator}
                        store={this.props.storesHub.caseEnforcementStore}
                        repoContext={this.props.repoContext}
                        canEditPolicies={this.props.canEditPolicies}
                        showTitle={!isOSCompatEnabled}
                    />
                </div>
            );
        }
    }
}
