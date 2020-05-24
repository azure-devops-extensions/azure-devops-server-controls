import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Contracts = require("VSS/Common/Contracts/Platform");

export interface DefinitionVariable {
    name: string;
    value: string;
    allowOverride: boolean;
    isSecret: boolean;
}

interface ImplicitVariableFactory {
    (webContext: Contracts.WebContext): DefinitionVariable;
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

    public static GetImplicitVariables(webContext: Contracts.WebContext): DefinitionVariable[]{
        var implicitVariables: DefinitionVariable[] = [];

        var factories = ImplicitVariables._getVariableFactories();
        Object.keys(factories).forEach((key: string) => {
            implicitVariables.push(factories[key](webContext));
        });

        return implicitVariables;
    }

    private static _getVariableFactories() {
        if (!ImplicitVariables._factories) {
            ImplicitVariables._factories = {};

            ImplicitVariables._addFactory(ImplicitVariableNames.CollectionId,
                (webContext: Contracts.WebContext) => webContext.collection.id,
                false);

            ImplicitVariables._addFactory(ImplicitVariableNames.TeamProject,
                (webContext: Contracts.WebContext) => webContext.project.name,
                false);

            ImplicitVariables._addFactory(ImplicitVariableNames.DefinitionId,
                (webContext: Contracts.WebContext) => "",
                false);
        }

        return ImplicitVariables._factories;
    }

    private static _addFactory(name: string, factory: (webContext: Contracts.WebContext) => string, allowOverride: boolean) {
        ImplicitVariables._factories[name] = (webContext: Contracts.WebContext) => {
            return {
                name: name,
                value: factory(webContext),
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
VSS.tfsModuleLoaded("TFS.Tasks.Common.Variables", exports);
