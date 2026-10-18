from graphql import parse
from graphql.language.ast import (
    FieldNode,
    FragmentDefinitionNode,
    FragmentSpreadNode,
    InlineFragmentNode,
    OperationDefinitionNode,
)

from config.errors import DomainError
from config.runtime import get_settings


def validate_query(query: str) -> None:
    try:
        document = parse(query, max_tokens=2000)
        fragments = {
            definition.name.value: definition
            for definition in document.definitions
            if isinstance(definition, FragmentDefinitionNode)
        }
        cost = 0

        def walk(selection_set, depth=0, visited=frozenset()):
            nonlocal cost
            if depth > 8:
                raise ValueError("depth")
            for node in selection_set.selections:
                cost += 1
                if cost > 100:
                    raise ValueError("cost")
                if isinstance(node, FragmentSpreadNode):
                    name = node.name.value
                    if name in visited or name not in fragments:
                        raise ValueError("fragment")
                    walk(fragments[name].selection_set, depth, visited | {name})
                else:
                    if (
                        isinstance(node, FieldNode)
                        and node.name.value.startswith("__")
                        and get_settings().app_env == "production"
                    ):
                        raise ValueError("introspection")
                    if node.selection_set:
                        walk(node.selection_set, depth + 1, visited)

        operations = [d for d in document.definitions if isinstance(d, OperationDefinitionNode)]
        if len(operations) != 1 or operations[0].operation.value not in {"query", "mutation"}:
            raise ValueError("operation")

        def root_fields(selection_set, visited=frozenset()):
            total = 0
            for node in selection_set.selections:
                if isinstance(node, FieldNode):
                    total += 1
                elif isinstance(node, FragmentSpreadNode):
                    name = node.name.value
                    if name in visited or name not in fragments:
                        raise ValueError("fragment")
                    total += root_fields(fragments[name].selection_set, visited | {name})
                elif isinstance(node, InlineFragmentNode):
                    total += root_fields(node.selection_set, visited)
            return total

        walk(operations[0].selection_set)
        if (
            operations[0].operation.value == "mutation"
            and root_fields(operations[0].selection_set) != 1
        ):
            raise ValueError("mutation roots")
    except Exception:
        raise DomainError(
            "INVALID_QUERY", "This query is invalid or exceeds the allowed limits."
        ) from None
