from runtime.symbolic_llm import build_default_symbolic_llm


def test_routes_to_reasoning_primitive():
    model = build_default_symbolic_llm()

    output = model.generate("explain tensor routing", symbols=["analysis"]) 

    assert output["primitive"] == "reason"
    assert output["runtime"] == "atomic-reasoning"
    assert output["response"].startswith("[reasoned] Reason carefully:")


def test_routes_to_tool_primitive_with_context():
    model = build_default_symbolic_llm()

    output = model.generate("fetch embeddings", symbols=["tool"], context={"tool": "vector-db"})

    assert output["primitive"] == "act"
    assert output["runtime"] == "atomic-tooling"
    assert output["response"].startswith("[tool:vector-db] Take action:")


def test_falls_back_to_default_primitive():
    model = build_default_symbolic_llm()

    output = model.generate("hello", symbols=["unknown"]) 

    assert output["primitive"] == "default"
    assert output["runtime"] == "atomic-default"
    assert output["response"].startswith("[default] Respond:")
