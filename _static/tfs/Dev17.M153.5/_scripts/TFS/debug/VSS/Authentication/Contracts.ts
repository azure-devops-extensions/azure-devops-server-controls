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

export enum DelegatedAppTokenType {
    Session = 0,
    App = 1
}

export interface WebSessionToken {
    appId: string;
    extensionName: string;
    force: boolean;
    name: string;
    namedTokenId: string;
    publisherName: string;
    token: string;
    tokenType: DelegatedAppTokenType;
    validTo: Date;
}

export var TypeInfo = {
    DelegatedAppTokenType: {
        enumValues: {
            "session": 0,
            "app": 1
        }
    },
    WebSessionToken: <any>{
    },
};

TypeInfo.WebSessionToken.fields = {
    tokenType: {
        enumType: TypeInfo.DelegatedAppTokenType
    },
    validTo: {
        isDate: true,
    }
};
