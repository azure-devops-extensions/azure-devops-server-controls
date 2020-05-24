/// <reference types="react" />

import * as React from "react";

import { GitHubComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/GitHubComponentProvider";
import * as GitHubRepository_NO_REQUIRE from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitServiceRepository";
import * as GitHubRepositoryContext_NO_REQUIRE from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitHubRepositoryContext";
import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";

import { ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import { Component as AddNewServiceEndpoint } from "DistributedTaskControls/Components/AddNewServiceEndpoint";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as VSS from "VSS/VSS";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export class GitHubEnterpriseComponentProvider extends GitHubComponentProvider {
    public getAddConnectionSection(newConnectionName: string, endpointType: string, showClose: boolean, onAddNewConnectionClick: (event: React.MouseEvent<HTMLButtonElement>) => void, onDismiss: () => void) {
        return <AddNewServiceEndpoint
            newConnectionName={newConnectionName}
            id={endpointType}
            isEnabled={true}
            connectionType={"githubenterprise"}
            serverUrl={""}
            allowOauth={false}
            allowPAT={true}
            allowBasic={false}
            allowSetServerUrl={true}
            showClose={showClose}
            onDismiss={onDismiss} />;
    }

    protected getRepositoryContext(tfsContext: TfsContext, gitHubRepository: GitHubRepository_NO_REQUIRE.GitServiceRepository): RepositoryContext {
        return GitHubRepositoryContext_NO_REQUIRE.GitHubRepositoryContext.createEnterpriseContext(gitHubRepository, tfsContext);
    }
}
