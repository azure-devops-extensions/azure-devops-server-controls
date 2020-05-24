/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   sps\clients\identity\clientgeneratorconfigs\genclient.json
 */

export interface JsonPatchOperationData<T> {
    op: string;
    path: string;
    value: T;
}

export interface MruIdentitiesUpdateData extends JsonPatchOperationData<string[]> {
}
