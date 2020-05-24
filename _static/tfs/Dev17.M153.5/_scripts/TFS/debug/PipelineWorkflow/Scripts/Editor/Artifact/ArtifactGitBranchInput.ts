/**
 * @brief Base Store for Branch Input
 */

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactComboInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComboInput";

import * as Utils_String from "VSS/Utils/String";
import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");

export class GitBranchInput extends ArtifactComboInput {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ValidatorBase) {
        super(inputDescriptor, validator);
    }

    /**
    * updates value for gitBranchInput
    */
    public updateValues(inputValues: Contracts_FormInput.InputValues) {
        super.updateValues(inputValues);

        let selectedIndex: number = -1;
        let selectedValue: string = Utils_String.empty;

        this.setDisplayValue(Utils_String.empty);
    }

    /**
    * returns selected value
    */
    public getValue(): string {
        return this.getDisplayValue();
    }

     /**
     * sets repository id
     */
    public updateRepository(repositoryId: string) {
        this._repositoryId = repositoryId;
    }

     /**
     * returns repository id
     */
    public getRepositoryId(): string {
        return this._repositoryId;
    }

    public fixPossibleValues(): boolean {
        return false;
    }

    private _repositoryId: string = Utils_String.empty;
}