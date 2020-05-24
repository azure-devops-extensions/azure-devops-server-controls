/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

export interface ClientTraceEvent {
    area: string;
    component: string;
    exceptionType: string;
    feature: string;
    level: Level;
    message: string;
    method: string;
    properties: { [key: string] : any; };
}

export enum Level {
    Off = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Verbose = 4
}

export var TypeInfo = {
    ClientTraceEvent: <any>{
    },
    Level: {
        enumValues: {
            "off": 0,
            "error": 1,
            "warning": 2,
            "info": 3,
            "verbose": 4
        }
    },
};

TypeInfo.ClientTraceEvent.fields = {
    level: {
        enumType: TypeInfo.Level
    }
};
