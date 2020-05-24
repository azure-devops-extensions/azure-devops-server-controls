import * as VSSStore from "VSS/Flux/Store";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { ISearchFilterGroup } from "Search/Scenarios/Shared/Components/SearchHelp/SearchHelp.Props";
export interface HelpStoreState {
    isDropdownActive: boolean;

    filterGroups: ISearchFilterGroup[];
}

export class HelpStore extends VSSStore.Store {
    private _state: HelpStoreState = {
        isDropdownActive: false,
        filterGroups: this.filterGroups
    }

    public get state(): HelpStoreState {
        return this._state;
    }

    public updateHelpDropdownVisibility = (isVisible: boolean): void => {
        this._state.isDropdownActive = isVisible;
        this.emitChanged();
    }

    public get filterGroups(): ISearchFilterGroup[] {
        return [
            {
                caption: Resources.FilterByScope,
                example: Resources.FilterByScopeExample,
                filters: [
                    {
                        text: "ext:",
                        hint: Resources.ExtensionHint
                    },
                    {
                        text: "file:",
                        hint: Resources.FilenameHint
                    },
                    {
                        text: "path:",
                        hint: Resources.PathHint
                    },
                    {
                        text: "proj:",
                        hint: Resources.ProjectHint
                    },
                    {
                        text: "repo:",
                        hint: Resources.RepoHint
                    }
                ]
            },
            {
                caption: Resources.FilterByCodeType,
                example: Resources.FilterByCodeTypeExample,
                filters: [
                    {
                        text: "arg:",
                        hint: Resources.ArgumentHint
                    },
                    {
                        text: "basetype:",
                        hint: Resources.BaseTypeHint
                    },
                    {
                        text: "caller:",
                        hint: Resources.CallerHint
                    },
                    {
                        text: "class:",
                        hint: Resources.ClassHint
                    },
                    {
                        text: "classdecl:",
                        hint: Resources.CDeclHint
                    },
                    {
                        text: "classdef:",
                        hint: Resources.CDefHint
                    },
                    {
                        text: "comment:",
                        hint: Resources.CommentHint
                    },
                    {
                        text: "ctor:",
                        hint: Resources.ConstructorHint
                    },
                    {
                        text: "decl:",
                        hint: Resources.DeclarationHint
                    },
                    {
                        text: "def:",
                        hint: Resources.DefinitionHint
                    },
                    {
                        text: "dtor:",
                        hint: Resources.DestructorHint
                    },
                    {
                        text: "enum:",
                        hint: Resources.EnumHint
                    },
                    {
                        text: "extern:",
                        hint: Resources.ExternHint
                    },
                    {
                        text: "field:",
                        hint: Resources.FieldHint
                    },
                    {
                        text: "friend:",
                        hint: Resources.FriendHint
                    },
                    {
                        text: "func:",
                        hint: Resources.FuncHint
                    },
                    {
                        text: "funcdecl:",
                        hint: Resources.FuncDeclHint
                    },
                    {
                        text: "funcdef:",
                        hint: Resources.FuncDefHint
                    },
                    {
                        text: "global:",
                        hint: Resources.GlobalHint
                    },
                    {
                        text: "header:",
                        hint: Resources.HeaderHint
                    },
                    {
                        text: "interface:",
                        hint: Resources.InterfaceHint
                    },
                    {
                        text: "macro:",
                        hint: Resources.MacroHint
                    },
                    {
                        text: "macrodef:",
                        hint: Resources.MacroDefHint
                    },
                    {
                        text: "macroref:",
                        hint: Resources.MacroRefHint
                    },
                    {
                        text: "method:",
                        hint: Resources.MethodHint
                    },
                    {
                        text: "methoddecl:",
                        hint: Resources.MethodDeclHint
                    },
                    {
                        text: "methoddef:",
                        hint: Resources.MethodDefHint
                    },
                    {
                        text: "namespace:",
                        hint: Resources.NamespaceHint
                    },
                    {
                        text: "prop:",
                        hint: Resources.PropertyHint
                    },
                    {
                        text: "ref:",
                        hint: Resources.ReferenceHint
                    },
                    {
                        text: "strlit:",
                        hint: Resources.StringLitHint
                    },
                    {
                        text: "struct:",
                        hint: Resources.StructHint
                    },
                    {
                        text: "structdecl:",
                        hint: Resources.StructDeclHint
                    },
                    {
                        text: "structdef:",
                        hint: Resources.StructDefHint
                    },
                    {
                        text: "tmplarg:",
                        hint: Resources.TemplateArgHint
                    },
                    {
                        text: "tmplspec:",
                        hint: Resources.TemplateSpecHint
                    },
                    {
                        text: "type:",
                        hint: Resources.TypeHint
                    },
                    {
                        text: "typedef:",
                        hint: Resources.TypeDefHint
                    },
                    {
                        text: "union:",
                        hint: Resources.UnionHint
                    }
                ]
            },
            {
                caption: Resources.Operators,
                example: Resources.CodeSearchOperatorsExample,
                singleLine: true,
                filters: [
                    {
                        text: "AND"
                    },
                    {
                        text: "NOT"
                    },
                    {
                        text: "OR"
                    }
                ]
            }
        ]
    }
}