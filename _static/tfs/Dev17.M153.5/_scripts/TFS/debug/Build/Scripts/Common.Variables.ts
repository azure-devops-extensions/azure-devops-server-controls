/// <reference types="jquery" />
/// <reference path='Interfaces.d.ts' />



import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildCommon = require("TFS/Build/Contracts");

import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export interface IDefinitionVariable extends BuildCommon.BuildDefinitionVariable {
    name: string;
}

export class DefinitionVariable implements IDefinitionVariable {
    name: string;
    value: string;
    allowOverride: boolean;
    isSecret: boolean;

    public constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
        this.allowOverride = true;
        this.isSecret = false;
    }
}

interface ImplicitVariableFactory {
    (tfsContext: TFS_Host_TfsContext.TfsContext): IDefinitionVariable;
}

export class ImplicitVariableNames {
    public static CollectionId: string = "system.collectionId";
    public static TeamProject: string = "system.teamProject";
    public static DefinitionId: string = "system.definitionId";
}

export class ImplicitVariables {
    private static _factories: {
        [name: string]: ImplicitVariableFactory
    } = null;

    public static GetImplicitVariables(tfsContext: TFS_Host_TfsContext.TfsContext): IDefinitionVariable[] {
        var implicitVariables: IDefinitionVariable[] = [];

        var factories = ImplicitVariables._getVariableFactories();
        for (var key in factories) {
            implicitVariables.push(factories[key](tfsContext));
        }

        return implicitVariables;
    }

    private static _getVariableFactories() {
        if (!ImplicitVariables._factories) {
            ImplicitVariables._factories = {};

            ImplicitVariables._addFactory(ImplicitVariableNames.CollectionId,
                (tfsContext: TFS_Host_TfsContext.TfsContext) => tfsContext.navigation.collection.instanceId,
                false);

            ImplicitVariables._addFactory(ImplicitVariableNames.TeamProject,
                (tfsContext: TFS_Host_TfsContext.TfsContext) => tfsContext.navigation.project,
                false);

            ImplicitVariables._addFactory(ImplicitVariableNames.DefinitionId,
                (tfsContext: TFS_Host_TfsContext.TfsContext) => "",
                false);
        }

        return ImplicitVariables._factories;
    }

    private static _addFactory(name: string, factory: (tfsContext: TFS_Host_TfsContext.TfsContext) => string, allowOverride: boolean) {
        ImplicitVariables._factories[name] = (tfsContext: TFS_Host_TfsContext.TfsContext) => {
            return {
                name: name,
                value: factory(tfsContext),
                allowOverride: allowOverride,
                isSecret: false
            };
        };
    }

    public static IsImplicitVariable(key: string): boolean {
        for (var implicitVariable in ImplicitVariables._getVariableFactories()) {
            if (Utils_String.localeIgnoreCaseComparer(key, implicitVariable) === 0) {
                return true;
            }
        }
        return false;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Common.Variables", exports);
