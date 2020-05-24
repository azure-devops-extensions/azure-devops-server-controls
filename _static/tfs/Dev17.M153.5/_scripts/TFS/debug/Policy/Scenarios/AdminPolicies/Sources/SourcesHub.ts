// scenario
import { IBuildDefinitionSource } from "Policy/Scenarios/AdminPolicies/Sources/BuildDefinitionSource";
import { IPolicyConfigSource } from "Policy/Scenarios/AdminPolicies/Sources/PolicyConfigSource";
import { IPolicyIdentitySource } from "Policy/Scenarios/AdminPolicies/Sources/PolicyIdentitySource";

export class SourcesHub {
    public readonly buildDefinitionSource: IBuildDefinitionSource;
    public readonly policyConfigSource: IPolicyConfigSource;
    public readonly policyIdentitySource: IPolicyIdentitySource;

    constructor(
        buildDefinitionSource: IBuildDefinitionSource,
        policyConfigSource: IPolicyConfigSource,
        policyIdentitySource: IPolicyIdentitySource
    ) {
        this.buildDefinitionSource = buildDefinitionSource;
        this.policyConfigSource = policyConfigSource;
        this.policyIdentitySource = policyIdentitySource;
    }
}
