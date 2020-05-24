/// <reference types="react" />

import * as React from "react";

import { GitHubComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/GitHubComponentProvider";

import { ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import { Component as AddNewServiceEndpoint } from "DistributedTaskControls/Components/AddNewServiceEndpoint";

export class BitbucketComponentProvider extends GitHubComponentProvider {
    public getAddConnectionSection(
        newConnectionName: string,
        endpointType: string,
        showClose: boolean,
        onAddNewConnectionClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
        onDismiss: () => void) {
        return <AddNewServiceEndpoint
            newConnectionName={newConnectionName}
            id={endpointType}
            isEnabled={true}
            connectionType={ServiceEndpointType.Bitbucket}
            serverUrl={"https://api.bitbucket.org/"}
            allowOauth={true}
            allowPAT={false}
            allowBasic={true}
            allowSetServerUrl={false}
            showClose={showClose}
            onDismiss={onDismiss} />;
    }

    public canShowPathDialog(): boolean {
        return false;
    }
}
