/// <reference types="react" />

import * as React from "react";

import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

export enum IInputType {
    DaysToKeep = 1,
    MinimumToKeep,
    BuildRecord,
    SourceLabel,
    FileShare,
    Symbols,
    TestResults
}

export interface IInputActionPayload {
    inputType: IInputType;
    value: string;
}

export interface IBranchFilterPayload{
    filter: string;
    index: number;
}

export class RetentionPolicyActionsCreator extends ActionsBase.ActionCreatorBase {
    private _updateInputAction: Action<IInputActionPayload>;
    private _addBranchFilterAction: Action<string>;
    private _updateBranchFilterAction: Action<IBranchFilterPayload>;
    private _deleteBranchFilterAction: Action<number>;

    public initialize(): void {
        this._updateInputAction = new Action<IInputActionPayload>();
        this._addBranchFilterAction = new Action<string>();
        this._updateBranchFilterAction = new Action<IBranchFilterPayload>();
        this._deleteBranchFilterAction = new Action<number>();
    }

    public static getKey(): string {
        return ActionCreatorKeys.RetentionPolicy_ActionCreator;
    }

    public get updateInputAction(): Action<IInputActionPayload> {
        return this._updateInputAction;
    }

    public updateInput(type: IInputType, newValue: string) {
        this.updateInputAction.invoke({ inputType: type, value: newValue } as IInputActionPayload);
    }  

    public get addBranchFilterAction(): Action<string> {
        return this._addBranchFilterAction;
    }

    public addBranchFilter(filter: string) {
        this.addBranchFilterAction.invoke(filter);
    }

    public get updateBranchFilterAction(): Action<IBranchFilterPayload> {
        return this._updateBranchFilterAction;
    }

    public updateBranchFilter(filter: string, index: number) {
        this.updateBranchFilterAction.invoke({ filter: filter, index: index } as IBranchFilterPayload);
    }

    public get deleteBranchFilterAction(): Action<number> {
        return this._deleteBranchFilterAction;
    }

    public deleteBranchFilter(index: number) {
        this.deleteBranchFilterAction.invoke(index);
    }
}
