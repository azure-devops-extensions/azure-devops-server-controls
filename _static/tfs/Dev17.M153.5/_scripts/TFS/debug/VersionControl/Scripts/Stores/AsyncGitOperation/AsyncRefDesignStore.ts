import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";
import * as Q from "q";
import * as AsyncGitOperationActions from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { BranchNameValidator } from "VersionControl/Scripts/RefNameValidator";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as  VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

const maxGeneratedRefLength = 250;

/**
 * A store for asynchronous ref operations.
 */
export class AsyncRefDesignStore extends TFS_React.Store {
    private startedAsyncRefOperation: any;
    private ontoRef: VCSpecs.IGitRefVersionSpec;
    private generatedRef: VCSpecs.IGitRefVersionSpec;
    private validator: BranchNameValidator;
    private generatedRefError: string;
    private generatedRefWarning: string;
    private currentState: AsyncGitOperationActions.AsyncRefOperationCreationState;
    private currentOperationType: AsyncGitOperationActions.AsyncRefOperationType;
    private sourceName: string;
    private _title: string;
    private _subtitle: string;
    private _simplifiedMode: boolean;

    constructor() {
        super("AsyncRefDesignStore_Changed");
        this.currentState = AsyncGitOperationActions.AsyncRefOperationCreationState.NotDesigning;
        this.validator = new BranchNameValidator([]);
        AsyncGitOperationActions.asyncRefOperationStarted.addListener(this._asyncRefOperationStarted);
        AsyncGitOperationActions.asyncRefOperationCreationStateChanged.addListener(this._creationStateChanged);
        AsyncGitOperationActions.asyncRefOperationOntoRefChanged.addListener(this._ontoRefChanged);
        AsyncGitOperationActions.asyncRefOperationGeneratedRefChanged.addListener(this._generatedRefChanged);
        AsyncGitOperationActions.loadedBranchNames.addListener(this._loadedBranchNames);
    }

    private _loadedBranchNames = (payload: AsyncGitOperationActions.ILoadedBranchNamesPayload) => {
        this.validator = new BranchNameValidator(payload.branchNames);
        this._validateGeneratedRef();
        this.emitChanged();
    }

    private _asyncRefOperationStarted = (payload: AsyncGitOperationActions.IAsyncRefOperationStartedPayload) => {
        this.startedAsyncRefOperation = payload.asyncRefOperation;
        this.currentState = AsyncGitOperationActions.AsyncRefOperationCreationState.Started;
        this.emitChanged();
    }

    private _creationStateChanged = (payload: AsyncGitOperationActions.ICreationStatePayload) => {
        const previousState = this.currentState;
        this.currentState = payload.state;
        if (payload.title) {
            this._title = payload.title;
        }
        if (payload.subtitle) {
            this._subtitle = payload.subtitle;
        }
        if (payload.operationType !== undefined) {
            this.currentOperationType = payload.operationType;
        }
        if (payload.errorMessage) {
            this.generatedRefError = payload.errorMessage;
        }

        // If starting to design a new operation, reset the store.
        if (previousState === AsyncGitOperationActions.AsyncRefOperationCreationState.NotDesigning
            && this.currentState === AsyncGitOperationActions.AsyncRefOperationCreationState.Designing) {
            this.ontoRef = payload.ontoRef || null;  // prefer null to undefined
            this.generatedRef = payload.generatedRef || null;
            this.sourceName = payload.sourceName || "";
            this.generatedRefError = payload.errorMessage || "";
            this.generatedRefWarning = "";
            this.startedAsyncRefOperation = null;
            this.validator = new BranchNameValidator([]);
            this._simplifiedMode = payload.simplifiedMode || false;

            if (this.ontoRef && !this._simplifiedMode) {
                const defaultRefName = this.createDefaultGeneratedRefName(this.ontoRef);
                this.generatedRef = new VCSpecs.GitBranchVersionSpec(defaultRefName.generatedRefName);
                this._validateGeneratedRef(defaultRefName.isTruncated);
            }
        }

        this.emitChanged();
    }

    private _generatedRefChanged = (payload: AsyncGitOperationActions.IAsyncRefOperationRefChangedPayload) => {
        this.generatedRef = payload.ref;
        this._validateGeneratedRef();
        this.emitChanged();
    }

    private _ontoRefChanged = (payload: AsyncGitOperationActions.IAsyncRefOperationRefChangedPayload) => {
        const prevOnto = this.ontoRef;
        this.ontoRef = payload.ref;
        // If the generated ref name is empty or the one that we generated, we generate a new one for the new onto ref.
        // If the ref name is still the ref name we generated for them (our "default"), then we assume that they want to use our
        // generated names, so we update the "default" generated name for their new onto ref.
        if (this.ontoRef
            && !this._simplifiedMode
            && (!this.generatedRef || (prevOnto && this.generatedRef.toDisplayText() === this.createDefaultGeneratedRefName(prevOnto).generatedRefName))) {
            const defaultRefName = this.createDefaultGeneratedRefName(this.ontoRef);
            this.generatedRef = new VCSpecs.GitBranchVersionSpec(defaultRefName.generatedRefName);
            this._validateGeneratedRef(defaultRefName.isTruncated);
        }
        this.emitChanged();
    }

    private _validateGeneratedRef(isTruncated?: boolean) {
        if (this.validator && this.generatedRef) {
            const validationState = this.validator.validate(this.generatedRef.toDisplayText());
            this.generatedRefError = validationState.error;
            this.generatedRefWarning = isTruncated ? VCResources.AsyncOperation_GeneratedBranchNameIsTooLong : "";
        }
    }

    private _sanitizeRef(ref: VCSpecs.IGitRefVersionSpec): string {
        return ref.toFriendlyName().replace("/", "-");
    }

    /**
     * Generates a default name for a given onto ref for this async ref operation.
     * @param ontoRef The onto ref.
     */
    public createDefaultGeneratedRefName(ontoRef: VCSpecs.IGitRefVersionSpec): {generatedRefName: string, isTruncated: boolean} {
        let generatedRefName: string;
        switch (this.currentOperationType) {
            case AsyncGitOperationActions.AsyncRefOperationType.CherryPick:
                generatedRefName = this.sourceName + "-on-" + this._sanitizeRef(ontoRef);
                break;
            case AsyncGitOperationActions.AsyncRefOperationType.Revert:
                generatedRefName = this.sourceName + "-revert-from-" + this._sanitizeRef(ontoRef);
                break;
            default:
                return null;
        }

        if (generatedRefName.length > maxGeneratedRefLength) {
            generatedRefName = generatedRefName.substr(0, maxGeneratedRefLength);
            return { generatedRefName, isTruncated: true };
        }

        return { generatedRefName, isTruncated: false };
    }

    /**
     * Gets the operation id for the current operation, if it has been created.
     */
    public getOperationId(): number {
        if (this.startedAsyncRefOperation !== null) {
            switch (this.currentOperationType) {
                case AsyncGitOperationActions.AsyncRefOperationType.CherryPick:
                    return this.startedAsyncRefOperation.cherryPickId;
                case AsyncGitOperationActions.AsyncRefOperationType.Revert:
                    return this.startedAsyncRefOperation.revertId;
                default:
                    return null;
            }
        }

        return null;
    }

    /**
     * Gets the onto ref for the operation.
     */
    public getOntoRef() {
        return this.ontoRef;
    }

    /**
     * Gets the generated ref for the operation.
     */
    public getGeneratedRef() {
        return this.generatedRef;
    }

    /**
     * Get the current state of the operation create experience
     */
    public getCurrentState() {
        return this.currentState;
    }

    /**
     * Gets the current error message for the generated ref, if there is an error.
     */
    public getGeneratedRefError() {
        return this.generatedRefError;
    }

    /**
     * Gets the current warning message for the generated ref.
     */
    public getGeneratedRefWarning() {
        return this.generatedRefWarning;
    }

    /**
     * Gets if the generated ref name is the name that we created for it.
     */
    public generatedRefIsDefaultName() {
        return !this.ontoRef
            || this._simplifiedMode
            || (this.generatedRef.toDisplayText() === this.createDefaultGeneratedRefName(this.ontoRef).generatedRefName);
    }

    public get title(){
        return this._title;
    }

    public get subTitle(): string{
        if (this._subtitle) {
            return this._subtitle;
        }
        if (this.currentOperationType === AsyncGitOperationActions.AsyncRefOperationType.CherryPick){
            return VCResources.CherryPick_Dialog_Description;
        }
        else if (this.currentOperationType === AsyncGitOperationActions.AsyncRefOperationType.Revert){
            return VCResources.Revert_Dialog_Description;
        }
        else {
            throw new Error("No supported OperationType was set in AsyncRefDesignStore");
        }
    }

    public get createText(): string {
        if (this.currentOperationType === AsyncGitOperationActions.AsyncRefOperationType.CherryPick){
            return VCResources.CherryPick_Dialog_Oktext;
        }
        else if (this.currentOperationType === AsyncGitOperationActions.AsyncRefOperationType.Revert){
            return VCResources.Revert_Dialog_Oktext;
        }
        else {
            throw new Error("No supported OperationType was set in AsyncRefDesignStore");
        }
    }

    public get operationType(): AsyncGitOperationActions.AsyncRefOperationType {
        return this.currentOperationType;
    }
}

export let AsyncRefDesignStoreInstance = new AsyncRefDesignStore();
