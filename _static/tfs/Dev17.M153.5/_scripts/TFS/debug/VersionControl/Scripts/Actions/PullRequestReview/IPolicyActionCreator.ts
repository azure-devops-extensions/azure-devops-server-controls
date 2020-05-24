export abstract class IPolicyActionCreator {
    abstract queryPolicyEvaluationsByType(policyTypeId: string): void;
    abstract queryPolicyEvaluation(evaluationId: string): void;
    abstract requeuePolicyEvaluation(evaluationId: string): void;
    abstract dispose();

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IPolicyActionCreator"; }
};
