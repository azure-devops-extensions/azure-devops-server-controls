import * as Q from "q";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import {
    ArtifactTypeActions,
    IUpdateArtifactTnputPayload,
    IUpdateArtifactInputQueryPayload,
    IUpdateArtifactInputOptionsPayload
} from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActions";
import { ArtifactActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActionCreator";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import { VSTSBuildArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/VSTSBuildArtifactSource";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactStoreUtility } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStoreUtility";
import { ArtifactTypeStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { ArtifactInputBase, IKeyValuePairWithData } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { PipelineArtifactTypeDefinition, PipelineArtifactDefinitionConstants, PipelineArtifact, PipelineArtifactSourceReference } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactsConstants, WellKnownRepositoryTypes, ArtifactInputState } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IBuildDefinitionProperties } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactActions, IUpdateArtifactPayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActions";
import { ArtifactComboInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComboInput";

import * as ReleaseTypes from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as Diag from "VSS/Diag";
import Utils_String = require("VSS/Utils/String");

export class ArtifactTypeActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_ArtifactTypeActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._instanceId = instanceId;
        this._artifactActions = ActionsHubManager.GetActionsHub<ArtifactActions>(ArtifactActions);
        this._artifactTypeActions = ActionsHubManager.GetActionsHub<ArtifactTypeActions>(ArtifactTypeActions, instanceId);
        this._artifactTypeStore = StoreManager.GetStore<ArtifactTypeStore>(ArtifactTypeStore, instanceId);
        this._artifactSource = ArtifactSource.instance();
        this._vstsBuildArtifactSource = VSTSBuildArtifactSource.instance();
    }

    public clearError(): void {
        this._artifactTypeActions.updateError.invoke(null);
    }

    /**
    * @brief raise action required for initialing base input
    */
    public initializeArtifactInput(artifactType: string, artifactId: string, initialValues: IDictionaryStringTo<string>): IPromise<void> {
        this._updateArtifactInputState(ArtifactInputState.Initializing);

        this._artifactActions.changeArtifactType.invoke({ artifactType: artifactType, instanceId: artifactId });

        initialValues = initialValues || {};
        this._initializeArtifactInputInitialValues(artifactType, artifactId, initialValues);

        let firstInputIdToQueryAfterExcludingInitialValues = null;
        let firstInputPayloadAfterExcludingInitialValues: IUpdateArtifactTnputPayload;

        let artifactInputs = this._artifactTypeStore.getInputs();
        if (artifactInputs && artifactInputs.length > 0) {
            artifactInputs.forEach((input) => {
                if (!firstInputIdToQueryAfterExcludingInitialValues && !initialValues.hasOwnProperty(input.getId())) {
                    firstInputIdToQueryAfterExcludingInitialValues = input.getId();        
                }  
            });

            firstInputPayloadAfterExcludingInitialValues = {
                inputId: firstInputIdToQueryAfterExcludingInitialValues,
                displayValue: null,
                type: artifactType,
                artifactId: artifactId
            };
        }
        
        let q = Q.defer<void>();
        let inputValues = <Contracts_FormInput.InputValues>{};
        inputValues.inputId = firstInputPayloadAfterExcludingInitialValues.inputId;
        let inputValuesList: Contracts_FormInput.InputValues[] = [];
        inputValuesList.push(inputValues);
        let firstInputToQueryAfterExcludingInitialValues: Contracts_FormInput.InputValuesQuery = {
            currentValues: initialValues,
            inputValues: inputValuesList,
            resource: artifactType
        };

        this._artifactSource.postInputValuesQuery(firstInputToQueryAfterExcludingInitialValues).then((outputQueryValue: Contracts_FormInput.InputValuesQuery) => {
            this._artifactTypeActions.updateArtifactInput.invoke({
                inputChangeMetaData: firstInputPayloadAfterExcludingInitialValues,
                inputQueryValues: outputQueryValue
            });

            // Auto Initialize the inputs.           
            this.fetchInitialInputsRecursively(outputQueryValue, firstInputPayloadAfterExcludingInitialValues).then(() => {
                q.resolve(null);
                this._updateArtifactInputState(ArtifactInputState.Initialized);
            }, (error) => {
                this._handleError(error);
                this._updateArtifactInputState(ArtifactInputState.Initialized);
                q.reject(error);
            });
            
        }, (error) => {
            this._handleError(error);
            this._updateArtifactInputState(ArtifactInputState.Initialized);
            q.reject(error);
        });
        return q.promise;
    }

    public fetchInitialInputsRecursively(outputQueryValue: Contracts_FormInput.InputValuesQuery, payload: IUpdateArtifactTnputPayload): IPromise<void> {
        this._updateArtifactInputState(ArtifactInputState.Initializing);
        let q = Q.defer<void>();

        // break recursion in case there are zero possible values or input is of Source definition type.
        if (!outputQueryValue ||
            !outputQueryValue.inputValues ||
            outputQueryValue.inputValues.length <= 0 ||
            !outputQueryValue.inputValues[0].possibleValues ||
            outputQueryValue.inputValues[0].possibleValues.length <= 0 ||
            ArtifactUtility.isDefinitionInput(outputQueryValue.inputValues[0].inputId))
        {
            if (outputQueryValue.inputValues[0] &&
                ArtifactUtility.isDefinitionInput(outputQueryValue.inputValues[0].inputId) &&
                outputQueryValue.inputValues[0].error &&
                outputQueryValue.inputValues[0].error.message) {
                this._handleError(outputQueryValue.inputValues[0].error);
            }
            q.resolve(null);
        }
        else {
            const defaultValueIndex = this._getDefaultValueIndex(outputQueryValue);
            if (defaultValueIndex >= 0) {
                payload.selectedValueKey = outputQueryValue.inputValues[0].possibleValues[defaultValueIndex].value;
                payload.displayValue = this._getValue(outputQueryValue.inputValues[0].possibleValues[defaultValueIndex]);
            }
            else {
                payload.selectedValueKey = Utils_String.empty;
                payload.displayValue = Utils_String.empty;
            }

            payload.inputId = outputQueryValue.inputValues[0].inputId;

            let changedInput: ArtifactInputBase = this._artifactTypeStore.getInput(payload.inputId);
            let queryParam: Contracts_FormInput.InputValuesQuery = this._artifactTypeStore.getInputValueQuery(changedInput, payload.displayValue);
            
            this._artifactSource.postInputValuesQuery(queryParam).then((outputQueryValue: Contracts_FormInput.InputValuesQuery) => {
                this._artifactTypeActions.updateArtifactInput.invoke({
                    inputChangeMetaData: payload,
                    inputQueryValues: outputQueryValue
                });
                this.fetchInitialInputsRecursively(outputQueryValue, payload).then(() => {
                    q.resolve(null);
                }, (error) => {
                    this._handleError(error);                    
                    q.reject(error);
                });
                
            }, (error) => {
                this._handleError(error);
                q.reject(error);
            });
        }
       
        return q.promise;
    }

    private _initializeArtifactInputInitialValues(artifactType: string, artifactId: string, initialValues: IDictionaryStringTo<string>): void {

        for (let key in initialValues) {
            if (initialValues.hasOwnProperty(key)) {
                let inputValuesList: Contracts_FormInput.InputValues[] = [];
                let inputValues = <Contracts_FormInput.InputValues>{};
                inputValues.inputId = key;
                inputValuesList.push(inputValues);

                let initialValuesInputPayload: IUpdateArtifactTnputPayload = {
                    inputId: key,
                    displayValue: initialValues[key],
                    type: artifactType,
                    artifactId: artifactId
                };

                let inputQueryValues: Contracts_FormInput.InputValuesQuery = {
                    currentValues: initialValues,
                    inputValues: inputValuesList,
                    resource: artifactType
                };

                this._artifactTypeActions.updateArtifactInput.invoke({
                    inputChangeMetaData: initialValuesInputPayload,
                    inputQueryValues: inputQueryValues
                });
            }
        }
    }

    private _postInputValuesQuery(queryParam: Contracts_FormInput.InputValuesQuery): IPromise<Contracts_FormInput.InputValuesQuery> {
        this._buildDefinitions = {currentValues: {}, inputValues : [], resource : {}};
        this._paginationCount = 0;
        if (Utils_String.ignoreCaseComparer(queryParam.resource, ReleaseTypes.ArtifactTypes.Build) === 0 || Utils_String.ignoreCaseComparer(queryParam.resource, ReleaseTypes.ArtifactTypes.ExternalTfsBuildId) === 0) {
            return this.recursivelyGetAllBuildDefinitions(queryParam);
        } else {
            return this._artifactSource.postInputValuesQuery(queryParam);
        }
    }

    private recursivelyGetAllBuildDefinitions(queryParam: Contracts_FormInput.InputValuesQuery): IPromise<Contracts_FormInput.InputValuesQuery> {
        let q = Q.defer<Contracts_FormInput.InputValuesQuery>();
        this._paginationCount += 1;
        this._artifactSource.postInputValuesQuery(queryParam).then((outputQueryValue) => {
            if (outputQueryValue &&
                outputQueryValue.inputValues &&
                outputQueryValue.inputValues.length > 0 &&
                outputQueryValue.inputValues[0].possibleValues &&
                outputQueryValue.inputValues[0].possibleValues.length > 0) {                
                this._updatePossibleBuildDefinitions(outputQueryValue);
                if (!!outputQueryValue.currentValues["callbackRequired"] && 
                    Utils_String.ignoreCaseComparer(outputQueryValue.currentValues["callbackRequired"], "true") === 0 &&
                    this._paginationCount < 5) {
                    queryParam.currentValues = outputQueryValue.currentValues;
                    this.recursivelyGetAllBuildDefinitions(queryParam).then((output) => {
                        q.resolve(output);
                    });
                } else {
                    let output: Contracts_FormInput.InputValuesQuery = {
                        currentValues: outputQueryValue.currentValues,
                        inputValues: this._buildDefinitions.inputValues.length === 0 ? outputQueryValue.inputValues : this._buildDefinitions.inputValues,
                        resource: outputQueryValue.resource
                    };
                    q.resolve(output);
                }
            }
            else {
                let output: Contracts_FormInput.InputValuesQuery = {
                    currentValues: outputQueryValue.currentValues,
                    inputValues: this._buildDefinitions.inputValues.length === 0 ? outputQueryValue.inputValues : this._buildDefinitions.inputValues,
                    resource: outputQueryValue.resource
                };
                q.resolve(output);
            }
        }, (error) => {
            this._handleError(error);
            q.reject(error);
        });
        
        return q.promise;
    }

    private _updatePossibleBuildDefinitions(ivq: Contracts_FormInput.InputValuesQuery): void {
        if (!this._buildDefinitions || this._buildDefinitions.inputValues.length === 0) {
            this._buildDefinitions = ivq;
        } else {
            ivq.inputValues.filter(y => y.inputId === "definition")[0].possibleValues.forEach(x => this._buildDefinitions.inputValues.filter(y => y.inputId === "definition")[0].possibleValues.push(x));
        }
    }

    public searchArtifactInput(payload: IUpdateArtifactTnputPayload): IPromise<IKeyValuePairWithData[]> {
        let q = Q.defer<IKeyValuePairWithData[]>();
        let changedInput = this._artifactTypeStore.getInput(payload.inputId) as ArtifactComboInput;
        let inputValue = <Contracts_FormInput.InputValues>{};
        inputValue.inputId = changedInput.getId();
        let possibleValues = changedInput.getPossibleValues();

        let initialPossibleValues = [];
        possibleValues.forEach((value: IKeyValuePairWithData) => {
            initialPossibleValues.push({
                displayValue: value.Value,
                value: value.Key,
                data: value.Data
            });
        });

        let currentValues: IDictionaryStringTo<string> = {};

        changedInput.getDependencyInputIds().forEach((id: string) => {
            let parentInput: ArtifactInputBase = this._artifactTypeStore.getInput(id);
            currentValues[id] = parentInput.getValue();
        });
        currentValues[ArtifactsConstants.SearchText] = payload.displayValue;

        let queryParam: Contracts_FormInput.InputValuesQuery = {
            currentValues: currentValues,
            inputValues: [inputValue],
            resource: payload.type
        };

        this._artifactSource.postInputValuesQuery(queryParam).then((outputQueryValue: Contracts_FormInput.InputValuesQuery) => {
            let searchedOptions: IKeyValuePairWithData[] = [];
            let found = (outputQueryValue.inputValues.length > 0 &&  outputQueryValue.inputValues[0].possibleValues.length > 0);
            if (found)
            {
                outputQueryValue.inputValues[0].possibleValues.forEach((option: any) => {
                    if (initialPossibleValues.findIndex((pv) => { return Utils_String.equals(pv.value, option.value, true); }) < 0) {
                        initialPossibleValues.push(option);
                    }

                    searchedOptions.push({Value: option.displayValue, Key: option.value, Data: option.data});
                });
            }

            outputQueryValue.inputValues[0].possibleValues = initialPossibleValues;
            this._artifactTypeActions.updateArtifactInput.invoke({
                inputChangeMetaData: payload,
                inputQueryValues: outputQueryValue
            });

            q.resolve(searchedOptions);
        }, (error) => {
            this._handleError(error);
            q.reject(error);
        });

        return q.promise;
    }

    /**
    * @brief raise action required for updating input and its immediate dependent 
    */
    public updateArtifactInput(payload: IUpdateArtifactTnputPayload, skipFetchingDependency?: boolean): IPromise<void> {
        let q = Q.defer<void>();
        if (payload.options) {
            this.updateArtifactInputOptions(payload as IUpdateArtifactInputOptionsPayload);
        }
        let changedInput: ArtifactInputBase = this._artifactTypeStore.getInput(payload.inputId);
        let queryParam: Contracts_FormInput.InputValuesQuery = this._artifactTypeStore.getInputValueQuery(changedInput, payload.displayValue);

        this._sourceDefinitionUrl = this._getSourceDefintionUrl(payload.type, queryParam);

        if (this._isIndependentInput(queryParam) || skipFetchingDependency) {
            this._InvokeupdateArtifactInputAndSaveArtifact(payload, null, null);            
            q.resolve(null);
            return q.promise;
        } else {
            this.clearError();
            // Update the UI with the selected value before fetching the next input field values.
            this._InvokeupdateArtifactInputAndSaveArtifact(payload, null, null, true);
            this._updateArtifactInputState(ArtifactInputState.FetchingDependencies);
        }

        let getTagsPromise: IPromise<string[]> = this._getTagsPromise(payload, queryParam);
        let getBuildDefinitionPromise: IPromise<IBuildDefinitionProperties> = this._getBuildDefinitionPromise(payload, queryParam);

        Q.all([
            getBuildDefinitionPromise,
            getTagsPromise,
            this._artifactSource.postInputValuesQuery(queryParam)
        ]).spread((definitionProperties: IBuildDefinitionProperties, tags: string[], outputQueryValue: Contracts_FormInput.InputValuesQuery) => {
            let data: IDictionaryStringTo<any> = {};
            data[ArtifactsConstants.PossbileTagsKey] = tags;
            if (definitionProperties) {
                data[ArtifactsConstants.BuildArtifactSourceType] = definitionProperties.repositoryType;
                if (definitionProperties.repositoryType && Utils_String.ignoreCaseComparer(definitionProperties.repositoryType, WellKnownRepositoryTypes.TfsGit) === 0) {
                    data[ArtifactsConstants.BuildRepository] = definitionProperties.repositoryId;
                }
            } 

            // Call recursivly to fetch the dependent inputs for the first possible value,
            // except for the source definition.
            if (outputQueryValue &&
                outputQueryValue.inputValues &&
                outputQueryValue.inputValues.length > 0 &&
                outputQueryValue.inputValues[0].possibleValues &&
                outputQueryValue.inputValues[0].possibleValues.length > 0 &&
                !ArtifactUtility.isDefinitionInput(outputQueryValue.inputValues[0].inputId)) {

                this._InvokeupdateArtifactInputAndSaveArtifact(payload, outputQueryValue, data, true);

                payload.inputId = outputQueryValue.inputValues[0].inputId;
                payload.selectedValueKey = outputQueryValue.inputValues[0].possibleValues[0].value;
                payload.displayValue = this._getValue(outputQueryValue.inputValues[0].possibleValues[0]);
                payload.options = null;
                
                this.updateArtifactInput(payload).then(() => {
                    q.resolve(null);                  
                }, (error) => {
                    this._handleUpdateArtifactInputOnError(payload, error);
                    q.reject(error);
                });
            }
            else {
                if (outputQueryValue &&
                    outputQueryValue.inputValues &&
                    outputQueryValue.inputValues.length > 0 &&
                    ArtifactUtility.isDefinitionInput(outputQueryValue.inputValues[0].inputId) &&
                    (!outputQueryValue.inputValues[0].possibleValues ||
                        outputQueryValue.inputValues[0].possibleValues.length === 0) &&
                    outputQueryValue.inputValues[0].error &&
                    outputQueryValue.inputValues[0].error.message) {
                    this._handleUpdateArtifactInputOnError(payload, outputQueryValue.inputValues[0].error);
                } else {
                    this._InvokeupdateArtifactInputAndSaveArtifact(payload, outputQueryValue, data);
                }
                q.resolve(null);
            }
           
        }, (error) => {
            this._handleUpdateArtifactInputOnError(payload, error);
            q.reject(error);
            });
        return q.promise;
    }
   
    /**
    * @brief raise action required for initialing values in edit mode
    */
    public initializeArtifactInputs(artifact: PipelineArtifact): IPromise<void> {
        let q = Q.defer<void>();
        this._updateArtifactInputState(ArtifactInputState.Initializing);

        let queryParams: Contracts_FormInput.InputValuesQuery[] = [];
        if (artifact) {
            this._updateArtifactInputValuePayload = [];
            this._inputsFetched = false;
            this._branchAndTagsFetched = false;
            let isBranchAndTagsUpdated: boolean = false;
            let tagsPromise: IPromise<string[]>;
            let buildDefinitionPromise: IPromise<IBuildDefinitionProperties>;
            let artifactsInputIdExist = this._artifactTypeStore.doesArtifactInputIdExistInDescriptors();

            for (let input in artifact.definitionReference) {
                if (artifact.definitionReference.hasOwnProperty(input)) {
                    if (!this._sourceDefinitionUrl && artifact.type === ReleaseTypes.ArtifactTypes.Build) {
                        this._sourceDefinitionUrl = artifact.definitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl] &&
                            artifact.definitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl].id;
                    }
                    let changedInput: ArtifactInputBase = this._artifactTypeStore.getInput(input);
                    if (changedInput) {
                        if (changedInput.hasDynamicValues()) {
                            if (this._isDefaultVersionTypeWithBranchAndTagsSelected(input, artifact.definitionReference[input]) 
                            || this._isDefaultVersionTypeWithBuildDefinitionBranchAndTagsSelected(input, artifact.definitionReference[input])) {
                                if (!isBranchAndTagsUpdated) {
                                    isBranchAndTagsUpdated = true;
                                    let projectId: string = artifact.definitionReference[PipelineArtifactDefinitionConstants.ProjectId].id;
                                    tagsPromise = this._vstsBuildArtifactSource.getProjectTags(projectId);

                                    // since we are querying for repo type and name, it's ok to sample one BD only.
                                    let definitionId: number = ArtifactUtility.getDefinitionIdsFromArtifact(artifact)[0];

                                    buildDefinitionPromise = this._vstsBuildArtifactSource.getBuildDefinitionProperties(definitionId, projectId);
                                }
                            }
                            if (!this._isDefaultVersionTagsInput(changedInput)) {
                                let dependents: string[] = changedInput.getDependencyInputIds();

                                let queryParam: Contracts_FormInput.InputValuesQuery = this._getInputValuesQuery(dependents, input, artifact, artifactsInputIdExist);
                                queryParams.push(queryParam);
                            }
                        }
                        else {
                            let inputDisplayvalue: string = !!artifact.definitionReference[input].name ? artifact.definitionReference[input].name : artifact.definitionReference[input].id;
                            this._updateArtifactInputValuePayload.push({
                                inputChangeMetaData: {
                                    inputId: changedInput.getId(),
                                    displayValue: inputDisplayvalue,
                                    type: artifact.type
                                },
                            });
                        }
                    }
                }
            }

            if (artifactsInputIdExist) {
                let artifactsInput: ArtifactInputBase = this._artifactTypeStore.getInput(PipelineArtifactDefinitionConstants.ArtifactId);
                let artifactsDependents: string[] = artifactsInput.getDependencyInputIds();
                let artifactsQueryParam: Contracts_FormInput.InputValuesQuery = this._getInputValuesQuery(artifactsDependents, PipelineArtifactDefinitionConstants.ArtifactId, artifact);
                queryParams.push(artifactsQueryParam);
            }

            let getInputValuesQueryPromises: IPromise<Contracts_FormInput.InputValuesQuery>[] = [];
            queryParams.forEach((queryParam) => {
                getInputValuesQueryPromises.push(this._artifactSource.postInputValuesQuery(queryParam));
            });

            Q.allSettled(getInputValuesQueryPromises)
                .then((promiseStates: Q.PromiseState<Contracts_FormInput.InputValuesQuery>[]) => {
                    let returnValues: Contracts_FormInput.InputValuesQuery[] = [];
                    let error = null;
                    promiseStates.forEach((promiseState: Q.PromiseState<Contracts_FormInput.InputValuesQuery>) => {
                        if (promiseState.state === "fulfilled") {
                            returnValues.push(promiseState.value);
                        } else {
                            error = promiseState.reason;
                        } 
                    });

                    if (error && error.status === 0) {
                        // network failure
                        this._handleError(error);
                        this._updateArtifactInputState(ArtifactInputState.Uninitialized);
                        q.reject(error);
                    }
                    else {
                        // for all other server errors, we want to populate inputs.
                        if (returnValues && returnValues.length > 0) {
                            this._inputsFetched = true;
                            this._constructArtifactInputValuePayload(returnValues, artifact);
                        }
                      
                        this._updateAllInputValues();
                        q.resolve(null);
                    }
                });

            if (buildDefinitionPromise && tagsPromise) {
                this._updateVersionBranchAndTags(buildDefinitionPromise, tagsPromise, artifact);
            }
            else {
                this._branchAndTagsFetched = true;
            }
        }
        return q.promise;
    }

    public updateArtifactInputOptions(payload: IUpdateArtifactInputOptionsPayload) {
        this._artifactTypeActions.updateArtifactInputOptions.invoke(payload);
    }

    private _getSourceDefintionUrl(artifactType: string, queryParam: Contracts_FormInput.InputValuesQuery): string {
        if (artifactType === ReleaseTypes.ArtifactTypes.Build) {
            let projectId: string = queryParam.currentValues[PipelineArtifactDefinitionConstants.ProjectId];
            let definitionId: string = queryParam.currentValues[PipelineArtifactDefinitionConstants.DefinitionId];
            return projectId && definitionId && ArtifactStoreUtility.getBuildDefinitionUrl(projectId, definitionId);
        }
    }

    private _getDefaultValueIndex(outputQueryValue: Contracts_FormInput.InputValuesQuery): number {
        let defaultValueIndex = 0;
        if (outputQueryValue.inputValues[0].defaultValue) {
            while (defaultValueIndex < outputQueryValue.inputValues[0].possibleValues.length) {
                let value = this._getValue(outputQueryValue.inputValues[0].possibleValues[defaultValueIndex]);
                if (outputQueryValue.inputValues[0].defaultValue === value)
                {
                    return defaultValueIndex;
                }
                defaultValueIndex++;
            }
        }
        else {
            return -1;
        }
    }

    private _getValue(inputValue: Contracts_FormInput.InputValue): string {
        let value = inputValue.displayValue ? inputValue.displayValue : inputValue.value;
        return value;
    }

    private _InvokeupdateArtifactInputAndSaveArtifact(payload: IUpdateArtifactTnputPayload,
                                        outputQueryValue?: Contracts_FormInput.InputValuesQuery,
                                        data?: IDictionaryStringTo<any>,
                                        isRecursiveFetchingOn?: boolean): void {

        this._artifactTypeActions.updateArtifactInput.invoke({
            inputChangeMetaData: payload,
            inputQueryValues: outputQueryValue,
            data: data,
            isRecursiveFetchingOn: isRecursiveFetchingOn,
            sourceDefinitionUrl: this._sourceDefinitionUrl
        });
        this._saveArtifact(payload.artifactId);
    }

    private _handleUpdateArtifactInputOnError(payload: IUpdateArtifactTnputPayload, error: any) {
        this._artifactTypeActions.updateArtifactInput.invoke({
            inputChangeMetaData: payload
        });
        this._saveArtifact(payload.artifactId);
        this._handleError(error);
        this._updateArtifactInputState(ArtifactInputState.Initialized);
    }

    private _updateArtifactInputState(state: ArtifactInputState): void {
        this._artifactTypeActions.updateArtifactInputState.invoke(state);
    }

    /**
   * @brief raise action required save artifacts
   */
    private _saveArtifact(artifactId: string): void {
        if (!artifactId) {
            return;
        }

        let payload: IUpdateArtifactPayload = this._createSaveArtifactPayload(artifactId);
        this._populateInputValuesInDefinition(payload.artifact);

        const shouldChangeAlias = this._shouldChangeAlias(artifactId, payload.artifact);
        let newAlias: string = null;
        if (shouldChangeAlias) {
            newAlias = RMUtils.ArtifactHelper.getSanitizedAliasName(this._getSuggestedAlias(payload.artifact));
        }

        this._artifactActions.updateArtifact.invoke(payload);
        if (shouldChangeAlias) {
            let actionCreator = ActionCreatorManager.GetActionCreator<ArtifactActionCreator>(ArtifactActionCreator);
            actionCreator.updateArtifactAlias(artifactId, newAlias);
        }
    }

    private _isIndependentInput(queryParam: Contracts_FormInput.InputValuesQuery): boolean {
        if ((!queryParam.currentValues || Object.keys(queryParam.currentValues).length === 0) &&
            (!queryParam.inputValues || queryParam.inputValues.length === 0)) {
            return true;
        }
        return false;
    }

    private _shouldChangeAlias(artifactId: string, newArtifact: PipelineArtifact): boolean {
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        let artifactStore: ArtifactStore = artifactListStore.getArtifactById(artifactId);

        if (!artifactStore || !artifactStore.isTemporary()) {
            return false;
        }

        let oldArtifact: PipelineArtifact = artifactStore.getState();

        const oldDefinitioName = this._getSuggestedAlias(oldArtifact);
        const newDefinitioName = this._getSuggestedAlias(newArtifact);

        if (Utils_String.localeIgnoreCaseComparer(oldDefinitioName, newDefinitioName) !== 0) {
            return true;
        }

        return false;
    }

    private _getSuggestedAlias(artifact: PipelineArtifact): string {
        if (!artifact.definitionReference) {
            return Utils_String.empty;
        }

        if (artifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.DefinitionId)
            && artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].name) {
            if (Utils_String.localeIgnoreCaseComparer(artifact.type, ReleaseTypes.ArtifactTypes.Build) === 0) {
                return this._getArtifactAliasFromDefinitionPath(artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].name);
            }
            else {
                return artifact.definitionReference[PipelineArtifactDefinitionConstants.DefinitionId].name;
            }
        }

        if (artifact.definitionReference.hasOwnProperty(PipelineArtifactDefinitionConstants.MultipleDefinitionsId)
            && artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].name) {
            if (Utils_String.localeIgnoreCaseComparer(artifact.type, ReleaseTypes.ArtifactTypes.Build) === 0) {
                let multipleDefinitionNames = artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].name.split(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter).map(name => 
                    { return this._getArtifactAliasFromDefinitionPath(name); }
                );
                 
                return multipleDefinitionNames.join("_");
            }
            else {
                return artifact.definitionReference[PipelineArtifactDefinitionConstants.MultipleDefinitionsId].name.replace(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter, "_");
            }
        }

        return Utils_String.empty;
    }

    private _getArtifactAliasFromDefinitionPath(definitionPath): string {
        let alias: string = Utils_String.empty;
        //Split the definition path into an array based on '\' character and take the build definition name as alias
        let definitionPathArray = definitionPath.split("\\");
        if (!!definitionPathArray && definitionPathArray.length > 0) {
            alias = definitionPathArray[definitionPathArray.length - 1];
        }

        return alias;
    }

    private _populateInputValuesInDefinition(artifact: PipelineArtifact): void {
        for (let inputId in artifact.definitionReference) {
            if (artifact.definitionReference.hasOwnProperty(inputId)) {
                let input: ArtifactInputBase = this._artifactTypeStore.getInput(inputId);
                if (input && (!this._artifactTypeStore.containsDeletedOrUnauthorizedInputs() ||
                    input.isEditable(ArtifactUtility.getArtifactInputFieldsInUniqueSourceIdentifier(this._artifactTypeStore.getArtifactType().uniqueSourceIdentifier)))) {
                    artifact.definitionReference[inputId].id = input.getValue() || Utils_String.empty;
                    artifact.definitionReference[inputId].name = input.getDisplayValue() || Utils_String.empty;
                }
            }
        }
    }

    private _createSaveArtifactPayload(artifactId: string): IUpdateArtifactPayload {
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        let artifactStore: ArtifactStore = artifactListStore.getArtifactById(artifactId);
        if (!artifactStore || !artifactStore.getState()) {
            return;
        }

        let existingArtifact: PipelineArtifact = artifactStore.getState();
        let updatedArtifact: PipelineArtifact = JQueryWrapper.extendDeep({}, existingArtifact);

        let payload: IUpdateArtifactPayload = {
            artifactId: artifactId,
            artifact: updatedArtifact
        };

        return payload;
    }

    private _updateVersionBranchAndTags(buildDefinitionPromise: IPromise<IBuildDefinitionProperties>, tagsPromise: IPromise<string[]>, artifact: PipelineArtifact): void {
        Q.all([buildDefinitionPromise,
            tagsPromise])
            .spread((definitionProperties: IBuildDefinitionProperties, tags: string[]) => {
                let data: IDictionaryStringTo<any> = this._getDataForBranchAndTagsInput(definitionProperties, tags);
                this._populateBranchAndTagInputs(data, artifact);
            }, (error) => {
                //  most likely build definition donot exist
                this._populateBranchAndTagInputs(null, artifact);
            });
    }

    private _getDataForBranchAndTagsInput(definitionProperties: IBuildDefinitionProperties, tags: string[]): IDictionaryStringTo<any> {
        let data: IDictionaryStringTo<any> = {};

        if (definitionProperties &&
            definitionProperties.repositoryType &&
            Utils_String.ignoreCaseComparer(definitionProperties.repositoryType, WellKnownRepositoryTypes.TfsGit) === 0) {
            data[ArtifactsConstants.BuildRepository] = definitionProperties.repositoryId;
        }

        if (tags) {
            data[ArtifactsConstants.PossbileTagsKey] = tags;
        }

        if (definitionProperties) {
            data[ArtifactsConstants.BuildArtifactSourceType] = definitionProperties.repositoryType;
        }

        return data;
    }

    private _populateBranchAndTagInputs(data: IDictionaryStringTo<any>, artifact: PipelineArtifact): void {
        this._branchAndTagsFetched = true;
        this._updateBranchTagsInput(PipelineArtifactDefinitionConstants.DefaultVersionBranchId, data, artifact);
        this._updateBranchTagsInput(PipelineArtifactDefinitionConstants.DefaultVersionTagsId, data, artifact);
        this._updateAllInputValues();
    }

    private _updateAllInputValues(): void {
        if (this._inputsFetched && this._branchAndTagsFetched) {
            this._artifactTypeActions.updateArtifactInputValue.invoke(this._updateArtifactInputValuePayload);
        }  
    }

    private _updateBranchTagsInput(inputId: string, data: IDictionaryStringTo<string>, artifact: PipelineArtifact): void {
        this._updateArtifactInputValuePayload.push({
            inputChangeMetaData: {
                inputId: inputId,
                displayValue: artifact.definitionReference[inputId].id,
                type: artifact.type
            },
            data: data
        });
    }

    private _isDefaultVersionTagsInput(input: ArtifactInputBase): boolean {
        if (Utils_String.ignoreCaseComparer(input.getId(), PipelineArtifactDefinitionConstants.DefaultVersionTagsId) === 0) {
            return true;
        }
        return false;
    }

    private _isDefaultVersionTypeWithBranchAndTagsSelected(inputId: string, value: PipelineArtifactSourceReference): boolean {
        if (Utils_String.ignoreCaseComparer(inputId, PipelineArtifactDefinitionConstants.DefaultVersionTypeId) === 0 &&
            Utils_String.ignoreCaseComparer(value.id, PipelineArtifactDefinitionConstants.LatestWithBranchAndTagsType) === 0) {
            return true;
        }
        return false;
    }

    private _isDefaultVersionTypeWithBuildDefinitionBranchAndTagsSelected(inputId: string, value: PipelineArtifactSourceReference): boolean {
        if (Utils_String.ignoreCaseComparer(inputId, PipelineArtifactDefinitionConstants.DefaultVersionTypeId) === 0 &&
            Utils_String.ignoreCaseComparer(value.id, PipelineArtifactDefinitionConstants.LatestWithBuildDefinitionBranchAndTagsType) === 0) {
            return true;
        }
        return false;
    }

    private _getInputValuesQuery(dependents: string[], input: string, artifact: PipelineArtifact, artifactsInputIdExist?: boolean): Contracts_FormInput.InputValuesQuery {
        let inputValues = <Contracts_FormInput.InputValues>{};
        inputValues.inputId = input;
        let inputValuesList: Contracts_FormInput.InputValues[] = [];
        inputValuesList.push(inputValues);
        let queryParam: Contracts_FormInput.InputValuesQuery;

        if (dependents.length === 0) {
            queryParam = {
                currentValues: {},
                inputValues: inputValuesList,
                resource: artifact.type
            };
        }
        else {
            let currentValues: IDictionaryStringTo<string> = {};
            dependents.forEach((dependent: string) => {
                currentValues[dependent] = (artifact && artifact.definitionReference && artifact.definitionReference[dependent]) ?
                    artifact.definitionReference[dependent].id : Utils_String.empty;
            });

            if (artifactsInputIdExist) {
                let inputValue = <Contracts_FormInput.InputValues>{};
                inputValue.inputId = PipelineArtifactDefinitionConstants.ArtifactId;
                inputValuesList.push(inputValue);
            }
            queryParam = {
                currentValues: currentValues,
                inputValues: inputValuesList,
                resource: artifact.type
            };

        }
        return queryParam;
    }

    private _constructArtifactInputValuePayload(inputValuesQuery: Contracts_FormInput.InputValuesQuery[], artifact: PipelineArtifact): void {
        inputValuesQuery.forEach((outputQueryValue: Contracts_FormInput.InputValuesQuery, index: number) => {
            let inputId: string;
            let displayValue: string = Utils_String.empty;
            if (outputQueryValue && outputQueryValue.inputValues && outputQueryValue.inputValues.length > 0) {
                inputId = outputQueryValue.inputValues[0].inputId;
                if (inputId) {
                    displayValue = artifact.definitionReference[inputId] ?
                        this._getDisplayValue(inputId, artifact, outputQueryValue.inputValues[0]) : Utils_String.empty;
                    let data: IDictionaryStringTo<string> = {};
                    this._updateArtifactInputValuePayload.push({
                        inputChangeMetaData: {
                            inputId: inputId,
                            displayValue: displayValue,
                            type: artifact.type,
                            value: artifact.definitionReference[inputId] ? artifact.definitionReference[inputId].id : null
                        },
                        inputQueryValues: outputQueryValue,
                        data: data,
                        sourceDefinitionUrl: this._sourceDefinitionUrl
                    });
                }
            }
        });
    }

    private _getDisplayValue(inputId: string, artifact: PipelineArtifact, inputValue: Contracts_FormInput.InputValues): string {
        if (!artifact.definitionReference[inputId]) {
            return Utils_String.empty;
        }

        const input: ArtifactInputBase = this._artifactTypeStore.getInput(inputId);

        if (!input) {
            return Utils_String.empty;
        }

        if (!input.hasDynamicValues() || !inputValue.possibleValues) {
            return !!artifact.definitionReference[inputId].name ? artifact.definitionReference[inputId].name : artifact.definitionReference[inputId].id ;
        }

        const id: string = artifact.definitionReference[inputId].id;
        for (let possibleValue of inputValue.possibleValues) {
            if (Utils_String.ignoreCaseComparer(possibleValue.value, id) === 0 || 
                (artifact.type === ReleaseTypes.ArtifactTypes.GitId &&
                inputId === PipelineArtifactDefinitionConstants.BranchesId && 
                Utils_String.ignoreCaseComparer(DtcUtils.getRefFriendlyName(possibleValue.value), DtcUtils.getRefFriendlyName(id)) === 0)) {
                return !!possibleValue.displayValue ? possibleValue.displayValue : possibleValue.value;
            }
        }

        return artifact.definitionReference[inputId].name ? artifact.definitionReference[inputId].name : artifact.definitionReference[inputId].id;
    }

    private _getTagsPromise(payload: IUpdateArtifactTnputPayload, queryParam: Contracts_FormInput.InputValuesQuery ): IPromise<string[]> {
        let getTagsPromise: IPromise<string[]>;
        if (payload.type === ReleaseTypes.ArtifactTypes.Build &&
            payload.inputId === PipelineArtifactDefinitionConstants.DefaultVersionTypeId &&
            payload.selectedValueKey === ArtifactsConstants.LatestWithBranchAndTagsTypeValue) {
            getTagsPromise = this._vstsBuildArtifactSource.getProjectTags(queryParam.currentValues[PipelineArtifactDefinitionConstants.ProjectId]);
        } else {
            let defer = Q.defer<string[]>();
            defer.resolve(null);
            getTagsPromise = defer.promise;
        }

        return getTagsPromise;
    }

    private _getBuildDefinitionPromise(payload: IUpdateArtifactTnputPayload, queryParam: Contracts_FormInput.InputValuesQuery): IPromise<IBuildDefinitionProperties> {
        let getBuildDefinitionPromise: IPromise<IBuildDefinitionProperties>;
        if (payload.type === ReleaseTypes.ArtifactTypes.Build &&
            payload.inputId === PipelineArtifactDefinitionConstants.DefaultVersionTypeId &&
            payload.selectedValueKey === ArtifactsConstants.LatestWithBranchAndTagsTypeValue) {
            let projectId: string = queryParam.currentValues[PipelineArtifactDefinitionConstants.ProjectId];
            // since we are querying for repo type and name, it's ok to sample one BD only.
            let definitionId: number = ArtifactUtility.getDefinitionIds(queryParam.currentValues)[0];
            getBuildDefinitionPromise = this._vstsBuildArtifactSource.getBuildDefinitionProperties(definitionId, projectId);
        } else {
            let defer = Q.defer<IBuildDefinitionProperties>();
            defer.resolve(null);
            getBuildDefinitionPromise = defer.promise;
        }

        return getBuildDefinitionPromise;
    }

    private _handleError(error): void {
        let errorMessage: string = this._getErrorMessage(error);
        if (errorMessage) {
            this._artifactTypeActions.updateError.invoke(errorMessage);
        }
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return null;
        }

        return error.message || error;
    }

    private _artifactActions: ArtifactActions;
    private _artifactTypeActions: ArtifactTypeActions;
    private _artifactTypeStore: ArtifactTypeStore;
    private _artifactSource: ArtifactSource;
    private _vstsBuildArtifactSource: VSTSBuildArtifactSource;
    private _branchAndTagsFetched: boolean = false;
    private _inputsFetched: boolean = false;
    private _updateArtifactInputValuePayload: IUpdateArtifactInputQueryPayload[];
    private _instanceId: string;
    private _sourceDefinitionUrl: string = Utils_String.empty;
    private _buildDefinitions: Contracts_FormInput.InputValuesQuery;
    private _paginationCount: number = 0;
}