/** 
 * Traverse a given tree pre-order
 * @param root Root node of tree
 * @param getChildren Given a tree node, returns its children
 * @param visitor Callback to be called for each node in the tree, in order. If visitor returns false, children of the current node will not be traversed.
 */
export function traversePreOrder<TNode>(
    root: TNode,
    getChildren: (node: TNode) => TNode[],
    visitor: (node: TNode, parentNode?: TNode, level?: number, childrenCount?: number) => boolean | void): void {

    let stack = [{
        node: root,
        parent: null,
        level: 0
    }];

    while (stack.length > 0) {
        let { node, parent, level } = stack.pop();
        const children = getChildren(node);

        if (visitor(node, parent, level, children.length) === false) {
            continue;
        }

        if (children) {
            for (let i = children.length - 1; i >= 0; --i) {
                stack.push({
                    node: children[i],
                    parent: node,
                    level: level + 1
                });
            }
        }
    }
}

/** Result of a `filterTree` operation. */
export interface IFilterResult {
    /** Map of nodes included as part of the  */
    [key: string]: {
        /** Node matches the filter predicat */
        isPredicateMatch: boolean;

        /** Node has a matching descendant */
        hasMatchingDescendant: boolean;
    }
}

/**
 * Filters a given tree by a given predicate. The result of this operation will include 
 * - all nodes that match the predicate (`isPredicateMatch` set to true)
 * - all nodes that have a predicate matching descendant (`hasMatchingDescendant` set to true)
 * - all descendants of predicate matching nodes. 
 * 
 * Example (* denotes predicate matching nodes):
 *       R
 *     / | \
 *    A* X  B
 *    |  |  |
 *    C  Y  D*
 * 
 * Result set (isPredicateMatch iPM, hasMatchingDescendant hMD):
 * Node | hMD | iPM
 *  R      x
 *  A            x
 *  C
 *  B      x
 *  D            x
 * 
 * @param root Root node of tree to filter
 * @param predicate Filter predicate
 * @param getKey Given a tree node, returns a unique identifier
 * @param getChildren Given a tree node, returns its children
 * @param preFilter Previous filter result, any node that didn't match previously will not be considered again
 */
export function filterTree<TNode>(
    root: TNode,
    predicate: (node: TNode) => boolean,
    getKey: (node: TNode) => string,
    getChildren: (node: TNode) => TNode[],
    preFilter?: IFilterResult): IFilterResult {

    let result: IFilterResult = {};
    let childToParentMap: IDictionaryStringTo<TNode> = {};

    let stack = [root];
    while (stack.length > 0) {
        let node = stack.pop();
        const nodeKey = getKey(node);

        if (preFilter && !preFilter[nodeKey]) {
            // Node didn't match in previous filter process, ignore
            continue;
        }

        if (predicate(node)) {
            const isNodeAlreadyInResult = !!result[nodeKey];

            // Node matches filter predicate
            result[nodeKey] = {
                isPredicateMatch: true,
                hasMatchingDescendant: false
            };

            // Add descendants. If node was already in result set, it means an ancestor already included it (and all of its descendants)
            // so we can skip the traversal in that case.
            if (!isNodeAlreadyInResult) {
                traversePreOrder(node, getChildren, (childNode) => {
                    if (!result[getKey(childNode)]) {
                        result[getKey(childNode)] = {
                            isPredicateMatch: false,
                            hasMatchingDescendant: false
                        };
                    }
                });
            }

            // Add all ancestors
            let parent = childToParentMap[nodeKey];
            while (!!parent) {
                const parentKey = getKey(parent);

                let parentResult = result[parentKey];
                if (parentResult) {
                    if (parentResult.hasMatchingDescendant) {
                        // Parent is already in result set and marked as having at least one matching descendant, abort traversal
                        break;
                    }

                    parentResult.hasMatchingDescendant = true;
                } else {
                    // Parent wasn't part of the result set yet, didn't match the predicate. Include now
                    // as a descendantMatch.  
                    result[parentKey] = {
                        isPredicateMatch: false,
                        hasMatchingDescendant: true
                    };
                }

                parent = childToParentMap[parentKey];
            }

            // Even though all descendants have been added, traverse children in order to support multiple
            // matches in the same subtree. Example scenario why this is required:
            // Given tree: a -> b -> b -> x
            // Filter predicate matches "b", we want to mark *both* b nodes as matched, don't just stop at
            // the first b.
        }

        // Continue with children of node
        const children = getChildren(node) || [];
        for (let child of children) {
            childToParentMap[getKey(child)] = node;
            stack.push(child);
        }
    }

    return result;
}