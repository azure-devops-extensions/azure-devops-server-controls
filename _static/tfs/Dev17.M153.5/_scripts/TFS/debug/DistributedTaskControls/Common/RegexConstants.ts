/*
 *  This file contains regex expressions being used in CI/CD workflow
 */

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";


export const TaskNameRegex: RegExp = /(\r\n|\n|\r|\t)/gm;
export const DefinitionNameRegex: RegExp = /[\u0000-\u001F\"\/\:\<\>\\\|\$\@]/;
export const VariableParameterRegex: RegExp = new RegExp("\\$\\(.*?\\)");
export const RegexSpecialCharactersRegex: RegExp = /[-\/\\^$*+?.()|[\]{}]/g;
export const ReleaseDefinitionNameRegex: RegExp = /[\u0000-\u001F\"\/\:\<\>\\\|\$\@\%\*]/;
export const DemandEqualsRegEx = new RegExp(" -equals ", "i");
export const DemandGtVersionRegEx = new RegExp(" -gtVersion ", "i");
export const FindSubscriptionIdRegEx: RegExp = /\(([A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12})\)$/;
export const LiveLogsLineRegEx: RegExp = /^\#*\[([^|\s\]]+).*?\](.*)/;
export const GuidPatternRegEx: string = "^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$";
export const PredicateRuleRegEx: RegExp = /([a-zA-Z0-9 ]+)([!=<>]+)([a-zA-Z0-9. ]+)/g;
export const SelfClosingHTMLTagRegEx: RegExp = /<\s*([^\s>]+)([^>]*)\/\s*>/g;

export function DefaultDefinitionNameFormatRegex(definitionNameWithRegexEscaping): RegExp {
    return new RegExp("^" + definitionNameWithRegexEscaping + " \\(([1-9][0-9]*)\\)\\s*$", "i");
}

export namespace ServiceEndPointsRegexConstants {
    export const GuidPatternWithoutBraces: string = GuidPatternRegEx;
    export const GuidPatternWithBraces: string = "^\{[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\}$";
    export const UriValidator: string = "^.+://.+$";
}
