import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getScenarioManager } from "VSS/Performance";
import * as User_Services from "VSS/User/Services";
import * as Utils_String from "VSS/Utils/String";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionsCreatorHub } from "VersionControl/Scenarios/NewGettingStarted/ActionsCreatorHub";
import { GitCredentialsActionsCreator } from "VersionControl/Scenarios/NewGettingStarted/ActionsCreators/GitCredentialsActionsCreator";
import { ActionsHub } from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";
import { GettingStartedComponent } from "VersionControl/Scenarios/NewGettingStarted/Components/GettingStartedComponent";
import { GitCredentialsSource } from "VersionControl/Scenarios/NewGettingStarted/Sources/GitCredentialsSource";
import { IdeSource } from "VersionControl/Scenarios/NewGettingStarted/Sources/IdeSource";
import { StoresHub } from "VersionControl/Scenarios/NewGettingStarted/Stores/StoresHub";
import { TelemetryClient } from "VersionControl/Scenarios/NewGettingStarted/TelemetryClient";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface GettingStartedViewProps  {
    repositoryContext: RepositoryContext;
    tfsContext: TfsContext;
    sshEnabled: boolean;
    sshUrl: string;
    cloneUrl: string;
    isCloneExperience?: boolean;
    showOnlyCommandLine?: boolean;
    branchName?: string;
    isEmptyProject?: boolean;
    heading?: string;
    headingLevel: number;
    onEscape?(): void;
    hasBuildPermission?: boolean;
    buildUrl?: string;
    recordPageLoadScenario?: boolean;
}

/**
 * Renders the getting started view in the provided element.
 */
export function createGettingStartedViewIn(element: HTMLElement, props: GettingStartedViewProps): void {
    ReactDOM.render(
        <Fabric>
            <GettingStartedView {...props} />
        </Fabric>,
        element);
}

/**
 * Component that wraps the Flux artifacts for getting started
 */
export class GettingStartedView extends React.Component<GettingStartedViewProps, {}>  {
    private _actionsCreatorHub: ActionsCreatorHub;
    private _storesHub: StoresHub;

    constructor(props, context) {
        super(props, context);

        getScenarioManager().split("EmptyRepoPage.Start");
        const actionsHub: ActionsHub = new ActionsHub();
        this._storesHub = createStoresHub(props, actionsHub);
        this._actionsCreatorHub = createActionsCreatorHub(props, actionsHub, this._storesHub);
    }

    public render(): JSX.Element {

        return <GettingStartedComponent
            storesHub={this._storesHub}
            actionsCreatorHub={this._actionsCreatorHub}
            {...this.props}
        />;
    }
}

function createStoresHub(props: GettingStartedViewProps, actionsHub: ActionsHub): StoresHub {
    const isSshFeatureEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.SSHPublicKeys, false);
    const isUserAnonymous = User_Services.getService().hasClaim(User_Services.UserClaims.Anonymous);
    const isUserPublic = User_Services.getService().hasClaim(User_Services.UserClaims.Public);
    const sshEnabled = isSshFeatureEnabled && props.sshEnabled && !isUserAnonymous && !isUserPublic;

    return new StoresHub(
        actionsHub,
        props.tfsContext.isHosted,
        props.cloneUrl,
        sshEnabled,
        props.sshUrl,
        getPatTokensRootUrl(props),
        isUserAnonymous,
        isUserPublic,
    );
}

function createActionsCreatorHub(props: GettingStartedViewProps, actionsHub: ActionsHub, storesHub: StoresHub): ActionsCreatorHub {
    const email = props.tfsContext.currentIdentity.email;
    const patUsername = email.substring(0, email.lastIndexOf("@"));
    const repoId = props.repositoryContext.getRepositoryId();
    const projectId = props.repositoryContext.getProjectId();
    const gitCredentialsSource = new GitCredentialsSource(
        getPatTokensRootUrl(props),
        patUsername,
        props.tfsContext.contextData.collection.uri,
        props.tfsContext.contextData.collection.id,
    );

    const gitPermissionsSource = new GitPermissionsSource(projectId, repoId);
    const ideSource = new IdeSource(props.branchName);
    const telemetryClient = new TelemetryClient();
    const gitCredentialsActionsCreator = new GitCredentialsActionsCreator(actionsHub, gitCredentialsSource, storesHub);

    return new ActionsCreatorHub(
        props.repositoryContext,
        props.tfsContext,
        actionsHub,
        ideSource,
        gitPermissionsSource,
        telemetryClient,
        gitCredentialsActionsCreator,
        props.showOnlyCommandLine);
}

function getPatTokensRootUrl(props: GettingStartedViewProps): string {
    return Utils_String.format("{0}_details/security/tokens", props.tfsContext.contextData.collection.uri);
}
