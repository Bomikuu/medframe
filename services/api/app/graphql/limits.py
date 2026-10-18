from graphql import parse
from graphql.language.ast import (
    FieldNode,
    FragmentDefinitionNode,
    FragmentSpreadNode,
    OperationDefinitionNode,
)

from app.core.config import get_settings
from app.core.errors import DomainError


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
        if len(operations) != 1 or operations[0].operation.value != "query":
            raise ValueError("operation")
        walk(operations[0].selection_set)
    except Exception:
        raise DomainError(
            "INVALID_QUERY", "This query is invalid or exceeds the allowed limits."
        ) from None
